"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/auth/password";
import { getAdminContext, revokeAllUserSessions } from "@/lib/auth/session";
import { generateRecoveryCodes, newTotpSecret, totpQrDataUrl, verifyTotp } from "@/lib/auth/totp";
import { decrypt, encrypt } from "@/lib/security/crypto";
import { renderEmail, sendEmail } from "@/lib/email";
import { audit } from "@/server/audit";
import { getSecuritySettings } from "@/server/settings";
import { getSite } from "@/server/public-data";

export interface ProfileState {
  error?: string;
  message?: string;
  qr?: string;
  secret?: string;
  recoveryCodes?: string[];
}

async function me() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");
  // Profile/2FA-setup actions are allowed before 2FA policy is satisfied, but never mid-login (2FA pending).
  if (ctx.twoFactorEnabled && !ctx.twoFactorPassed) redirect("/admin/2fa");
  return ctx;
}

async function securityEmail(userId: string, subject: string, intro: string, template: "security_2fa_changed" | "security_password_changed") {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const html = await renderEmail(subject, [], { intro });
  await sendEmail({ template, to: user.email, subject, html, related: { type: "User", id: userId } });
}

export async function updateProfileAction(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const ctx = await me();
  const name = String(fd.get("displayName") ?? "").trim();
  if (name.length < 2 || name.length > 100) return { error: "Display name must be 2-100 characters." };
  await db.user.update({ where: { id: ctx.userId }, data: { displayName: name } });
  await audit(ctx.userId, "user.profile_update", "User", ctx.userId, { changedFields: ["displayName"] });
  revalidatePath("/admin", "layout");
  return { message: "Profile updated." };
}

export async function changePasswordAction(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const ctx = await me();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  if (next !== String(fd.get("confirm") ?? "")) return { error: "New passwords do not match." };
  const policy = passwordPolicyError(next);
  if (policy) return { error: policy };
  const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!(await verifyPassword(user.passwordHash, current))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: ctx.userId }, data: { passwordHash: await hashPassword(next) } });
  await revokeAllUserSessions(ctx.userId, ctx.sessionId);
  await db.session.update({ where: { id: ctx.sessionId }, data: { reauthAt: new Date() } });
  await audit(ctx.userId, "auth.password_changed", "User", ctx.userId);
  await securityEmail(ctx.userId, "Password changed", "Your dashboard password was changed. Other sessions were signed out.", "security_password_changed");
  return { message: "Password changed. Other sessions have been signed out." };
}

/** Confirms the password to open the sensitive-action window (10 minutes). */
export async function confirmPasswordAction(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const ctx = await me();
  const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!(await verifyPassword(user.passwordHash, String(fd.get("password") ?? "")))) return { error: "Incorrect password." };
  await db.session.update({ where: { id: ctx.sessionId }, data: { reauthAt: new Date() } });
  revalidatePath("/admin", "layout");
  return { message: "Confirmed. You can continue for the next 10 minutes." };
}

export async function start2faSetupAction(): Promise<ProfileState> {
  const ctx = await me();
  const existing = await db.totpCredential.findUnique({ where: { userId: ctx.userId } });
  if (existing?.enabledAt) return { error: "Two-factor authentication is already enabled." };
  const secret = newTotpSecret();
  await db.totpCredential.upsert({
    where: { userId: ctx.userId },
    create: { userId: ctx.userId, secretEncrypted: encrypt(secret) },
    update: { secretEncrypted: encrypt(secret), enabledAt: null, recoveryCodesHash: [] },
  });
  const site = await getSite();
  return { qr: await totpQrDataUrl(secret, ctx.email, site.companyName), secret };
}

export async function confirm2faSetupAction(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const ctx = await me();
  const cred = await db.totpCredential.findUnique({ where: { userId: ctx.userId } });
  if (!cred || cred.enabledAt) return { error: "Start the setup first." };
  if (!verifyTotp(decrypt(cred.secretEncrypted), String(fd.get("code") ?? ""))) return { error: "Invalid code. Check the time on your device and try again." };
  const codes = generateRecoveryCodes();
  await db.totpCredential.update({ where: { userId: ctx.userId }, data: { enabledAt: new Date(), recoveryCodesHash: codes.hashed } });
  await db.session.update({ where: { id: ctx.sessionId }, data: { twoFactorPassed: true } });
  await audit(ctx.userId, "auth.2fa_enabled", "User", ctx.userId);
  await securityEmail(ctx.userId, "Two-factor authentication enabled", "Two-factor authentication was enabled on your dashboard account.", "security_2fa_changed");
  revalidatePath("/admin", "layout");
  return { message: "Two-factor authentication is enabled. Save these recovery codes now — they are shown only once.", recoveryCodes: codes.plain };
}

export async function regenerateRecoveryCodesAction(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const ctx = await me();
  const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId }, include: { totp: true } });
  if (!user.totp?.enabledAt) return { error: "Two-factor authentication is not enabled." };
  if (!(await verifyPassword(user.passwordHash, String(fd.get("password") ?? "")))) return { error: "Incorrect password." };
  const codes = generateRecoveryCodes();
  await db.totpCredential.update({ where: { userId: ctx.userId }, data: { recoveryCodesHash: codes.hashed } });
  await audit(ctx.userId, "auth.2fa_recovery_regenerated", "User", ctx.userId);
  return { message: "New recovery codes generated. Previous codes no longer work.", recoveryCodes: codes.plain };
}

export async function disable2faAction(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const ctx = await me();
  const sec = await getSecuritySettings();
  if (sec.require2faRoles.some((r) => ctx.roles.includes(r))) return { error: "Your role requires two-factor authentication; it cannot be disabled." };
  const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!(await verifyPassword(user.passwordHash, String(fd.get("password") ?? "")))) return { error: "Incorrect password." };
  await db.totpCredential.deleteMany({ where: { userId: ctx.userId } });
  await audit(ctx.userId, "auth.2fa_disabled", "User", ctx.userId);
  await securityEmail(ctx.userId, "Two-factor authentication disabled", "Two-factor authentication was disabled on your dashboard account. If this wasn't you, contact your administrator.", "security_2fa_changed");
  revalidatePath("/admin", "layout");
  return { message: "Two-factor authentication disabled." };
}

export async function revokeOwnSessionAction(fd: FormData) {
  const ctx = await me();
  const id = String(fd.get("sessionId") ?? "");
  await db.session.updateMany({ where: { id, userId: ctx.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(ctx.userId, "auth.session_revoked", "Session", id);
  revalidatePath("/admin/profile");
}
