import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * RealtimeAdapter — Ably by default (REST publish + signed token requests, no SDK on the server).
 * PostgreSQL remains the source of truth; clients fall back to polling when this is disabled or failing.
 */
export interface RealtimeAdapter {
  enabled: boolean;
  publish(channel: string, event: string, data: unknown): Promise<void>;
  createTokenRequest(clientId: string, capability: Record<string, string[]>): Promise<unknown>;
}

export function channelName(kind: "chat" | "admin-notifications" | "admin-chat-queue", id?: string): string {
  const prefix = env.siteKey;
  if (kind === "chat") return `${prefix}:chat:${id}`;
  if (kind === "admin-notifications") return `${prefix}:admin:notifications:${id}`;
  return `${prefix}:admin:chat:queue`;
}

const disabled: RealtimeAdapter = {
  enabled: false,
  async publish() {},
  async createTokenRequest() {
    return null;
  },
};

function ably(apiKey: string): RealtimeAdapter {
  const [keyName, keySecret] = apiKey.split(":");
  return {
    enabled: true,
    async publish(channel, event, data) {
      try {
        const res = await fetch(`https://rest.ably.io/channels/${encodeURIComponent(channel)}/messages`, {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(apiKey).toString("base64"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: event, data }),
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`ably ${res.status}`);
      } catch (err) {
        logger.warn("realtime publish failed", { provider: "ably", channel, event, error: String(err) });
      }
    },
    async createTokenRequest(clientId, capability) {
      // Signed TokenRequest (https://ably.com/docs/auth/token) — secret never leaves the server.
      const ttl = 60 * 60 * 1000;
      const timestamp = Date.now();
      const nonce = randomBytes(16).toString("hex");
      const cap = JSON.stringify(capability);
      const signText = [keyName, ttl, cap, clientId, timestamp, nonce].join("\n") + "\n";
      const mac = createHmac("sha256", keySecret).update(signText).digest("base64");
      return { keyName, ttl, capability: cap, clientId, timestamp, nonce, mac };
    },
  };
}

export function realtime(): RealtimeAdapter {
  const key = env.ablyApiKey;
  return key && key.includes(":") ? ably(key) : disabled;
}
