import { fail, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { conversationDTO, getOwnedConversation, messageDTO } from "@/server/chat";

/** Load own conversation + messages (visitor token ownership enforced). Supports ?after=ISO for polling. */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/chat/conversations/[publicId]">) {
  const { publicId } = await ctx.params;
  const owned = await getOwnedConversation(publicId);
  if (!owned) return fail("NOT_FOUND", "Conversation not found.");
  const afterRaw = new URL(req.url).searchParams.get("after");
  const after = afterRaw ? new Date(afterRaw) : null;
  const messages = await db.chatMessage.findMany({
    where: { conversationId: owned.conv.id, ...(after && !Number.isNaN(after.getTime()) ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  if (owned.conv.visitorUnreadCount > 0) {
    const now = new Date();
    await db.$transaction([
      db.chatMessage.updateMany({ where: { conversationId: owned.conv.id, senderType: { not: "VISITOR" }, readByVisitorAt: null }, data: { readByVisitorAt: now } }),
      db.chatConversation.update({ where: { id: owned.conv.id }, data: { visitorUnreadCount: 0 } }),
    ]);
  }
  return ok({ conversation: conversationDTO(owned.conv), messages: messages.map(messageDTO) });
}
