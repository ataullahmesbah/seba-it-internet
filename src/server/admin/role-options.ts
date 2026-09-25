import "server-only";
import { db } from "@/lib/db";
import { isPermissionKey } from "@/lib/auth/permissions";
import type { AdminContext } from "@/lib/auth/session";

/** Roles with a flag telling whether the current admin may assign them (no privilege escalation). */
export async function assignableRoles(ctx: AdminContext) {
  const roles = await db.role.findMany({ orderBy: { createdAt: "asc" }, include: { permissions: { include: { permission: true } } } });
  return roles.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    allowed: r.permissions.every((rp) => isPermissionKey(rp.permission.key) && ctx.permissions.has(rp.permission.key)),
  }));
}
