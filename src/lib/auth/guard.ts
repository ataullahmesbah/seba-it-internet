import "server-only";
import { redirect } from "next/navigation";
import { getAdminContext, type AdminContext } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/auth/permissions";
import { getSecuritySettings } from "@/server/settings";

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN" | "TWO_FACTOR_REQUIRED", message?: string) {
    super(message ?? code);
  }
}

export function can(ctx: AdminContext, perm: PermissionKey | PermissionKey[]): boolean {
  const list = Array.isArray(perm) ? perm : [perm];
  return list.some((p) => ctx.permissions.has(p));
}

/** For server components/pages: redirects when not authenticated / not allowed. */
export async function requireAdminPage(perm?: PermissionKey | PermissionKey[]): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");
  if (ctx.twoFactorEnabled && !ctx.twoFactorPassed) redirect("/admin/2fa");
  const sec = await getSecuritySettings();
  if (!ctx.twoFactorEnabled && sec.require2faRoles.some((r) => ctx.roles.includes(r))) {
    redirect("/admin/2fa?setup=required");
  }
  if (perm && !can(ctx, perm)) redirect("/admin/forbidden");
  return ctx;
}

/** For server actions / route handlers: throws AuthError instead of redirecting. */
export async function requireAdmin(perm?: PermissionKey | PermissionKey[]): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) throw new AuthError("UNAUTHENTICATED");
  if (ctx.twoFactorEnabled && !ctx.twoFactorPassed) throw new AuthError("TWO_FACTOR_REQUIRED");
  if (perm && !can(ctx, perm)) throw new AuthError("FORBIDDEN");
  return ctx;
}
