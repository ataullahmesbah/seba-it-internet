import { requireAdminPage } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { assignableRoles } from "@/server/admin/role-options";
import { createUserAction } from "@/server/admin/user-actions";
import { PageHeader } from "@/components/admin/ui";
import { UserForm } from "@/components/admin/user-forms";

export const metadata = { title: "New user" };

export default async function NewUserPage() {
  const ctx = await requireAdminPage("users.manage");
  return (
    <div>
      <PageHeader title="New user" back={{ href: "/admin/users", label: "Users" }} />
      <UserForm action={createUserAction} roles={await assignableRoles(ctx)} values={{}} mode="create" needsReauth={!hasRecentAuth(ctx)} />
    </div>
  );
}
