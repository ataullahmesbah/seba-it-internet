import { ok, readJson } from "@/lib/api/response";
import { db } from "@/lib/db";
import { withAdmin } from "@/server/admin/api";

/** Mark read — only ever the current user's own notifications. */
export async function POST(req: Request) {
  return withAdmin(req, "notifications.read", async (ctx) => {
    const body = (await readJson(req).catch(() => ({}))) as { ids?: unknown; all?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
    const res = await db.notification.updateMany({
      where: { recipientUserId: ctx.userId, readAt: null, ...(body.all === true ? {} : { id: { in: ids } }) },
      data: { readAt: new Date() },
    });
    return ok({ updated: res.count });
  });
}
