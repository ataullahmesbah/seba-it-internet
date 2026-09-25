import { fail, ok, readJson } from "@/lib/api/response";
import { db } from "@/lib/db";
import { displayBdPhone } from "@/lib/validation/phone";
import { withAdmin } from "@/server/admin/api";
import { messageDTO, publishConversationStatus } from "@/server/chat";
import { audit } from "@/server/audit";

export async function GET(req: Request, ctx: RouteContext<"/api/v1/admin/chat/conversations/[id]">) {
  return withAdmin(req, "chat.read", async () => {
    const { id } = await ctx.params;
    const conv = await db.chatConversation.findUnique({ where: { id }, include: { visitor: true, assignedUser: { select: { id: true, displayName: true } } } });
    if (!conv) return fail("NOT_FOUND", "Conversation not found.");
    const after = new URL(req.url).searchParams.get("after");
    const afterDate = after ? new Date(after) : null;
    const messages = await db.chatMessage.findMany({
      where: { conversationId: id, ...(afterDate && !Number.isNaN(afterDate.getTime()) ? { createdAt: { gt: afterDate } } : {}) },
      orderBy: { createdAt: "asc" },
      take: 500,
      include: { senderUser: { select: { displayName: true } } },
    });
    if (conv.supportUnreadCount > 0) {
      await db.$transaction([
        db.chatMessage.updateMany({ where: { conversationId: id, senderType: "VISITOR", readBySupportAt: null }, data: { readBySupportAt: new Date() } }),
        db.chatConversation.update({ where: { id }, data: { supportUnreadCount: 0 } }),
      ]);
    }
    return ok({
      conversation: {
        id: conv.id,
        publicId: conv.publicId,
        status: conv.status,
        locale: conv.locale,
        assigned: conv.assignedUser,
        visitor: { name: conv.visitor.name, phone: conv.visitor.phone ? displayBdPhone(conv.visitor.phone) : null, email: conv.visitor.email, since: conv.visitor.createdAt.toISOString() },
        createdAt: conv.createdAt.toISOString(),
      },
      messages: messages.map((m) => ({ ...messageDTO(m), staffName: m.senderUser?.displayName ?? null })),
    });
  });
}

/** Change status (ACTIVE/RESOLVED/CLOSED) or assignment. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/v1/admin/chat/conversations/[id]">) {
  return withAdmin(req, "chat.reply", async (admin) => {
    const { id } = await ctx.params;
    const body = (await readJson(req).catch(() => ({}))) as { status?: string; assignedUserId?: string | null };
    const conv = await db.chatConversation.findUnique({ where: { id } });
    if (!conv) return fail("NOT_FOUND", "Conversation not found.");
    const data: { status?: "ACTIVE" | "RESOLVED" | "CLOSED" | "WAITING"; assignedUserId?: string | null } = {};
    if (body.status) {
      if (!["ACTIVE", "RESOLVED", "CLOSED", "WAITING"].includes(body.status)) return fail("VALIDATION_ERROR", "Invalid status.");
      if (conv.status === "CLOSED") return fail("CONFLICT", "Closed conversations cannot be reopened; the visitor will start a new one.");
      data.status = body.status as typeof data.status;
    }
    if (body.assignedUserId !== undefined) {
      if (body.assignedUserId) {
        const assignee = await db.user.findFirst({
          where: { id: body.assignedUserId, isActive: true, roles: { some: { role: { permissions: { some: { permission: { key: "chat.reply" } } } } } } },
        });
        if (!assignee) return fail("VALIDATION_ERROR", "Assignee must be an active user with chat permission.");
      }
      data.assignedUserId = body.assignedUserId || null;
    }
    const updated = await db.chatConversation.update({ where: { id }, data });
    if (data.status === "RESOLVED" || data.status === "CLOSED") {
      await db.chatMessage.create({ data: { conversationId: id, senderType: "SYSTEM", body: data.status === "RESOLVED" ? "Conversation marked as resolved." : "Conversation closed." } });
    }
    await audit(admin.userId, "chat.update", "ChatConversation", id, { changedFields: Object.keys(data) });
    await publishConversationStatus(updated);
    return ok({ status: updated.status, assignedUserId: updated.assignedUserId });
  });
}
