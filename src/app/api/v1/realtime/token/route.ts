import { fail, ok } from "@/lib/api/response";
import { isSameOrigin } from "@/lib/security/request";
import { channelName, realtime } from "@/lib/realtime";
import { getAdminContext } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getVisitor } from "@/server/chat";
import { env } from "@/lib/env";

/**
 * Issue a short-lived, scoped Ably token request. The API key never reaches the browser.
 * ?scope=admin → admin capabilities derived from current permissions; otherwise visitor scope.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("CSRF_ORIGIN_REJECTED", "Request origin rejected.");
  const rt = realtime();
  if (!rt.enabled) return ok({ enabled: false });
  const scope = new URL(req.url).searchParams.get("scope");

  if (scope === "admin") {
    const ctx = await getAdminContext();
    if (!ctx || (ctx.twoFactorEnabled && !ctx.twoFactorPassed)) return fail("UNAUTHENTICATED", "Not signed in.");
    const capability: Record<string, string[]> = { [channelName("admin-notifications", ctx.userId)]: ["subscribe"] };
    if (ctx.permissions.has("chat.read")) {
      capability[channelName("admin-chat-queue")] = ["subscribe"];
      capability[`${env.siteKey}:chat:*`] = ["subscribe"];
    }
    return ok({
      enabled: true,
      channels: {
        notifications: channelName("admin-notifications", ctx.userId),
        queue: ctx.permissions.has("chat.read") ? channelName("admin-chat-queue") : null,
        chatPrefix: `${env.siteKey}:chat:`,
      },
      tokenRequest: await rt.createTokenRequest(`staff:${ctx.userId}`, capability),
    });
  }

  const visitor = await getVisitor();
  if (!visitor) return fail("UNAUTHENTICATED", "No chat session.");
  const convs = await db.chatConversation.findMany({
    where: { visitorId: visitor.id, status: { not: "CLOSED" } },
    select: { publicId: true },
    take: 5,
  });
  const capability: Record<string, string[]> = {};
  for (const c of convs) capability[channelName("chat", c.publicId)] = ["subscribe"];
  if (Object.keys(capability).length === 0) return ok({ enabled: false });
  return ok({
    enabled: true,
    channels: Object.keys(capability),
    tokenRequest: await rt.createTokenRequest(`visitor:${visitor.id}`, capability),
  });
}
