import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/** Optional Cloudflare Turnstile verification. Returns true when not configured/required. */
export async function verifyTurnstile(token: string | undefined, ip: string, required: boolean): Promise<boolean> {
  const secret = env.turnstile.secretKey;
  if (!secret || !required) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(4000),
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch (err) {
    logger.warn("turnstile verification failed", { error: String(err) });
    return false;
  }
}
