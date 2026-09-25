"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AuthError, requireAdmin } from "@/lib/auth/guard";
import { hasRecentAuth, revokeAllUserSessions, type AdminContext } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { hashToken, randomToken } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { adminUrl, renderEmail, sendEmail } from "@/lib/email";
import { isPermissionKey, type PermissionKey } from "@/lib/auth/permissions";
import { audit } from "@/server/audit";

export interface UserState {
  error?: string;
  message?: string;
  errors?: Record<string, string>;
  reauth?: boolean;
  inviteLink?: string;
}

const INVITE_TTL_MS = 48 * 3600 * 1000;

async function actor(): Promise<AdminContext | UserState> {
  try {
    const a = await requireAdmin("users.manage");
    if (!(await rateLimit("adminMutation", a.userId)).ok) return { error: "Too many changes. Please wait." };
    if (!hasRecentAuth(a)) return { reauth: true, error: "Please confirm your password to manage users." };
    return a;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code === "FORBIDDEN" ? "Permission denied." : "Session expired." };
    throw e;
  }
}

async function rolePermissions(roleIds: string[]): Promise<Set<PermissionKey>> {
  const rps = await db.rolePermission.findMany({ where: { roleId: { in: roleIds } }, include: { permission: true } });
  return new Set(rps.map((rp) => rp.permission.key).filter(isPermissionKey));
}

/** A user can never grant (or manage someone holding) permissions they do not have. */
function subset(perms: Set<PermissionKey>, of: Set<PermissionKey>) {
  for (const p of perms) if (!of.has(p)) return false;
  return true;
}

async function userPermissions(userId: string) {
  const roles = await db.userRole.findMany({ where: { userId }, select: { roleId: true } });
  return rolePermissions(roles.map((r) => r.roleId));
}

async function activeSuperAdmins(excludeUserId?: string) {
  return db.user.count({ where: { isActive: true, ...(excludeUserId ? { id: { not: excludeUserId } } : {}), roles: { some: { role: { name: "SUPER_ADMIN" } } } } });
}

async function issueInvite(userId: string, email: string, kind: "invite" | "reset"): Promise<string> {
  const token = randomToken(32);
  await db.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + (kind === "invite" ? INVITE_TTL_MS : 15 * 60 * 1000)) } });
  const link = adminUrl(`/admin/reset-password?token=${token}`);
  const html = await renderEmail(kind === "invite" ? "You've been invited to the dashboard" : "Reset your admin password", [], {
    intro: kind === "invite" ? "An administrator created a staff account for you. Use this single-use link within 48 hours to choose your password." : "Use this single-use link within 15 minutes to choose a new password.",
    cta: { label: "Set password", url: link },
  });
  await sendEmail({ template: "password_reset", to: email, subject: kind === "invite" ? "Your dashboard invitation" : "Reset your admin password", html, related: { type: "User", id: userId } });
  return link;
}

const userSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email.")),
  displayName: z.string().trim().min(2, "Name must be 2-100 characters.").max(100, "Name must be 2-100 characters."),
});

export async function createUserAction(_p: UserState, fd: FormData): Promise<UserState> {
  const a = await actor();
  if (!("userId" in a)) return a;
  const parsed = userSchema.safeParse({ email: fd.get("email"), displayName: fd.get("displayName") });
  if (!parsed.success) return { errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), error: "Please fix the highlighted fields." };
  const roleIds = fd.getAll("roleIds").map(String);
  if (!roleIds.length) return { errors: { roleIds: "Assign at least one role." }, error: "Please fix the highlighted fields." };
  const roles = await db.role.findMany({ where: { id: { in: roleIds } } });
  if (roles.length !== roleIds.length) return { error: "Unknown role." };
  if (!subset(await rolePermissions(roleIds), a.permissions)) return { errors: { roleIds: "You cannot assign a role with permissions you don't have." }, error: "Not allowed." };
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) return { errors: { email: "A user with this email already exists." }, error: "Please fix the highlighted fields." };

  // Unusable random password — the user sets their own through the invite link.
  const user = await db.user.create({
    data: { email: parsed.data.email, displayName: parsed.data.displayName, passwordHash: await hashPassword(randomToken(32)), roles: { create: roleIds.map((roleId) => ({ roleId })) } },
  });
  const link = await issueInvite(user.id, user.email, "invite");
  await audit(a.userId, "user.create", "User", user.id, { roles: roles.map((r) => r.name) });
  revalidatePath("/admin/users");
  const emailOn = Boolean(env.email.resendApiKey && env.email.from);
  return {
    message: emailOn ? "User created and an invitation email was sent." : "User created. Email is not configured — share this one-time invite link securely (valid 48 hours):",
    inviteLink: emailOn ? undefined : link,
  };
}

export async function updateUserAction(userId: string, _p: UserState, fd: FormData): Promise<UserState> {
  const a = await actor();
  if (!("userId" in a)) return a;
  const target = await db.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!target) return { error: "User not found." };
  if (!subset(await userPermissions(userId), a.permissions)) return { error: "You cannot manage a user who has more permissions than you." };
  const displayName = String(fd.get("displayName") ?? "").trim();
  if (displayName.length < 2 || displayName.length > 100) return { errors: { displayName: "Name must be 2-100 characters." }, error: "Please fix the highlighted fields." };
  const isActive = fd.get("isActive") === "on";
  const roleIds = fd.getAll("roleIds").map(String);
  const self = userId === a.userId;
  const currentRoleIds = target.roles.map((r) => r.roleId).sort();
  const rolesChanged = JSON.stringify([...roleIds].sort()) !== JSON.stringify(currentRoleIds);

  if (self && rolesChanged) return { error: "You cannot change your own roles." };
  if (self && !isActive) return { error: "You cannot disable your own account." };
  if (!roleIds.length) return { errors: { roleIds: "Assign at least one role." }, error: "Please fix the highlighted fields." };
  if (rolesChanged && !subset(await rolePermissions(roleIds), a.permissions)) return { errors: { roleIds: "You cannot assign a role with permissions you don't have." }, error: "Not allowed." };

  const superRole = await db.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  const wasSuper = target.roles.some((r) => r.role.name === "SUPER_ADMIN");
  const staysSuper = superRole ? roleIds.includes(superRole.id) : false;
  if (wasSuper && target.isActive && (!isActive || !staysSuper) && (await activeSuperAdmins(userId)) === 0) {
    return { error: "At least one active Super Admin must always remain." };
  }

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { displayName, isActive } }),
    ...(rolesChanged ? [db.userRole.deleteMany({ where: { userId } }), db.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })) })] : []),
  ]);
  if (!isActive && target.isActive) await revokeAllUserSessions(userId); // disabled users are signed out immediately
  if (rolesChanged) await revokeAllUserSessions(userId, self ? a.sessionId : undefined);
  await audit(a.userId, !isActive && target.isActive ? "user.disable" : isActive && !target.isActive ? "user.enable" : "user.update", "User", userId, {
    changedFields: [...(displayName !== target.displayName ? ["displayName"] : []), ...(rolesChanged ? ["roles"] : []), ...(isActive !== target.isActive ? ["isActive"] : [])],
  });
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function userSecurityAction(fd: FormData): Promise<UserState> {
  const a = await actor();
  if (!("userId" in a)) return a;
  const userId = String(fd.get("userId") ?? "");
  const op = String(fd.get("op") ?? "");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };
  if (!subset(await userPermissions(userId), a.permissions)) return { error: "You cannot manage a user who has more permissions than you." };
  if (op === "revoke-sessions") {
    await revokeAllUserSessions(userId, userId === a.userId ? a.sessionId : undefined);
    await audit(a.userId, "user.sessions_revoked", "User", userId);
    return { message: "All sessions revoked." };
  }
  if (op === "reset-2fa") {
    await db.totpCredential.deleteMany({ where: { userId } });
    await revokeAllUserSessions(userId, userId === a.userId ? a.sessionId : undefined);
    await audit(a.userId, "user.2fa_reset", "User", userId);
    return { message: "Two-factor authentication reset. The user must set it up again if required." };
  }
  if (op === "send-reset") {
    const link = await issueInvite(userId, target.email, "reset");
    await audit(a.userId, "user.password_reset_sent", "User", userId);
    const emailOn = Boolean(env.email.resendApiKey && env.email.from);
    return { message: emailOn ? "Password reset email sent." : "Email not configured — share this single-use link securely (15 minutes):", inviteLink: emailOn ? undefined : link };
  }
  return { error: "Unknown operation." };
}

/**
 * Permanently delete a staff user (e.g. an employee who left).
 * Only a Super Admin may do this, and Super Admin accounts can never be deleted — only deactivated.
 * Historical records (audit logs, leads, chats, blog posts) are kept; their user reference becomes empty.
 */
export async function deleteUserAction(fd: FormData): Promise<UserState> {
  const a = await actor();
  if (!("userId" in a)) return a;
  if (!a.roles.includes("SUPER_ADMIN")) return { error: "Only a Super Admin can delete users." };
  const userId = String(fd.get("userId") ?? "");
  if (userId === a.userId) return { error: "You cannot delete your own account." };
  const target = await db.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!target) return { error: "User not found." };
  if (target.roles.some((r) => r.role.name === "SUPER_ADMIN")) return { error: "Super Admin accounts cannot be deleted. Deactivate the account instead." };
  await revokeAllUserSessions(userId);
  await db.user.delete({ where: { id: userId } });
  await audit(a.userId, "user.delete", "User", userId, { email: target.email, displayName: target.displayName, roles: target.roles.map((r) => r.role.name) });
  revalidatePath("/admin/users");
  redirect("/admin/users?deleted=1");
}
