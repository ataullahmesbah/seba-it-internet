import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { channelName, realtime } from "@/lib/realtime";
import type { PermissionKey } from "@/lib/auth/permissions";

/** Resolve active users holding a permission at event time. */
export async function usersWithPermission(perm: PermissionKey): Promise<string[]> {
  const users = await db.user.findMany({
    where: { isActive: true, roles: { some: { role: { permissions: { some: { permission: { key: perm } } } } } } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Persist notifications first (DB is the source of truth), then publish realtime hints.
 * Messages are safe previews only — never secrets or full sensitive text.
 */
export async function notify(
  perm: PermissionKey,
  n: { type: NotificationType; title: string; message: string; entityType?: string; entityId?: string },
) {
  const recipients = await usersWithPermission(perm);
  if (recipients.length === 0) return;
  await db.notification.createMany({
    data: recipients.map((recipientUserId) => ({
      recipientUserId,
      type: n.type,
      title: n.title.slice(0, 150),
      message: n.message.slice(0, 200),
      entityType: n.entityType,
      entityId: n.entityId,
    })),
  });
  const rt = realtime();
  if (rt.enabled) {
    await Promise.all(
      recipients.map((uid) => rt.publish(channelName("admin-notifications", uid), "notification.created", { type: n.type })),
    );
  }
}

export function entityLink(entityType?: string | null, entityId?: string | null): string {
  switch (entityType) {
    case "ConnectionRequest":
      return `/admin/connections/${entityId}`;
    case "CorporateInquiry":
      return `/admin/corporate-inquiries/${entityId}`;
    case "ContactMessage":
      return `/admin/contact-messages/${entityId}`;
    case "CoverageInterest":
      return `/admin/coverage-interest/${entityId}`;
    case "ChatConversation":
      return `/admin/chat?c=${entityId}`;
    default:
      return "/admin/notifications";
  }
}
