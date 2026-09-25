import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { assignableRoles } from "@/server/admin/role-options";
import { deleteUserAction, updateUserAction } from "@/server/admin/user-actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ReauthCard } from "@/components/admin/reauth-card";
import { Card, DefinitionList, PageHeader } from "@/components/admin/ui";
import { UserForm, UserSecurityPanel } from "@/components/admin/user-forms";

export const metadata = { title: "Edit user" };

export default async function EditUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const ctx = await requireAdminPage("users.manage");
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, include: { roles: { include: { role: true } }, totp: { select: { enabledAt: true } }, sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } } } });
  if (!user) notFound();
  const isSuper = user.roles.some((r) => r.role.name === "SUPER_ADMIN");
  const isSelf = user.id === ctx.userId;
  return (
    <div>
      <PageHeader title={user.displayName} description={user.email} back={{ href: "/admin/users", label: "Users" }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <UserForm
          action={updateUserAction.bind(null, id)}
          roles={await assignableRoles(ctx)}
          values={{ email: user.email, displayName: user.displayName, isActive: user.isActive, roleIds: user.roles.map((r) => r.roleId) }}
          mode="edit"
          needsReauth={!hasRecentAuth(ctx)}
        />
        <aside className="space-y-4">
          <Card title="Account">
            <DefinitionList
              items={[
                ["Created", formatDateTime(user.createdAt)],
                ["Last login", user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"],
                ["2FA", user.totp?.enabledAt ? "Enabled" : "Not enabled"],
                ["Active sessions", String(user.sessions.length)],
              ]}
            />
          </Card>
          <UserSecurityPanel userId={id} />
          {ctx.roles.includes("SUPER_ADMIN") && (
            <Card title="Delete user" className="border-red-200">
              {isSuper ? (
                <p className="text-sm text-muted">Super Admin accounts cannot be deleted. Uncheck “Active” to deactivate this account instead.</p>
              ) : isSelf ? (
                <p className="text-sm text-muted">You cannot delete your own account.</p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted">Permanently remove this staff account (e.g. an employee who left). Their past activity stays in the audit log.</p>
                  {!hasRecentAuth(ctx) && <div className="mb-3"><ReauthCard /></div>}
                  <ConfirmButton
                    action={deleteUserAction}
                    fields={{ userId: id }}
                    label="Delete user permanently"
                    title={`Delete ${user.displayName}?`}
                    description={`${user.email} will be removed and signed out everywhere. This cannot be undone.`}
                    confirmLabel="Delete user"
                    className="btn-danger w-full !min-h-10 text-sm"
                  />
                </>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
