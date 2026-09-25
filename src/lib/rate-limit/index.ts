import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/** RateLimitAdapter — Upstash Redis (REST) in production, in-memory for local development. */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

interface RateLimitAdapter {
  hit(key: string, limit: number, windowSec: number): Promise<RateLimitResult>;
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();

const memoryAdapter: RateLimitAdapter = {
  async hit(key, limit, windowSec) {
    const now = Date.now();
    const entry = memoryStore.get(key);
    if (!entry || entry.resetAt <= now) {
      memoryStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
      if (memoryStore.size > 10_000) {
        for (const [k, v] of memoryStore) if (v.resetAt <= now) memoryStore.delete(k);
      }
      return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
    }
    entry.count += 1;
    const ok = entry.count <= limit;
    return { ok, remaining: Math.max(0, limit - entry.count), retryAfterSec: ok ? 0 : Math.ceil((entry.resetAt - now) / 1000) };
  },
};

const upstashAdapter: RateLimitAdapter = {
  async hit(key, limit, windowSec) {
    const url = env.upstash.url!;
    const token = env.upstash.token!;
    const bucket = Math.floor(Date.now() / (windowSec * 1000));
    const redisKey = `rl:${env.siteKey}:${key}:${bucket}`;
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([["INCR", redisKey], ["EXPIRE", redisKey, String(windowSec)]]),
        signal: AbortSignal.timeout(1500),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`upstash ${res.status}`);
      const data = (await res.json()) as Array<{ result: number }>;
      const count = Number(data[0]?.result ?? 0);
      const ok = count <= limit;
      const retry = ok ? 0 : windowSec - Math.floor((Date.now() / 1000) % windowSec);
      return { ok, remaining: Math.max(0, limit - count), retryAfterSec: retry };
    } catch (err) {
      // Fail open to the in-memory limiter so a Redis outage never blocks leads entirely.
      logger.warn("rate-limit provider failure", { provider: "upstash", error: String(err) });
      return memoryAdapter.hit(key, limit, windowSec);
    }
  },
};

function adapter(): RateLimitAdapter {
  return env.upstash.url && env.upstash.token ? upstashAdapter : memoryAdapter;
}

/** PRD 12.2 default limits. */
export const LIMITS = {
  adminLogin: { limit: 5, windowSec: 15 * 60 },
  passwordResetAccount: { limit: 3, windowSec: 60 * 60 },
  passwordResetIp: { limit: 10, windowSec: 60 * 60 },
  contact: { limit: 5, windowSec: 10 * 60 },
  connection: { limit: 5, windowSec: 10 * 60 },
  corporate: { limit: 5, windowSec: 10 * 60 },
  coverageInterest: { limit: 10, windowSec: 60 * 60 },
  coverageLookup: { limit: 120, windowSec: 60 },
  chatSession: { limit: 10, windowSec: 60 * 60 },
  chatMessageConversation: { limit: 30, windowSec: 60 },
  chatMessageIp: { limit: 60, windowSec: 60 },
  adminMutation: { limit: 120, windowSec: 60 },
} as const;

export async function rateLimit(name: keyof typeof LIMITS, identity: string): Promise<RateLimitResult> {
  const { limit, windowSec } = LIMITS[name];
  return adapter().hit(`${name}:${identity}`, limit, windowSec);
}

/** Test helper: clears the in-memory limiter. */
export async function resetMemoryLimits() {
  memoryStore.clear();
}
