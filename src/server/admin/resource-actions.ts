"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { parseFields } from "@/lib/validation/form-schema";
import { logger } from "@/lib/logger";
import { getResource } from "@/features/admin/resources";
import { audit, changedFields } from "@/server/audit";
import { invalidate } from "@/server/revalidate";
import { FieldError, SERVER_RESOURCES, delegate } from "@/server/admin/resources";

export interface FormState {
  errors?: Record<string, string>;
  error?: string;
  message?: string;
  reauth?: boolean;
}

function authMessage(e: AuthError): FormState {
  if (e.code === "FORBIDDEN") return { error: "You do not have permission to perform this action." };
  return { error: "Your session has expired. Please sign in again." };
}

/** Create or update a resource record through the mandatory mutation pipeline (PRD 11.5). */
export async function saveResourceAction(key: string, id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const cfg = getResource(key);
  const srv = SERVER_RESOURCES[key];
  if (!cfg || !srv) return { error: "Unknown module." };

  let admin;
  try {
    admin = await requireAdmin(srv.write);
  } catch (e) {
    if (e instanceof AuthError) return authMessage(e);
    throw e;
  }
  if (cfg.sensitive && !hasRecentAuth(admin)) return { reauth: true, error: "Please confirm your password to change this sensitive setting." };
  const rl = await rateLimit("adminMutation", admin.userId);
  if (!rl.ok) return { error: "Too many changes in a short time. Please wait a moment." };

  const { data, errors } = parseFields(cfg.fields, fd);
  if (Object.keys(errors).length) return { errors, error: "Please fix the highlighted fields." };

  const model = delegate(srv.model);
  const before = id ? await model.findUnique({ where: { id } }) : null;
  if (id && !before) return { error: "This record no longer exists." };

  let savedId = id;
  try {
    const prepared = srv.beforeSave ? await srv.beforeSave({ ...data }, { id, admin, before }) : { ...data };
    const dbData: Record<string, unknown> = { ...prepared };
    for (const v of srv.virtual ?? []) delete dbData[v];
    await db.$transaction(async (tx) => {
      const m = delegate(srv.model, tx);
      const row = id ? await m.update({ where: { id }, data: dbData }) : await m.create({ data: dbData });
      savedId = row.id as string;
      if (srv.afterSave) await srv.afterSave(tx, savedId, prepared, { id, admin, before });
    });
    await audit(admin.userId, `${srv.entity.toLowerCase()}.${id ? "update" : "create"}`, srv.entity, savedId, {
      changedFields: changedFields(before, dbData).filter((f) => !/password|secret|token/i.test(f)),
    });
  } catch (e) {
    if (e instanceof FieldError) return { errors: e.fields, error: e.fields._form ?? "Please fix the highlighted fields." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "A record with the same unique value already exists." };
    logger.error("resource save failed", { key, error: String(e) });
    return { error: "Could not save. Please try again." };
  }

  invalidate(...srv.tags);
  revalidatePath(`/admin/${key}`);
  redirect(`/admin/${key}?saved=1`);
}

export async function deleteResourceAction(fd: FormData): Promise<FormState> {
  const key = String(fd.get("resource") ?? "");
  const id = String(fd.get("id") ?? "");
  const cfg = getResource(key);
  const srv = SERVER_RESOURCES[key];
  if (!cfg || !srv || !id) return { error: "Unknown record." };
  let admin;
  try {
    admin = await requireAdmin(srv.write);
  } catch (e) {
    if (e instanceof AuthError) return authMessage(e);
    throw e;
  }
  if (cfg.sensitive && !hasRecentAuth(admin)) return { error: "Please confirm your password (on this page) before deleting." };
  const rl = await rateLimit("adminMutation", admin.userId);
  if (!rl.ok) return { error: "Too many changes in a short time." };

  const row = await delegate(srv.model).findUnique({ where: { id } });
  if (!row) return { error: "This record no longer exists." };
  let archived = false;
  try {
    if (srv.remove) archived = Boolean((await srv.remove(id, admin)).archived);
    else await delegate(srv.model).delete({ where: { id } });
  } catch (e) {
    if (e instanceof FieldError) return { error: e.fields._form ?? Object.values(e.fields)[0] };
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2003" || e.code === "P2014")) {
      return { error: "This record is referenced by other data and cannot be deleted. Deactivate it instead." };
    }
    logger.error("resource delete failed", { key, error: String(e) });
    return { error: "Could not delete. Please try again." };
  }
  await audit(admin.userId, `${srv.entity.toLowerCase()}.${archived ? "archive" : "delete"}`, srv.entity, id, { name: String(row[cfg.nameField] ?? "").slice(0, 120) });
  invalidate(...srv.tags);
  revalidatePath(`/admin/${key}`);
  return { message: archived ? "Archived." : "Deleted." };
}

/** Swap displayOrder with the neighbouring record (within the configured scope). */
export async function moveResourceAction(fd: FormData): Promise<FormState> {
  const key = String(fd.get("resource") ?? "");
  const id = String(fd.get("id") ?? "");
  const dir = fd.get("dir") === "up" ? "up" : "down";
  const cfg = getResource(key);
  const srv = SERVER_RESOURCES[key];
  if (!cfg || !srv || !srv.hasDisplayOrder) return { error: "Reordering is not available." };
  let admin;
  try {
    admin = await requireAdmin(srv.write);
  } catch (e) {
    if (e instanceof AuthError) return authMessage(e);
    throw e;
  }
  if (cfg.sensitive && !hasRecentAuth(admin)) return { error: "Please confirm your password first." };
  const model = delegate(srv.model);
  const row = await model.findUnique({ where: { id } });
  if (!row) return { error: "Not found." };
  const scope: Record<string, unknown> = {};
  for (const s of cfg.orderScope ?? []) scope[s] = row[s];
  const current = Number(row.displayOrder ?? 0);
  const neighbour = await model.findFirst({
    where: { ...scope, id: { not: id }, displayOrder: dir === "up" ? { lte: current } : { gte: current } },
    orderBy: [{ displayOrder: dir === "up" ? "desc" : "asc" }, { id: "asc" }],
  });
  if (!neighbour) return {};
  const nOrder = Number(neighbour.displayOrder ?? 0);
  await db.$transaction(async (tx) => {
    const m = delegate(srv.model, tx);
    await m.update({ where: { id }, data: { displayOrder: nOrder === current ? (dir === "up" ? current - 1 : current + 1) : nOrder } });
    await m.update({ where: { id: neighbour.id as string }, data: { displayOrder: current } });
  });
  await audit(admin.userId, `${srv.entity.toLowerCase()}.reorder`, srv.entity, id);
  invalidate(...srv.tags);
  revalidatePath(`/admin/${key}`);
  return {};
}

/** Flip the `active` flag (coverage and other simple toggles). */
export async function toggleActiveAction(fd: FormData): Promise<FormState> {
  const key = String(fd.get("resource") ?? "");
  const id = String(fd.get("id") ?? "");
  const cfg = getResource(key);
  const srv = SERVER_RESOURCES[key];
  if (!cfg || !srv || !cfg.fields.some((f) => f.name === "active")) return { error: "Not supported." };
  let admin;
  try {
    admin = await requireAdmin(srv.write);
  } catch (e) {
    if (e instanceof AuthError) return authMessage(e);
    throw e;
  }
  const model = delegate(srv.model);
  const row = await model.findUnique({ where: { id } });
  if (!row) return { error: "Not found." };
  await model.update({ where: { id }, data: { active: !row.active } });
  await audit(admin.userId, `${srv.entity.toLowerCase()}.${row.active ? "deactivate" : "activate"}`, srv.entity, id);
  invalidate(...srv.tags);
  revalidatePath("/admin/coverage");
  revalidatePath(`/admin/${key}`);
  return {};
}
