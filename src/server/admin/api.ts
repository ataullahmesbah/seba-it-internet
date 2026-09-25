import "server-only";
import { fail } from "@/lib/api/response";
import { AuthError, requireAdmin } from "@/lib/auth/guard";
import type { AdminContext } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/auth/permissions";
import { isSameOrigin } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/** Admin route-handler wrapper: authenticate → authorize → origin/CSRF (mutations) → rate limit. */
export async function withAdmin(req: Request, perm: PermissionKey | PermissionKey[] | null, fn: (ctx: AdminContext) => Promise<Response>) {
  const mutation = req.method !== "GET" && req.method !== "HEAD";
  if (mutation && !isSameOrigin(req)) return fail("CSRF_ORIGIN_REJECTED", "Request origin rejected.");
  let ctx: AdminContext;
  try {
    ctx = await requireAdmin(perm ?? undefined);
  } catch (e) {
    if (e instanceof AuthError) return e.code === "FORBIDDEN" ? fail("FORBIDDEN", "Permission denied.") : fail(e.code, "Not signed in.");
    throw e;
  }
  if (mutation) {
    const rl = await rateLimit("adminMutation", ctx.userId);
    if (!rl.ok) return fail("RATE_LIMITED", "Too many requests.", undefined, { retryAfter: rl.retryAfterSec });
  }
  try {
    return await fn(ctx);
  } catch (err) {
    logger.error("admin api error", { url: req.url, error: String(err) });
    return fail("INTERNAL_ERROR", "Unexpected error.");
  }
}
