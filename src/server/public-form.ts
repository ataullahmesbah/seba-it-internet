import "server-only";
import type { z } from "zod";
import { fail, ok, readJson } from "@/lib/api/response";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { rateLimit, type LIMITS } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { issuesToFields } from "@/features/public-schemas";
import { getGeneralSettings, getSecuritySettings, type GeneralSettings } from "@/server/settings";
import { LeadError } from "@/server/leads";
import { logger } from "@/lib/logger";
import { referenceCode } from "@/lib/security/crypto";

/**
 * Shared pipeline for public write endpoints:
 * origin check → rate limit → parse → honeypot → validate → form toggle → anti-bot → durable save.
 */
export async function handlePublicForm<S extends z.ZodTypeAny>(
  req: Request,
  opts: {
    schema: S;
    limit: keyof typeof LIMITS;
    formToggle: keyof GeneralSettings["forms"];
    run: (data: z.output<S>) => Promise<unknown>;
  },
) {
  if (!isSameOrigin(req)) return fail("CSRF_ORIGIN_REJECTED", "Request origin rejected.");
  const ip = clientIp(req);
  const rl = await rateLimit(opts.limit, ip);
  if (!rl.ok) return fail("RATE_LIMITED", "Too many requests.", undefined, { retryAfter: rl.retryAfterSec });

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return fail("VALIDATION_ERROR", "Invalid JSON payload.");
  }
  // Honeypot: bots filling the hidden field get a fake success and nothing is stored.
  if (body && typeof body === "object" && typeof (body as Record<string, unknown>).website === "string" && (body as Record<string, string>).website !== "") {
    return ok({ referenceCode: referenceCode("REF") }, undefined, { status: 201 });
  }
  const parsed = opts.schema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Validation failed.", issuesToFields(parsed.error.issues));

  const settings = await getGeneralSettings();
  if (!settings.forms[opts.formToggle]) return fail("FORBIDDEN", "This form is currently disabled.");

  const sec = await getSecuritySettings();
  const token = (parsed.data as { turnstileToken?: string }).turnstileToken;
  if (!(await verifyTurnstile(token, ip, sec.turnstileOnPublicForms))) {
    return fail("VALIDATION_ERROR", "Anti-bot verification failed.", { _form: "captcha" });
  }

  try {
    const result = await opts.run(parsed.data);
    return ok(result, undefined, { status: 201 });
  } catch (err) {
    if (err instanceof LeadError) return fail(err.code, "Validation failed.", err.fields);
    logger.error("public form failure", { limit: opts.limit, error: String(err) });
    return fail("INTERNAL_ERROR", "Unexpected error.");
  }
}
