"use client";

/**
 * Browser realtime helper. Fetches a scoped token request from our server and connects to Ably.
 * Returns null when realtime is disabled — callers then rely on polling (DB is the source of truth).
 */
export interface RealtimeHandle {
  subscribe(channel: string, cb: (event: string, data: unknown) => void): void;
  onStateChange(cb: (connected: boolean) => void): void;
  close(): void;
}

export async function connectRealtime(scope: "visitor" | "admin"): Promise<{ handle: RealtimeHandle; meta: unknown } | null> {
  const url = `/api/v1/realtime/token${scope === "admin" ? "?scope=admin" : ""}`;
  const first = await fetch(url, { method: "POST" }).then((r) => r.json()).catch(() => null);
  if (!first?.success || !first.data?.enabled) return null;
  const Ably = await import("ably");
  let pending: unknown = first.data.tokenRequest;
  const client = new Ably.Realtime({
    authCallback: async (_params, callback) => {
      try {
        if (pending) {
          const tr = pending;
          pending = null;
          callback(null, tr as never);
          return;
        }
        const res = await fetch(url, { method: "POST" }).then((r) => r.json());
        callback(null, res.data.tokenRequest);
      } catch (e) {
        callback(String(e), null);
      }
    },
  });
  const handle: RealtimeHandle = {
    subscribe(channel, cb) {
      client.channels.get(channel).subscribe((msg) => cb(msg.name ?? "", msg.data));
    },
    onStateChange(cb) {
      client.connection.on((change) => cb(change.current === "connected"));
    },
    close() {
      client.close();
    },
  };
  return { handle, meta: first.data.channels };
}
