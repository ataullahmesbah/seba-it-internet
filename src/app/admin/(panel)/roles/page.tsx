import { requireAdminPage } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { deleteRoleAction, saveRolePermissionsAction } from "@/server/admin/role-actions";
import { PageHeader } from "@/components/admin/ui";
import { NewRoleForm, RoleEditor } from "@/components/admin/role-editor";
import { ReauthCard } from "@/components/admin/reauth-card";
import { ConfirmButton } from "@/components/admin/confirm-button";

export const metadata = { title: "Roles & Permissions" };

export default async function RolesPage() {
  const ctx = await requireAdminPage("roles.manage");
  const roles = await db.role.findMany({ orderBy: { createdAt: "asc" }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } });
  const permissions = Object.entries(PERMISSIONS).map(([key, description]) => ({ key, description }));
  return (
    <div className="space-y-4">
      <PageHeader title="Roles & Permissions" description="Permissions are system-defined; roles are collections of them. Authorization always checks permissions server-side on every request." />
      {!hasRecentAuth(ctx) && <ReauthCard />}
      {roles.map((r) => (
        <div key={r.id} className="space-y-2">
          <RoleEditor
            action={saveRolePermissionsAction.bind(null, r.id)}
            role={{ label: r.label, description: r.description, name: r.name, users: r._count.users, granted: r.permissions.map((p) => p.permission.key) }}
            permissions={permissions}
            locked={r.name === "SUPER_ADMIN"}
          />
          {!r.isSystem && (
            <div className="flex justify-end">
              <ConfirmButton action={deleteRoleAction} fields={{ id: r.id }} label="Delete role" title={`Delete role “${r.label}”?`} description="Only roles with no assigned users can be deleted." confirmLabel="Delete" />
            </div>
          )}
        </div>
      ))}
      <NewRoleForm />
    </div>
  );
}
