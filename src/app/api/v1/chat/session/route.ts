import { fail, ok, readJson } from "@/lib/api/response";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { chatSessionSchema } from "@/features/public-schemas";
import { db } from "@/lib/db";
import { conversationDTO, createVisitor, getVisitor } from "@/server/chat";
import { getGeneralSettings, isChatOnline } from "@/server/settings";

/** Create or restore the visitor chat session (opaque HttpOnly cookie). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("CSRF_ORIGIN_REJECTED", "Request origin rejected.");
  const settings = await getGeneralSettings();
  if (!settings.chatEnabled) return fail("FORBIDDEN", "Chat is disabled.");
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON.");
  }
  const parsed = chatSessionSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Validation failed.", { phone: "phone" });

  let visitor = await getVisitor();
  if (!visitor) {
    const rl = await rateLimit("chatSession", clientIp(req));
    if (!rl.ok) return fail("RATE_LIMITED", "Too many requests.", undefined, { retryAfter: rl.retryAfterSec });
    visitor = await createVisitor(parsed.data);
  } else if (parsed.data.name || parsed.data.phone) {
    visitor = await db.chatVisitor.update({
      where: { id: visitor.id },
      data: { name: parsed.data.name ?? visitor.name, phone: parsed.data.phone ?? visitor.phone, lastSeenAt: new Date() },
    });
  }
  const conv = await db.chatConversation.findFirst({
    where: { visitorId: visitor.id, status: { not: "CLOSED" } },
    orderBy: { lastMessageAt: "desc" },
  });
  return ok({
    visitor: { name: visitor.name, phone: visitor.phone },
    conversation: conv ? conversationDTO(conv) : null,
    online: isChatOnline(settings),
  });
}
