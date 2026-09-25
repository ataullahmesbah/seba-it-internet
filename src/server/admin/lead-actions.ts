"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/server/audit";
import { LEADS, isLeadType, type LeadType } from "@/server/admin/leads";

export interface LeadState {
  error?: string;
  message?: string;
}

async function updateRecord(type: LeadType, id: string, data: { status?: string; internalNote?: string | null }) {
  switch (type) {
    case "connections":
      return db.connectionRequest.update({ where: { id }, data: data as never });
    case "corporate-inquiries":
      return db.corporateInquiry.update({ where: { id }, data: data as never });
    case "contact-messages":
      return db.contactMessage.update({ where: { id }, data: data as never });
    case "coverage-interest":
      return db.coverageInterest.update({ where: { id }, data: data as never });
  }
}

async function currentStatus(type: LeadType, id: string): Promise<{ status: string; internalNote: string | null } | null> {
  const sel = { select: { status: true, internalNote: true }, where: { id } };
  switch (type) {
    case "connections":
      return db.connectionRequest.findUnique(sel);
    case "corporate-inquiries":
      return db.corporateInquiry.findUnique(sel);
    case "contact-messages":
      return db.contactMessage.findUnique(sel);
    case "coverage-interest":
      return db.coverageInterest.findUnique(sel);
  }
}

export async function updateLeadAction(type: string, id: string, _p: LeadState, fd: FormData): Promise<LeadState> {
  if (!isLeadType(type)) return { error: "Unknown lead type." };
  const def = LEADS[type];
  let admin;
  try {
    admin = await requireAdmin(def.perm);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code === "FORBIDDEN" ? "Permission denied." : "Session expired." };
    throw e;
  }
  if (!(await rateLimit("adminMutation", admin.userId)).ok) return { error: "Too many changes. Please wait." };
  const status = String(fd.get("status") ?? "");
  const note = String(fd.get("internalNote") ?? "").trim().slice(0, 5000);
  const historyNote = String(fd.get("historyNote") ?? "").trim().slice(0, 1000);
  if (!def.statuses.includes(status)) return { error: "Invalid status." };
  const before = await currentStatus(type, id);
  if (!before) return { error: "Record not found." };
  await updateRecord(type, id, { status, internalNote: note || null });
  if (before.status !== status || historyNote) {
    await db.leadStatusHistory.create({ data: { entityType: def.entity, entityId: id, fromStatus: before.status, toStatus: status, note: historyNote || null, actorId: admin.userId } });
  }
  await audit(admin.userId, `${def.entity.toLowerCase()}.update`, def.entity, id, {
    changedFields: [...(before.status !== status ? ["status"] : []), ...((before.internalNote ?? "") !== note ? ["internalNote"] : [])],
  });
  revalidatePath(`/admin/${type}/${id}`);
  revalidatePath("/admin", "layout");
  return { message: "Saved." };
}

/** Privacy request support: irreversibly removes personal data while keeping aggregate records. */
export async function anonymizeLeadAction(fd: FormData): Promise<LeadState> {
  const type = String(fd.get("type") ?? "");
  const id = String(fd.get("id") ?? "");
  if (!isLeadType(type)) return { error: "Unknown lead type." };
  const def = LEADS[type];
  let admin;
  try {
    admin = await requireAdmin(def.perm);
  } catch {
    return { error: "Permission denied." };
  }
  const R = "[removed]";
  switch (type) {
    case "connections":
      await db.connectionRequest.update({ where: { id }, data: { name: R, email: null, phone: R, fullAddress: R, message: null, internalNote: null, referrer: null, utm: undefined } });
      break;
    case "corporate-inquiries":
      await db.corporateInquiry.update({ where: { id }, data: { contactPerson: R, email: R, phone: R, officeAddress: R, message: null, internalNote: null } });
      break;
    case "contact-messages":
      await db.contactMessage.update({ where: { id }, data: { name: R, email: null, phone: null, message: R, internalNote: null } });
      break;
    case "coverage-interest":
      await db.coverageInterest.update({ where: { id }, data: { name: null, email: null, phone: R, internalNote: null } });
      break;
  }
  await db.leadStatusHistory.updateMany({ where: { entityType: def.entity, entityId: id }, data: { note: null } });
  await audit(admin.userId, `${def.entity.toLowerCase()}.anonymize`, def.entity, id);
  revalidatePath(`/admin/${type}/${id}`);
  return { message: "Personal data removed." };
}
