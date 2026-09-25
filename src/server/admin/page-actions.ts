"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";
import { parseFields } from "@/lib/validation/form-schema";
import { sanitizeRichText } from "@/lib/sanitize";
import { LEGAL_PAGES, PAGE_SECTIONS } from "@/features/sections";
import { audit, changedFields } from "@/server/audit";
import { invalidate } from "@/server/revalidate";
import type { FormState } from "@/server/admin/resource-actions";

async function guard(): Promise<{ userId: string } | FormState> {
  try {
    const a = await requireAdmin("home.update");
    if (!(await rateLimit("adminMutation", a.userId)).ok) return { error: "Too many changes. Please wait." };
    return a;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code === "FORBIDDEN" ? "Permission denied." : "Session expired." };
    throw e;
  }
}

async function ensurePage(key: string) {
  const def = PAGE_SECTIONS[key];
  const title = def?.label ?? LEGAL_PAGES[key] ?? key;
  return db.page.upsert({ where: { key }, update: {}, create: { key, titleEn: title, titleBn: title, status: "PUBLISHED" } });
}

export async function saveSectionAction(pageKey: string, type: string, _p: FormState, fd: FormData): Promise<FormState> {
  const def = PAGE_SECTIONS[pageKey]?.sections[type];
  if (!def) return { error: "Unknown section." };
  const g = await guard();
  if (!("userId" in g)) return g;
  const { data, errors } = parseFields(def.fields, fd);
  if (Object.keys(errors).length) return { errors, error: "Please fix the highlighted fields." };
  const page = await ensurePage(pageKey);
  const existing = await db.pageSection.findUnique({ where: { pageId_type: { pageId: page.id, type } } });
  const max = await db.pageSection.aggregate({ where: { pageId: page.id }, _max: { displayOrder: true } });
  await db.pageSection.upsert({
    where: { pageId_type: { pageId: page.id, type } },
    update: { data: data as Prisma.InputJsonValue },
    create: { pageId: page.id, type, data: data as Prisma.InputJsonValue, enabled: true, displayOrder: (max._max.displayOrder ?? 0) + 1 },
  });
  await audit(g.userId, "page_section.update", "PageSection", `${pageKey}:${type}`, { changedFields: changedFields((existing?.data ?? null) as Record<string, unknown> | null, data) });
  invalidate("pages");
  revalidatePath(`/admin/pages/${pageKey}`);
  redirect(`/admin/pages/${pageKey}?saved=1`);
}

export async function toggleSectionAction(fd: FormData): Promise<FormState> {
  const pageKey = String(fd.get("page"));
  const type = String(fd.get("type"));
  if (!PAGE_SECTIONS[pageKey]?.sections[type]) return { error: "Unknown section." };
  const g = await guard();
  if (!("userId" in g)) return g;
  const page = await ensurePage(pageKey);
  const s = await db.pageSection.findUnique({ where: { pageId_type: { pageId: page.id, type } } });
  if (!s) return { error: "Configure the section first." };
  await db.pageSection.update({ where: { id: s.id }, data: { enabled: !s.enabled } });
  await audit(g.userId, s.enabled ? "page_section.disable" : "page_section.enable", "PageSection", `${pageKey}:${type}`);
  invalidate("pages");
  revalidatePath(`/admin/pages/${pageKey}`);
  return {};
}

export async function moveSectionAction(fd: FormData): Promise<FormState> {
  const pageKey = String(fd.get("page"));
  const type = String(fd.get("type"));
  const dir = fd.get("dir") === "up" ? -1 : 1;
  const g = await guard();
  if (!("userId" in g)) return g;
  const page = await ensurePage(pageKey);
  const sections = await db.pageSection.findMany({ where: { pageId: page.id }, orderBy: [{ displayOrder: "asc" }, { type: "asc" }] });
  const i = sections.findIndex((s) => s.type === type);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sections.length) return {};
  [sections[i], sections[j]] = [sections[j], sections[i]];
  await db.$transaction(sections.map((s, idx) => db.pageSection.update({ where: { id: s.id }, data: { displayOrder: idx + 1 } })));
  await audit(g.userId, "page_section.reorder", "Page", pageKey);
  invalidate("pages");
  revalidatePath(`/admin/pages/${pageKey}`);
  return {};
}

export async function saveLegalPageAction(pageKey: string, _p: FormState, fd: FormData): Promise<FormState> {
  if (!LEGAL_PAGES[pageKey]) return { error: "Unknown page." };
  const g = await guard();
  if (!("userId" in g)) return g;
  const titleEn = String(fd.get("titleEn") ?? "").trim().slice(0, 150);
  const titleBn = String(fd.get("titleBn") ?? "").trim().slice(0, 150);
  const contentEn = sanitizeRichText(String(fd.get("contentEn") ?? ""));
  const contentBn = sanitizeRichText(String(fd.get("contentBn") ?? ""));
  const status = fd.get("status") === "DRAFT" ? "DRAFT" : "PUBLISHED";
  const errors: Record<string, string> = {};
  if (titleEn.length < 2) errors.titleEn = "English title is required.";
  if (titleBn.length < 2) errors.titleBn = "Bangla title is required.";
  if (status === "PUBLISHED" && !contentEn.trim()) errors.contentEn = "English content is required to publish.";
  if (status === "PUBLISHED" && !contentBn.trim()) errors.contentBn = "Bangla content is required to publish.";
  if (Object.keys(errors).length) return { errors, error: "Please fix the highlighted fields." };
  await db.page.upsert({ where: { key: pageKey }, update: { titleEn, titleBn, contentEn, contentBn, status }, create: { key: pageKey, titleEn, titleBn, contentEn, contentBn, status } });
  await audit(g.userId, "page.update", "Page", pageKey, { status });
  invalidate("pages");
  redirect(`/admin/pages?saved=1`);
}
