import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/security/crypto";
import { getRequestContext } from "@/lib/security/request";
import { logger } from "@/lib/logger";

/** Append-only audit record. Metadata must be redacted: field names, never secret values. */
export async function audit(
  actorUserId: string | null,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  metadata?: Record<string, unknown>,
) {
  try {
    const { ip, userAgent } = await getRequestContext();
    await db.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipHash: hashIp(ip),
        userAgent: userAgent.slice(0, 200),
      },
    });
  } catch (err) {
    logger.error("audit write failed", { action, error: String(err) });
  }
}

/** Returns the list of scalar fields whose value changed. */
export function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown>): string[] {
  if (!before) return Object.keys(after);
  return Object.keys(after).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}
