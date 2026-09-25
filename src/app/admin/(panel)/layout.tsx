import { requireAdminPage, can } from "@/lib/auth/guard";
import { ADMIN_NAV } from "@/features/admin/nav";
import { getOperationalCounts } from "@/server/admin/counts";
import { getSite } from "@/server/public-data";
import { logoutAction } from "@/server/admin/auth-actions";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminToast } from "@/components/admin/admin-toast";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdminPage();
  const [counts, site] = await Promise.all([getOperationalCounts(ctx), getSite()]);
  // Permission-denied modules are hidden (server checks still run on every request).
  const nav = ADMIN_NAV.map((g) => ({
    group: g.group,
    items: g.items.filter((i) => can(ctx, i.perm)).map(({ href, label, icon, badge }) => ({ href, label, icon, badge })),
  })).filter((g) => g.items.length);
  return (
    <AdminShell nav={nav} user={{ displayName: ctx.displayName, email: ctx.email, roles: ctx.roles }} brand={site.companyName} initialCounts={counts} logout={logoutAction}>
      <Suspense fallback={null}>
        <AdminToast />
      </Suspense>
      {children}
    </AdminShell>
  );
}