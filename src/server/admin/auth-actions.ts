"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, createSession, getAdminContext, readSessionToken, revokeAllUserSessions } from "@/lib/auth/session";
import { hashRecoveryCode, verifyTotp } from "@/lib/auth/totp";
import { decrypt, hashToken, randomToken } from "@/lib/security/crypto";
import { getRequestContext } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { adminUrl, renderEmail, sendEmail } from "@/lib/email";
import { audit } from "@/server/audit";

export interface AuthState {
  error?: string;
  message?: string;
}

let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= hashPassword(randomToken(16));
  return dummyHash;
}

const loginSchema = z.object({ email: z.string().trim().toLowerCase().max(254), password: z.string().min(1).max(128) });

export async function loginAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "Invalid email or password." };
  const { email, password } = parsed.data;
  const { ip, userAgent } = await getRequestContext();

  const rl = await rateLimit("adminLogin", `${ip}:${email}`);
  if (!rl.ok) return { error: `Too many attempts. Please try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.` };

  const user = await db.user.findUnique({ where: { email }, include: { totp: { select: { enabledAt: true } } } });
  // Always run a hash verification to keep timing uniform (no account enumeration).
  let valid = false;
  if (user) valid = await verifyPassword(user.passwordHash, password);
  else await verifyPassword(await getDummyHash(), password);
  if (!user || !valid || !user.isActive) {
    await audit(user?.id ?? null, "auth.login_failed", "User", user?.id ?? null, { reason: !user ? "unknown" : !user.isActive ? "disabled" : "password" });
    return { error: "Invalid email or password." };
  }
  const needs2fa = Boolean(user.totp?.enabledAt);
  await createSession(user.id, ip, userAgent, !needs2fa);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, needs2fa ? "auth.login_password_ok" : "auth.login", "User", user.id);
  redirect(needs2fa ? "/admin/2fa" : "/admin");
}

export async function verifyTwoFactorAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const token = await readSessionToken();
  if (!token) redirect("/admin/login");
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { totp: true } } } });
  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) redirect("/admin/login");
  if (session.twoFactorPassed) redirect("/admin");
  const totp = session.user.totp;
  if (!totp?.enabledAt) redirect("/admin");

  const { ip } = await getRequestContext();
  const rl = await rateLimit("adminLogin", `2fa:${ip}:${session.userId}`);
  if (!rl.ok) return { error: "Too many attempts. Please wait and try again." };

  const code = String(fd.get("code") ?? "").trim();
  let ok = false;
  let usedRecovery = false;
  if (/^\d{6}$/.test(code.replace(/\s/g, ""))) {
    ok = verifyTotp(decrypt(totp.secretEncrypted), code);
  } else if (code.length >= 8) {
    const hashes = (totp.recoveryCodesHash as string[]) ?? [];
    const h = hashRecoveryCode(code);
    if (hashes.includes(h)) {
      ok = true;
      usedRecovery = true;
      await db.totpCredential.update({ where: { userId: totp.userId }, data: { recoveryCodesHash: hashes.filter((x) => x !== h) } });
    }
  }
  if (!ok) {
    await audit(session.userId, "auth.2fa_failed", "User", session.userId);
    return { error: "Invalid verification code." };
  }
  await db.session.update({ where: { id: session.id }, data: { twoFactorPassed: true, reauthAt: new Date() } });
  await audit(session.userId, usedRecovery ? "auth.2fa_recovery_used" : "auth.login", "User", session.userId);
  redirect("/admin");
}

export async function logoutAction() {
  const ctx = await getAdminContext();
  const token = await readSessionToken();
  if (token) await db.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  await clearSessionCookie();
  if (ctx) await audit(ctx.userId, "auth.logout", "User", ctx.userId);
  redirect("/admin/login");
}

export async function forgotPasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const generic: AuthState = { message: "If an account exists for that email, a reset link has been sent. The link expires in 15 minutes." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const { ip } = await getRequestContext();
  const [a, b] = await Promise.all([rateLimit("passwordResetAccount", email), rateLimit("passwordResetIp", ip)]);
  if (!a.ok || !b.ok || !email) return generic;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return generic;

  const token = randomToken(32);
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
  const link = adminUrl(`/admin/reset-password?token=${token}`);
  const html = await renderEmail("Reset your admin password", [], {
    intro: "A password reset was requested for your dashboard account. This single-use link expires in 15 minutes. If you did not request it, ignore this email.",
    cta: { label: "Reset password", url: link },
  });
  const sent = await sendEmail({ template: "password_reset", to: user.email, subject: "Reset your admin password", html, related: { type: "User", id: user.id } });
  if (!sent && !env.isProd) logger.info("DEV ONLY — password reset link (email provider not configured)", { resetPath: `/admin/reset-password?token=${token}` });
  await audit(user.id, "auth.password_reset_requested", "User", user.id);
  return generic;
}

export async function resetPasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password !== confirm) return { error: "Passwords do not match." };
  const policy = passwordPolicyError(password);
  if (policy) return { error: policy };
  const rec = token ? await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } }) : null;
  if (!rec || rec.usedAt || rec.expiresAt < new Date() || !rec.user.isActive) return { error: "This reset link is invalid or has expired. Please request a new one." };

  await db.$transaction([
    db.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.updateMany({ where: { userId: rec.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await revokeAllUserSessions(rec.userId);
  await audit(rec.userId, "auth.password_reset_completed", "User", rec.userId);
  const html = await renderEmail("Your password was changed", [], { intro: "Your dashboard password was just reset. If this wasn't you, contact your administrator immediately." });
  await sendEmail({ template: "security_password_changed", to: rec.user.email, subject: "Password changed", html, related: { type: "User", id: rec.userId } });
  redirect("/admin/login?reset=1");
}
