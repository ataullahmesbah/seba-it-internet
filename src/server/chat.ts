import "server-only";
import { cookies } from "next/headers";
import type { ChatConversation, ChatMessage } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashToken, randomToken } from "@/lib/security/crypto";
import { channelName, realtime } from "@/lib/realtime";
import { notify } from "@/server/notifications";

export const VISITOR_COOKIE = "seba_chat";
const VISITOR_TTL_S = 60 * 60 * 24 * 90;

export function messageDTO(m: ChatMessage) {
  return { id: m.id, senderType: m.senderType, body: m.body, createdAt: m.createdAt.toISOString() };
}

export function conversationDTO(c: ChatConversation) {
  return { publicId: c.publicId, status: c.status, lastMessageAt: c.lastMessageAt.toISOString() };
}

export async function getVisitor() {
  const token = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (!token) return null;
  return db.chatVisitor.findUnique({ where: { publicTokenHash: hashToken(token) } });
}

export async function createVisitor(details: { name: string | null; phone: string | null }) {
  const token = randomToken(32);
  const visitor = await db.chatVisitor.create({ data: { publicTokenHash: hashToken(token), name: details.name, phone: details.phone } });
  (await cookies()).set(VISITOR_COOKIE, token, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: VISITOR_TTL_S });
  return visitor;
}

/** Object-level check: the conversation must belong to the cookie's visitor. */
export async function getOwnedConversation(publicId: string) {
  const visitor = await getVisitor();
  if (!visitor) return null;
  const conv = await db.chatConversation.findUnique({ where: { publicId } });
  if (!conv || conv.visitorId !== visitor.id) return null;
  return { visitor, conv };
}

async function publishMessage(conv: ChatConversation, msg: ChatMessage, isNewConversation: boolean) {
  const rt = realtime();
  if (!rt.enabled) return false;
  await rt.publish(channelName("chat", conv.publicId), "message.created", messageDTO(msg));
  await rt.publish(channelName("admin-chat-queue"), isNewConversation ? "conversation.created" : "conversation.updated", {
    id: conv.id,
  });
  return true;
}

/** Visitor sends a message. Creates a WAITING conversation on first message; reopens RESOLVED ones. */
export async function visitorSendMessage(visitorId: string, publicId: string | null, body: string, locale: "EN" | "BN") {
  let conv = publicId ? await db.chatConversation.findUnique({ where: { publicId } }) : null;
  if (conv && conv.visitorId !== visitorId) throw new Error("FORBIDDEN");
  const isNew = !conv || conv.status === "CLOSED";
  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    if (isNew) {
      conv = await tx.chatConversation.create({
        data: { publicId: randomToken(12), visitorId, status: "WAITING", locale, lastMessageAt: now, supportUnreadCount: 1 },
      });
    } else {
      conv = await tx.chatConversation.update({
        where: { id: conv!.id },
        data: {
          lastMessageAt: now,
          supportUnreadCount: { increment: 1 },
          ...(conv!.status === "RESOLVED" ? { status: "WAITING" } : {}),
        },
      });
    }
    const msg = await tx.chatMessage.create({ data: { conversationId: conv.id, senderType: "VISITOR", body } });
    await tx.chatVisitor.update({ where: { id: visitorId }, data: { lastSeenAt: now } });
    return { conv, msg };
  });

  await notify("chat.reply", {
    type: isNew ? "CHAT_NEW" : "CHAT_MESSAGE",
    title: isNew ? "New live chat" : "New chat message",
    message: body.slice(0, 80),
    entityType: "ChatConversation",
    entityId: result.conv.id,
  });
  const published = await publishMessage(result.conv, result.msg, isNew);
  return { conversation: conversationDTO(result.conv), message: messageDTO(result.msg), realtime: published };
}

export async function staffSendMessage(userId: string, conversationId: string, body: string) {
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const current = await tx.chatConversation.findUniqueOrThrow({ where: { id: conversationId } });
    if (current.status === "CLOSED") throw new Error("CLOSED");
    const conv = await tx.chatConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
        visitorUnreadCount: { increment: 1 },
        supportUnreadCount: 0,
        status: "ACTIVE",
        assignedUserId: current.assignedUserId ?? userId,
      },
    });
    const msg = await tx.chatMessage.create({ data: { conversationId, senderType: "STAFF", senderUserId: userId, body } });
    await tx.chatMessage.updateMany({ where: { conversationId, senderType: "VISITOR", readBySupportAt: null }, data: { readBySupportAt: now } });
    return { conv, msg };
  });
  await publishMessage(result.conv, result.msg, false);
  return result;
}

export async function publishConversationStatus(conv: ChatConversation) {
  const rt = realtime();
  if (!rt.enabled) return;
  await rt.publish(channelName("chat", conv.publicId), "conversation.status", { status: conv.status });
  await rt.publish(channelName("admin-chat-queue"), "conversation.updated", { id: conv.id });
}
