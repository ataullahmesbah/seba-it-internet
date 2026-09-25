import { fail, ok, readJson } from "@/lib/api/response";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { chatMessageSchema } from "@/features/public-schemas";
import { getVisitor, visitorSendMessage } from "@/server/chat";
import { getGeneralSettings } from "@/server/settings";
import { logger } from "@/lib/logger";

/** Start a new conversation with the visitor's first real message. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("CSRF_ORIGIN_REJECTED", "Request origin rejected.");
  if (!(await getGeneralSettings()).chatEnabled) return fail("FORBIDDEN", "Chat is disabled.");
  const visitor = await getVisitor();
  if (!visitor) return fail("UNAUTHENTICATED", "No chat session.");
  const rl = await rateLimit("chatMessageIp", clientIp(req));
  if (!rl.ok) return fail("RATE_LIMITED", "Too many messages.", undefined, { retryAfter: rl.retryAfterSec });
  let body: Record<string, unknown>;
  try {
    body = (await readJson(req)) as Record<string, unknown>;
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON.");
  }
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Validation failed.", { body: "message" });
  try {
    const result = await visitorSendMessage(visitor.id, null, parsed.data.body, body.locale === "bn" ? "BN" : "EN");
    return ok(result, undefined, { status: 201 });
  } catch (err) {
    logger.error("chat create failed", { error: String(err) });
    return fail("INTERNAL_ERROR", "Message was not sent.");
  }
}
