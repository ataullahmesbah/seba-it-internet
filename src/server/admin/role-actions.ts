"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { isPermissionKey } from "@/lib/auth/permissions";
import { audit } from "@/server/audit";

export interface RoleState {
  error?: string;
  message?: string;
  reauth?: boolean;
}

async function guard() {
  try {
    const a = await requireAdmin("roles.manage");
    if (!hasRecentAuth(a)) return { reauth: true, error: "Please confirm your password to change roles." } as RoleState;
    return a;
  } catch (e) {
    if (e instanceof AuthError) return { error: "Permission denied." } as RoleState;
    throw e;
  }
}

/** Permission keys are system constants — unknown keys are rejected. SUPER_ADMIN always keeps all permissions. */
export async function saveRolePermissionsAction(roleId: string, _p: RoleState, fd: FormData): Promise<RoleState> {
  const a = await guard();
  if (!("userId" in a)) return a;
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role not found." };
  if (role.name === "SUPER_ADMIN") return { error: "The Super Admin role always has every permission." };
  const keys = fd.getAll("perm").map(String);
  if (keys.some((k) => !isPermissionKey(k))) return { error: "Unknown permission." };
  const label = String(fd.get("label") ?? role.label).trim().slice(0, 60) || role.label;
  const perms = await db.permission.findMany({ where: { key: { in: keys } } });
  await db.$transaction([
    db.role.update({ where: { id: roleId }, data: { label, description: String(fd.get("description") ?? "").trim().slice(0, 200) || null } }),
    db.rolePermission.deleteMany({ where: { roleId } }),
    db.rolePermission.createMany({ data: perms.map((p) => ({ roleId, permissionId: p.id })) }),
  ]);
  await audit(a.userId, "role.permissions_update", "Role", roleId, { role: role.name, permissions: keys });
  revalidatePath("/admin/roles");
  return { message: `Saved “${label}”. Changes apply on users' next request.` };
}

export async function createRoleAction(_p: RoleState, fd: FormData): Promise<RoleState> {
  const a = await guard();
  if (!("userId" in a)) return a;
  const label = String(fd.get("label") ?? "").trim();
  if (label.length < 2 || label.length > 60) return { error: "Role name must be 2-60 characters." };
  const name = label.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  if (!name || (await db.role.findUnique({ where: { name } }))) return { error: "A role with this name already exists." };
  const role = await db.role.create({ data: { name, label, isSystem: false } });
  await audit(a.userId, "role.create", "Role", role.id, { name });
  revalidatePath("/admin/roles");
  return { message: `Role “${label}” created. Now choose its permissions.` };
}

export async function deleteRoleAction(fd: FormData): Promise<RoleState> {
  const a = await guard();
  if (!("userId" in a)) return a;
  const id = String(fd.get("id") ?? "");
  const role = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) return { error: "Role not found." };
  if (role.isSystem) return { error: "System roles cannot be deleted." };
  if (role._count.users > 0) return { error: `Role is assigned to ${role._count.users} user(s). Reassign them first.` };
  await db.role.delete({ where: { id } });
  await audit(a.userId, "role.delete", "Role", id, { name: role.name });
  revalidatePath("/admin/roles");
  return { message: "Role deleted." };
}

