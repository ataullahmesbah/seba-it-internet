"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { parseFields } from "@/lib/validation/form-schema";
import { BRAND_FIELDS, GENERAL_FIELDS } from "@/features/admin/settings-fields";
import { audit, changedFields } from "@/server/audit";
import { invalidate } from "@/server/revalidate";
import { DEFAULT_GENERAL, getGeneralSettings, type GeneralSettings } from "@/server/settings";
import type { FormState } from "@/server/admin/resource-actions";

async function guard(perm: Parameters<typeof requireAdmin>[0]) {
  try {
    const a = await requireAdmin(perm);
    if (!(await rateLimit("adminMutation", a.userId)).ok) return { error: "Too many changes. Please wait." } as FormState;
    return a;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code === "FORBIDDEN" ? "Permission denied." : "Session expired." } as FormState;
    throw e;
  }
}

export async function saveBrandAction(_p: FormState, fd: FormData): Promise<FormState> {
  const a = await guard("brand.update");
  if (!("userId" in a)) return a;
  const { data, errors } = parseFields(BRAND_FIELDS, fd);
  if (Object.keys(errors).length) return { errors, error: "Please fix the highlighted fields." };
  for (const k of ["whatsappUrl", "messengerUrl"]) if (data[k] && !String(data[k]).startsWith("https://")) return { errors: { [k]: "Must be an https:// link." }, error: "Please fix the highlighted fields." };
  const before = await db.brandSetting.findUnique({ where: { id: "singleton" } });
  const payload = data as Prisma.BrandSettingUncheckedCreateInput;
  await db.brandSetting.upsert({ where: { id: "singleton" }, update: payload, create: { ...payload, id: "singleton" } });
  const changed = changedFields(before as Record<string, unknown> | null, data);
  await audit(a.userId, "brand.update", "BrandSetting", "singleton", { changedFields: changed, contactChanged: changed.some((f) => /phone|hotline|email|Url/i.test(f)) });
  invalidate("brand");
  revalidatePath("/admin", "layout");
  return { message: "Brand settings saved. The website now uses the new branding." };
}

export async function saveGeneralSettingsAction(_p: FormState, fd: FormData): Promise<FormState> {
  const a = await guard("settings.manage");
  if (!("userId" in a)) return a;
  const { data: d, errors } = parseFields(GENERAL_FIELDS, fd);
  if (Object.keys(errors).length) return { errors, error: "Please fix the highlighted fields." };
  const current = await getGeneralSettings();
  const next: GeneralSettings = {
    ...DEFAULT_GENERAL,
    ...current,
    utilityBarEnabled: Boolean(d.utilityBarEnabled),
    officeHoursEn: String(d.officeHoursEn ?? ""),
    officeHoursBn: String(d.officeHoursBn ?? ""),
    supportAvailabilityEn: String(d.supportAvailabilityEn ?? ""),
    supportAvailabilityBn: String(d.supportAvailabilityBn ?? ""),
    chatEnabled: Boolean(d.chatEnabled),
    chatOnlineHoursStart: Number(d.chatOnlineHoursStart),
    chatOnlineHoursEnd: Number(d.chatOnlineHoursEnd),
    forms: { contact: Boolean(d.formContact), connection: Boolean(d.formConnection), corporate: Boolean(d.formCorporate), coverageInterest: Boolean(d.formCoverageInterest) },
    visitorAckEmail: Boolean(d.visitorAckEmail),
    recipientEmails: { support: String(d.recipientSupport ?? ""), sales: String(d.recipientSales ?? "") },
    maintenanceBannerEnabled: Boolean(d.maintenanceBannerEnabled),
    maintenanceBannerEn: String(d.maintenanceBannerEn ?? ""),
    maintenanceBannerBn: String(d.maintenanceBannerBn ?? ""),
    browseCoverageEnabled: Boolean(d.browseCoverageEnabled),
    btrcTariffUrl: String(d.btrcTariffUrl ?? ""),
    careerUrl: String(d.careerUrl ?? ""),
    retentionMonths: Number(d.retentionMonths),
  };
  await db.siteSetting.upsert({ where: { key: "general" }, update: { value: next as unknown as Prisma.InputJsonValue, updatedBy: a.userId }, create: { key: "general", value: next as unknown as Prisma.InputJsonValue, updatedBy: a.userId } });
  await audit(a.userId, "settings.update", "SiteSetting", "general", { changedFields: changedFields(current as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>) });
  invalidate("settings");
  return { message: "Settings saved." };
}

export async function saveSecuritySettingsAction(_p: FormState, fd: FormData): Promise<FormState> {
  const a = await guard("settings.security.manage");
  if (!("userId" in a)) return a;
  if (!hasRecentAuth(a)) return { reauth: true, error: "Please confirm your password to change security settings." };
  const roles = await db.role.findMany({ select: { name: true } });
  const require2faRoles = roles.map((r) => r.name).filter((n) => fd.get(`require2fa_${n}`) === "on");
  const value = { require2faRoles, turnstileOnPublicForms: fd.get("turnstileOnPublicForms") === "on" };
  await db.siteSetting.upsert({ where: { key: "security" }, update: { value, updatedBy: a.userId }, create: { key: "security", value, updatedBy: a.userId } });
  await audit(a.userId, "settings.security_update", "SiteSetting", "security", value);
  invalidate("settings");
  return { message: "Security settings saved." };
}
