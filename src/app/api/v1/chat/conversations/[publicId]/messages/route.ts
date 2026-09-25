import { fail, ok, readJson } from "@/lib/api/response";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { chatMessageSchema } from "@/features/public-schemas";
import { getOwnedConversation, visitorSendMessage } from "@/server/chat";
import { getGeneralSettings } from "@/server/settings";
import { logger } from "@/lib/logger";

export async function POST(req: Request, ctx: RouteContext<"/api/v1/chat/conversations/[publicId]/messages">) {
  if (!isSameOrigin(req)) return fail("CSRF_ORIGIN_REJECTED", "Request origin rejected.");
  if (!(await getGeneralSettings()).chatEnabled) return fail("FORBIDDEN", "Chat is disabled.");
  const { publicId } = await ctx.params;
  const owned = await getOwnedConversation(publicId);
  if (!owned) return fail("NOT_FOUND", "Conversation not found.");
  const [a, b] = await Promise.all([rateLimit("chatMessageConversation", publicId), rateLimit("chatMessageIp", clientIp(req))]);
  if (!a.ok || !b.ok) return fail("RATE_LIMITED", "Too many messages.", undefined, { retryAfter: Math.max(a.retryAfterSec, b.retryAfterSec) });
  let body: Record<string, unknown>;
  try {
    body = (await readJson(req)) as Record<string, unknown>;
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON.");
  }
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Validation failed.", { body: "message" });
  try {
    const result = await visitorSendMessage(owned.visitor.id, publicId, parsed.data.body, owned.conv.locale);
    return ok(result, undefined, { status: 201 });
  } catch (err) {
    logger.error("chat message failed", { error: String(err) });
    return fail("INTERNAL_ERROR", "Message was not sent.");
  }
}
