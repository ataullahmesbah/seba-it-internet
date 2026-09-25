import "server-only";
import { db } from "@/lib/db";
import type { AdminContext } from "@/lib/auth/session";

/** Operational counts for sidebar badges and overview (DB-derived; no marketing analytics). */
export async function getOperationalCounts(ctx: AdminContext) {
  const has = (p: Parameters<AdminContext["permissions"]["has"]>[0]) => ctx.permissions.has(p);
  const [connections, corporate, contacts, chat, interest, notifications] = await Promise.all([
    has("connections.manage") ? db.connectionRequest.count({ where: { status: "NEW" } }) : 0,
    has("corporate_inquiries.manage") ? db.corporateInquiry.count({ where: { status: "NEW" } }) : 0,
    has("contacts.manage") ? db.contactMessage.count({ where: { status: "UNREAD" } }) : 0,
    has("chat.read") ? db.chatConversation.count({ where: { status: "WAITING" } }) : 0,
    has("connections.manage") ? db.coverageInterest.count({ where: { status: "NEW" } }) : 0,
    db.notification.count({ where: { recipientUserId: ctx.userId, readAt: null } }),
  ]);
  return { connections, corporate, contacts, chat, interest, notifications };
}
