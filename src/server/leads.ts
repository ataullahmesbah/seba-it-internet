import "server-only";
import type { z } from "zod";
import { db } from "@/lib/db";
import { referenceCode, sha256 } from "@/lib/security/crypto";
import { adminUrl, renderEmail, sendEmail } from "@/lib/email";
import { displayBdPhone } from "@/lib/validation/phone";
import { notify } from "@/server/notifications";
import { getGeneralSettings } from "@/server/settings";
import { env } from "@/lib/env";
import type { connectionSchema, contactSchema, corporateSchema, coverageInterestSchema } from "@/features/public-schemas";

export class LeadError extends Error {
  constructor(public code: "VALIDATION_ERROR" | "FORBIDDEN", public fields?: Record<string, string>) {
    super(code);
  }
}

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/** Returns an existing record id if an identical submission was made recently (double-submit protection). */
async function dedupe(entity: string, payload: unknown): Promise<string | null> {
  const hash = sha256(entity + ":" + JSON.stringify(payload));
  const existing = await db.submissionFingerprint.findUnique({ where: { hash } });
  if (existing && Date.now() - existing.createdAt.getTime() < DEDUPE_WINDOW_MS) return existing.entityId;
  return null;
}
async function remember(entity: string, payload: unknown, entityId: string) {
  const hash = sha256(entity + ":" + JSON.stringify(payload));
  await db.submissionFingerprint.upsert({ where: { hash }, create: { hash, entity, entityId }, update: { entityId, createdAt: new Date() } });
  // Opportunistic cleanup of old fingerprints.
  if (Math.random() < 0.05) await db.submissionFingerprint.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - DEDUPE_WINDOW_MS * 6) } } });
}

async function recipients(kind: "support" | "sales"): Promise<string | null> {
  const s = await getGeneralSettings();
  const brand = await db.brandSetting.findUnique({ where: { id: "singleton" }, select: { supportEmail: true, salesEmail: true } });
  if (kind === "sales") return s.recipientEmails.sales || brand?.salesEmail || s.recipientEmails.support || env.email.supportTo || brand?.supportEmail || null;
  return s.recipientEmails.support || env.email.supportTo || brand?.supportEmail || null;
}

async function ackVisitor(email: string | null, code: string, related: { type: string; id: string }, locale: "en" | "bn") {
  if (!email) return;
  const s = await getGeneralSettings();
  if (!s.visitorAckEmail) return;
  const bnText = locale === "bn";
  const html = await renderEmail(bnText ? "আমরা আপনার অনুরোধ পেয়েছি" : "We received your request", [[bnText ? "রেফারেন্স" : "Reference", code]], {
    intro: bnText ? "আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।" : "Thank you for contacting us. Our team will get back to you shortly.",
  });
  await sendEmail({ template: "visitor_ack", to: email, subject: bnText ? "আপনার অনুরোধ গ্রহণ করা হয়েছে" : "We received your request", html, related });
}

// ───────────── Get Connection ─────────────

export async function createConnectionRequest(input: z.output<typeof connectionSchema>) {
  const [district, thana, area] = await Promise.all([
    db.district.findUnique({ where: { id: input.districtId } }),
    db.thana.findUnique({ where: { id: input.thanaId } }),
    db.coverageArea.findUnique({ where: { id: input.areaId } }),
  ]);
  // Location relationship tampering is rejected server-side.
  if (!district || !thana || !area || thana.districtId !== district.id || area.thanaId !== thana.id) {
    throw new LeadError("VALIDATION_ERROR", { areaId: "location" });
  }
  let pkg = null;
  if (input.packageId) {
    pkg = await db.package.findUnique({ where: { id: input.packageId } });
    if (!pkg || !pkg.active || pkg.archivedAt) throw new LeadError("VALIDATION_ERROR", { packageId: "package" });
  }
  const areaCovered = district.active && thana.active && area.active;
  const dedupeKey = { p: input.phone, a: input.areaId, s: input.serviceType, k: input.packageId, m: input.message };
  const dup = await dedupe("connection", dedupeKey);
  if (dup) {
    const existing = await db.connectionRequest.findUnique({ where: { id: dup }, select: { referenceCode: true } });
    if (existing) return { referenceCode: existing.referenceCode, areaCovered, duplicate: true };
  }

  const rec = await db.connectionRequest.create({
    data: {
      referenceCode: referenceCode("CON"),
      name: input.name,
      email: input.email,
      phone: input.phone,
      districtId: district.id,
      thanaId: thana.id,
      areaId: area.id,
      districtName: district.nameEn,
      thanaName: thana.nameEn,
      areaName: area.nameEn,
      areaCovered,
      fullAddress: input.fullAddress,
      serviceType: input.serviceType,
      packageId: pkg?.id ?? null,
      packageSnapshot: pkg ? `${pkg.nameEn} — ${pkg.speedMbps} Mbps — ৳${pkg.price.toString()}` : null,
      message: input.message,
      locale: input.locale === "bn" ? "BN" : "EN",
      utm: input.utm ?? undefined,
    },
  });
  await remember("connection", dedupeKey, rec.id);

  // Side effects after durable save — failures never lose the lead.
  const where = `${area.nameEn}, ${thana.nameEn}, ${district.nameEn}`;
  await notify("connections.manage", {
    type: "CONNECTION_NEW",
    title: `New ${input.serviceType === "HOME" ? "home" : "corporate"} connection request`,
    message: `${rec.referenceCode} · ${where}${areaCovered ? "" : " (not covered)"}`,
    entityType: "ConnectionRequest",
    entityId: rec.id,
  });
  const to = await recipients("sales");
  if (to) {
    const html = await renderEmail(
      "New Connection Request",
      [
        ["Reference", rec.referenceCode],
        ["Name", rec.name],
        ["Phone", displayBdPhone(rec.phone)],
        ["Email", rec.email],
        ["Area", where + (areaCovered ? "" : " — NOT COVERED")],
        ["Service", rec.serviceType],
        ["Package", rec.packageSnapshot],
      ],
      { cta: { label: "Open in dashboard", url: adminUrl(`/admin/connections/${rec.id}`) } },
    );
    await sendEmail({ template: "connection_admin", to, subject: `New Connection Request ${rec.referenceCode}`, html, related: { type: "ConnectionRequest", id: rec.id } });
  }
  await ackVisitor(rec.email, rec.referenceCode, { type: "ConnectionRequest", id: rec.id }, input.locale);
  return { referenceCode: rec.referenceCode, areaCovered, duplicate: false };
}

// ───────────── Corporate inquiry ─────────────

export async function createCorporateInquiry(input: z.output<typeof corporateSchema>) {
  if (input.thanaId) {
    const thana = await db.thana.findUnique({ where: { id: input.thanaId } });
    if (!thana || (input.districtId && thana.districtId !== input.districtId)) throw new LeadError("VALIDATION_ERROR", { thanaId: "location" });
  }
  if (input.districtId && !(await db.district.findUnique({ where: { id: input.districtId } }))) {
    throw new LeadError("VALIDATION_ERROR", { districtId: "location" });
  }
  const dedupeKey = { c: input.companyName, p: input.phone, m: input.message };
  const dup = await dedupe("corporate", dedupeKey);
  if (dup) {
    const existing = await db.corporateInquiry.findUnique({ where: { id: dup }, select: { referenceCode: true } });
    if (existing) return { referenceCode: existing.referenceCode };
  }
  const rec = await db.corporateInquiry.create({
    data: {
      referenceCode: referenceCode("CORP"),
      companyName: input.companyName,
      contactPerson: input.contactPerson,
      email: input.email,
      phone: input.phone,
      districtId: input.districtId,
      thanaId: input.thanaId,
      officeAddress: input.officeAddress,
      requiredBandwidth: input.requiredBandwidth,
      numberOfUsers: input.numberOfUsers,
      message: input.message,
      locale: input.locale === "bn" ? "BN" : "EN",
    },
  });
  await remember("corporate", dedupeKey, rec.id);
  await notify("corporate_inquiries.manage", {
    type: "CORPORATE_INQUIRY_NEW",
    title: "New corporate inquiry",
    message: `${rec.referenceCode} · ${rec.companyName}`,
    entityType: "CorporateInquiry",
    entityId: rec.id,
  });
  const to = await recipients("sales");
  if (to) {
    const html = await renderEmail(
      "New Corporate Inquiry",
      [
        ["Reference", rec.referenceCode],
        ["Company", rec.companyName],
        ["Contact person", rec.contactPerson],
        ["Phone", displayBdPhone(rec.phone)],
        ["Email", rec.email],
        ["Bandwidth", rec.requiredBandwidth],
        ["Users", rec.numberOfUsers],
      ],
      { cta: { label: "Open in dashboard", url: adminUrl(`/admin/corporate-inquiries/${rec.id}`) } },
    );
    await sendEmail({ template: "corporate_admin", to, subject: `New Corporate Inquiry ${rec.referenceCode}`, html, related: { type: "CorporateInquiry", id: rec.id } });
  }
  await ackVisitor(rec.email, rec.referenceCode, { type: "CorporateInquiry", id: rec.id }, input.locale);
  return { referenceCode: rec.referenceCode };
}

// ───────────── Contact ─────────────

export async function createContactMessage(input: z.output<typeof contactSchema>) {
  const dedupeKey = { p: input.phone, s: input.subject, m: input.message };
  const dup = await dedupe("contact", dedupeKey);
  if (dup) {
    const existing = await db.contactMessage.findUnique({ where: { id: dup }, select: { referenceCode: true } });
    if (existing) return { referenceCode: existing.referenceCode };
  }
  const rec = await db.contactMessage.create({
    data: {
      referenceCode: referenceCode("MSG"),
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      locale: input.locale === "bn" ? "BN" : "EN",
    },
  });
  await remember("contact", dedupeKey, rec.id);
  await notify("contacts.manage", {
    type: "CONTACT_NEW",
    title: "New contact message",
    message: `${rec.referenceCode} · ${rec.subject.slice(0, 80)}`,
    entityType: "ContactMessage",
    entityId: rec.id,
  });
  const to = await recipients("support");
  if (to) {
    const html = await renderEmail(
      "New Contact Message",
      [
        ["Reference", rec.referenceCode],
        ["Name", rec.name],
        ["Phone", rec.phone ? displayBdPhone(rec.phone) : null],
        ["Email", rec.email],
        ["Subject", rec.subject],
        ["Message", rec.message.slice(0, 1000)],
      ],
      { cta: { label: "Open in dashboard", url: adminUrl(`/admin/contact-messages/${rec.id}`) } },
    );
    await sendEmail({ template: "contact_admin", to, subject: `New Contact Message ${rec.referenceCode}`, html, related: { type: "ContactMessage", id: rec.id } });
  }
  await ackVisitor(rec.email, rec.referenceCode, { type: "ContactMessage", id: rec.id }, input.locale);
  return { referenceCode: rec.referenceCode };
}

// ───────────── Coverage interest (Notify me) ─────────────

export async function createCoverageInterest(input: z.output<typeof coverageInterestSchema>) {
  const [district, thana, area] = await Promise.all([
    input.districtId ? db.district.findUnique({ where: { id: input.districtId } }) : null,
    input.thanaId ? db.thana.findUnique({ where: { id: input.thanaId } }) : null,
    input.areaId ? db.coverageArea.findUnique({ where: { id: input.areaId } }) : null,
  ]);
  if ((input.districtId && !district) || (input.thanaId && !thana) || (input.areaId && !area)) {
    throw new LeadError("VALIDATION_ERROR", { areaId: "location" });
  }
  if ((thana && district && thana.districtId !== district.id) || (area && thana && area.thanaId !== thana.id)) {
    throw new LeadError("VALIDATION_ERROR", { areaId: "location" });
  }
  const snapshot = [area?.nameEn ?? input.freeTextArea, thana?.nameEn, district?.nameEn].filter(Boolean).join(", ");
  const dedupeKey = { p: input.phone, a: input.areaId, f: input.freeTextArea };
  const dup = await dedupe("coverage-interest", dedupeKey);
  if (dup) {
    const existing = await db.coverageInterest.findUnique({ where: { id: dup }, select: { referenceCode: true } });
    if (existing) return { referenceCode: existing.referenceCode };
  }
  const rec = await db.coverageInterest.create({
    data: {
      referenceCode: referenceCode("CI"),
      name: input.name,
      phone: input.phone,
      email: input.email,
      districtId: district?.id ?? null,
      thanaId: thana?.id ?? null,
      areaId: area?.id ?? null,
      locationSnapshot: snapshot || null,
      freeTextArea: input.freeTextArea,
      locale: input.locale === "bn" ? "BN" : "EN",
    },
  });
  await remember("coverage-interest", dedupeKey, rec.id);
  await notify("connections.manage", {
    type: "COVERAGE_INTEREST_NEW",
    title: "New coverage interest",
    message: `${rec.referenceCode} · ${snapshot || "Unlisted area"}`,
    entityType: "CoverageInterest",
    entityId: rec.id,
  });
  return { referenceCode: rec.referenceCode };
}
