import "server-only";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

export async function getRequestContext() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip")) || "0.0.0.0";
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300);
  const requestId = h.get("x-request-id") ?? randomUUID();
  return { ip, userAgent, requestId, origin: h.get("origin"), referer: h.get("referer"), host: h.get("host") };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip")) || "0.0.0.0";
}

/**
 * CSRF defence for cookie-authenticated or public mutations: the Origin (or Referer)
 * must match this deployment's host.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host && o.host === host) return true;
    return o.origin === new URL(env.appUrl).origin;
  } catch {
    return false;
  }
}
