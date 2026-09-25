import type { ChatStatus, Prisma } from "@prisma/client";
import { ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { displayBdPhone } from "@/lib/validation/phone";
import { withAdmin } from "@/server/admin/api";

const STATUSES: ChatStatus[] = ["WAITING", "ACTIVE", "RESOLVED", "CLOSED"];

export async function GET(req: Request) {
  return withAdmin(req, "chat.read", async (ctx) => {
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    const mine = sp.get("mine") === "1";
    const take = Math.min(100, Number(sp.get("take")) || 50);
    const where: Prisma.ChatConversationWhereInput = {
      ...(status && STATUSES.includes(status as ChatStatus) ? { status: status as ChatStatus } : { status: { in: ["WAITING", "ACTIVE"] } }),
      ...(mine ? { assignedUserId: ctx.userId } : {}),
    };
    const rows = await db.chatConversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take,
      include: {
        visitor: true,
        assignedUser: { select: { id: true, displayName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderType: true } },
      },
    });
    const counts = await db.chatConversation.groupBy({ by: ["status"], _count: true });
    return ok({
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      conversations: rows.map((c) => ({
        id: c.id,
        publicId: c.publicId,
        status: c.status,
        visitorName: c.visitor.name ?? "Visitor",
        visitorPhone: c.visitor.phone ? displayBdPhone(c.visitor.phone) : null,
        assigned: c.assignedUser,
        supportUnread: c.supportUnreadCount,
        lastMessageAt: c.lastMessageAt.toISOString(),
        preview: c.messages[0] ? `${c.messages[0].senderType === "STAFF" ? "You: " : ""}${c.messages[0].body.slice(0, 80)}` : "",
        locale: c.locale,
      })),
    });
  });
}
