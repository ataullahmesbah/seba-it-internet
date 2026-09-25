import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { Badge, Flash, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdminPage("users.manage");
  const sp = await searchParams;
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, take: 200, include: { roles: { include: { role: true } }, totp: { select: { enabledAt: true } } } });
  return (
    <div>
      <PageHeader title="Users" description="Staff accounts for the dashboard. Passwords are never visible; users set them via invite/reset links." actions={<Link href="/admin/users/new" className="btn-primary !min-h-10"><Plus className="h-4 w-4" /> New user</Link>} />
      <Flash message={sp.saved ? "User saved." : sp.deleted ? "User deleted." : null} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Roles</th>
              <th scope="col" className="px-4 py-3">2FA</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><Link href={`/admin/users/${u.id}`} className="font-medium hover:text-primary">{u.displayName}</Link></td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3"><span className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r.roleId} tone="violet">{r.role.label}</Badge>)}</span></td>
                <td className="px-4 py-3">{u.totp?.enabledAt ? <ShieldCheck className="h-4 w-4 text-success" aria-label="Enabled" /> : <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3">{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</td>
                <td className="px-4 py-3 text-xs text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
