import { fail, ok, readJson } from "@/lib/api/response";
import { chatMessageSchema } from "@/features/public-schemas";
import { withAdmin } from "@/server/admin/api";
import { messageDTO, staffSendMessage } from "@/server/chat";

/** Staff reply — persisted first, then published. */
export async function POST(req: Request, ctx: RouteContext<"/api/v1/admin/chat/conversations/[id]/messages">) {
  return withAdmin(req, "chat.reply", async (admin) => {
    const { id } = await ctx.params;
    const parsed = chatMessageSchema.safeParse(await readJson(req).catch(() => ({})));
    if (!parsed.success) return fail("VALIDATION_ERROR", "Message must be 1-2000 characters.");
    try {
      const { msg } = await staffSendMessage(admin.userId, id, parsed.data.body);
      return ok({ ...messageDTO(msg), staffName: admin.displayName }, undefined, { status: 201 });
    } catch (e) {
      if (String(e).includes("CLOSED")) return fail("CONFLICT", "This conversation is closed.");
      if (String(e).includes("No ChatConversation found") || String(e).includes("NotFound")) return fail("NOT_FOUND", "Conversation not found.");
      throw e;
    }
  });
}
