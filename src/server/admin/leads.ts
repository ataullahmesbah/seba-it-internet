import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { PermissionKey } from "@/lib/auth/permissions";
import { displayBdPhone } from "@/lib/validation/phone";

export type LeadType = "connections" | "corporate-inquiries" | "contact-messages" | "coverage-interest";

export interface LeadDef {
  type: LeadType;
  title: string;
  entity: "ConnectionRequest" | "CorporateInquiry" | "ContactMessage" | "CoverageInterest";
  perm: PermissionKey;
  statuses: string[];
  initialStatus: string;
}

export const LEADS: Record<LeadType, LeadDef> = {
  connections: { type: "connections", title: "Connection Requests", entity: "ConnectionRequest", perm: "connections.manage", statuses: ["NEW", "CONTACTED", "IN_PROGRESS", "CONVERTED", "CLOSED", "SPAM"], initialStatus: "NEW" },
  "corporate-inquiries": { type: "corporate-inquiries", title: "Corporate Inquiries", entity: "CorporateInquiry", perm: "corporate_inquiries.manage", statuses: ["NEW", "CONTACTED", "IN_PROGRESS", "WON", "LOST", "CLOSED", "SPAM"], initialStatus: "NEW" },
  "contact-messages": { type: "contact-messages", title: "Contact Messages", entity: "ContactMessage", perm: "contacts.manage", statuses: ["UNREAD", "READ", "REPLIED", "CLOSED", "SPAM"], initialStatus: "UNREAD" },
  "coverage-interest": { type: "coverage-interest", title: "Coverage Interest", entity: "CoverageInterest", perm: "connections.manage", statuses: ["NEW", "CONTACTED", "IN_PROGRESS", "CONVERTED", "CLOSED", "SPAM"], initialStatus: "NEW" },
};

export function isLeadType(t: string): t is LeadType {
  return t in LEADS;
}

export interface LeadFilters {
  q?: string;
  status?: string;
  service?: string;
  districtId?: string;
  packageId?: string;
  from?: string;
  to?: string;
}

function dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  const f = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00+06:00`) : undefined;
  const t = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59+06:00`) : undefined;
  return f || t ? { ...(f ? { gte: f } : {}), ...(t ? { lte: t } : {}) } : undefined;
}

export interface LeadRow {
  id: string;
  ref: string;
  name: string;
  contact: string;
  summary: string;
  status: string;
  createdAt: Date;
  extra?: string;
}

/** Unified, paginated lead listing per type. */
export async function listLeads(type: LeadType, f: LeadFilters, page: number, pageSize: number): Promise<{ rows: LeadRow[]; total: number }> {
  const q = f.q?.trim().slice(0, 100);
  const createdAt = dateRange(f.from, f.to);
  const skip = (page - 1) * pageSize;
  const ci = { contains: q, mode: "insensitive" as const };
  if (type === "connections") {
    const where: Prisma.ConnectionRequestWhereInput = {
      ...(f.status ? { status: f.status as never } : {}),
      ...(f.service === "HOME" || f.service === "CORPORATE" ? { serviceType: f.service } : {}),
      ...(f.districtId ? { districtId: f.districtId } : {}),
      ...(f.packageId ? { packageId: f.packageId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(q ? { OR: [{ name: ci }, { phone: ci }, { referenceCode: ci }, { areaName: ci }, { email: ci }] } : {}),
    };
    const [total, rows] = await Promise.all([db.connectionRequest.count({ where }), db.connectionRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize })]);
    return {
      total,
      rows: rows.map((r) => ({
        id: r.id,
        ref: r.referenceCode,
        name: r.name,
        contact: displayBdPhone(r.phone),
        summary: `${r.areaName}, ${r.thanaName}, ${r.districtName}${r.areaCovered ? "" : " (not covered)"}`,
        status: r.status,
        createdAt: r.createdAt,
        extra: `${r.serviceType}${r.packageSnapshot ? " · " + r.packageSnapshot.split(" — ")[0] : ""}`,
      })),
    };
  }
  if (type === "corporate-inquiries") {
    const where: Prisma.CorporateInquiryWhereInput = {
      ...(f.status ? { status: f.status as never } : {}),
      ...(f.districtId ? { districtId: f.districtId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(q ? { OR: [{ companyName: ci }, { contactPerson: ci }, { phone: ci }, { referenceCode: ci }, { email: ci }] } : {}),
    };
    const [total, rows] = await Promise.all([db.corporateInquiry.count({ where }), db.corporateInquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize })]);
    return {
      total,
      rows: rows.map((r) => ({ id: r.id, ref: r.referenceCode, name: r.companyName, contact: displayBdPhone(r.phone), summary: r.contactPerson, status: r.status, createdAt: r.createdAt, extra: [r.requiredBandwidth, r.numberOfUsers ? `${r.numberOfUsers} users` : null].filter(Boolean).join(" · ") })),
    };
  }
  if (type === "contact-messages") {
    const where: Prisma.ContactMessageWhereInput = {
      ...(f.status ? { status: f.status as never } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(q ? { OR: [{ name: ci }, { phone: ci }, { referenceCode: ci }, { subject: ci }, { email: ci }] } : {}),
    };
    const [total, rows] = await Promise.all([db.contactMessage.count({ where }), db.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize })]);
    return { total, rows: rows.map((r) => ({ id: r.id, ref: r.referenceCode, name: r.name, contact: r.phone ? displayBdPhone(r.phone) : r.email ?? "", summary: r.subject, status: r.status, createdAt: r.createdAt })) };
  }
  const where: Prisma.CoverageInterestWhereInput = {
    ...(f.status ? { status: f.status as never } : {}),
    ...(f.districtId ? { districtId: f.districtId } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q ? { OR: [{ name: ci }, { phone: ci }, { referenceCode: ci }, { locationSnapshot: ci }, { freeTextArea: ci }] } : {}),
  };
  const [total, rows] = await Promise.all([db.coverageInterest.count({ where }), db.coverageInterest.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize })]);
  return { total, rows: rows.map((r) => ({ id: r.id, ref: r.referenceCode, name: r.name ?? "—", contact: displayBdPhone(r.phone), summary: r.locationSnapshot ?? r.freeTextArea ?? "—", status: r.status, createdAt: r.createdAt })) };
}

/** Raw record for detail view + status history. */
export async function getLead(type: LeadType, id: string) {
  const record =
    type === "connections"
      ? await db.connectionRequest.findUnique({ where: { id }, include: { package: { select: { nameEn: true, archivedAt: true } } } })
      : type === "corporate-inquiries"
        ? await db.corporateInquiry.findUnique({ where: { id }, include: { district: { select: { nameEn: true } }, thana: { select: { nameEn: true } } } })
        : type === "contact-messages"
          ? await db.contactMessage.findUnique({ where: { id } })
          : await db.coverageInterest.findUnique({ where: { id } });
  if (!record) return null;
  const history = await db.leadStatusHistory.findMany({ where: { entityType: LEADS[type].entity, entityId: id }, orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { displayName: true } } } });
  return { record: record as Record<string, unknown> & { status: string; internalNote: string | null; referenceCode: string; createdAt: Date }, history };
}
