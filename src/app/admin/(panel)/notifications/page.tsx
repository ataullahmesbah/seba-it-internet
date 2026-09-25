import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { cn, formatDateTime } from "@/lib/utils";
import { entityLink } from "@/server/notifications";
import { Badge, EmptyState, PageHeader, Pagination } from "@/components/admin/ui";
import { MarkReadButton } from "@/components/admin/mark-read";

export const metadata = { title: "Notifications" };
const PAGE_SIZE = 30;

export default async function NotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  const ctx = await requireAdminPage("notifications.read");
  const sp = await searchParams;
  const tab = sp.tab === "read" ? "read" : "unread";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { recipientUserId: ctx.userId, readAt: tab === "unread" ? null : { not: null } };
  const [total, items, unread] = await Promise.all([
    db.notification.count({ where }),
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.notification.count({ where: { recipientUserId: ctx.userId, readAt: null } }),
  ]);
  return (
    <div>
      <PageHeader title="Notifications" actions={unread > 0 ? <MarkReadButton all label="Mark all as read" /> : null} />
      <div className="mb-4 flex gap-2">
        {(["unread", "read"] as const).map((t) => (
          <Link key={t} href={`/admin/notifications?tab=${t}`} className={cn("rounded-full px-4 py-1.5 text-sm font-medium", tab === t ? "bg-primary text-white" : "bg-white ring-1 ring-line")}>
            {t === "unread" ? `Unread (${unread})` : "Read"}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title={tab === "unread" ? "You're all caught up" : "No read notifications"} />
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((n) => (
            <li key={n.id} className="flex items-center gap-3 px-4 py-3">
              <Badge>{n.type.replace(/_NEW$/, "")}</Badge>
              <Link href={entityLink(n.entityType, n.entityId)} className="min-w-0 flex-1 hover:text-primary">
                <span className="block text-sm font-medium">{n.title}</span>
                <span className="block truncate text-xs text-muted">{n.message}</span>
              </Link>
              <span className="hidden text-xs whitespace-nowrap text-muted sm:block">{formatDateTime(n.createdAt)}</span>
              {!n.readAt && <MarkReadButton ids={[n.id]} label="Mark read" />}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/admin/notifications?tab=${tab}&page=${p}`} />
    </div>
  );
}
