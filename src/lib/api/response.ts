import "server-only";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

/** PRD 11.1 response envelope + Appendix B error catalog. */
export type ErrorCode =
  | "VALIDATION_ERROR" | "UNAUTHENTICATED" | "INVALID_CREDENTIALS" | "TWO_FACTOR_REQUIRED" | "FORBIDDEN"
  | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "CSRF_ORIGIN_REJECTED" | "PROVIDER_ERROR" | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400, UNAUTHENTICATED: 401, INVALID_CREDENTIALS: 401, TWO_FACTOR_REQUIRED: 401, FORBIDDEN: 403,
  NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429, CSRF_ORIGIN_REJECTED: 403, PROVIDER_ERROR: 503, INTERNAL_ERROR: 500,
};

const NO_STORE = { "Cache-Control": "no-store" };

export function ok<T>(data: T, meta?: Record<string, unknown>, init?: { status?: number; cache?: boolean }) {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { status: init?.status ?? 200, headers: init?.cache ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } : NO_STORE },
  );
}

export function fail(code: ErrorCode, message: string, fields?: Record<string, string>, extra?: { retryAfter?: number }) {
  const headers: Record<string, string> = { ...NO_STORE };
  if (extra?.retryAfter) headers["Retry-After"] = String(extra.retryAfter);
  return NextResponse.json(
    { success: false, error: { code, message, ...(fields ? { fields } : {}) }, requestId: randomUUID() },
    { status: STATUS[code], headers },
  );
}

export async function readJson(req: Request, maxBytes = 32_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("payload too large");
  return text ? JSON.parse(text) : {};
}
