import { ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { withAdmin } from "@/server/admin/api";
import { entityLink } from "@/server/notifications";
import { getOperationalCounts } from "@/server/admin/counts";

/** Current user's notifications (DB-derived unread count; realtime only accelerates refresh). */
export async function GET(req: Request) {
  return withAdmin(req, "notifications.read", async (ctx) => {
    const sp = new URL(req.url).searchParams;
    const take = Math.min(50, Number(sp.get("take")) || 8);
    const [items, counts] = await Promise.all([
      db.notification.findMany({ where: { recipientUserId: ctx.userId }, orderBy: { createdAt: "desc" }, take }),
      getOperationalCounts(ctx),
    ]);
    return ok({
      unread: counts.notifications,
      counts,
      items: items.map((n) => ({ id: n.id, type: n.type, title: n.title, message: n.message, read: Boolean(n.readAt), createdAt: n.createdAt.toISOString(), href: entityLink(n.entityType, n.entityId) })),
    });
  });
}
