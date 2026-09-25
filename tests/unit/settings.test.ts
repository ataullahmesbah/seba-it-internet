import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: () => {} }));
vi.mock("@/lib/db", () => ({ db: {} }));

const { isChatOnline, DEFAULT_GENERAL } = await import("@/server/settings");

describe("chat availability window (Asia/Dhaka)", () => {
  const s = { ...DEFAULT_GENERAL, chatOnlineHoursStart: 9, chatOnlineHoursEnd: 22 };
  it("is online during business hours", () => {
    expect(isChatOnline(s, new Date("2026-01-01T06:00:00Z"))).toBe(true); // 12:00 Dhaka
  });
  it("is offline at night", () => {
    expect(isChatOnline(s, new Date("2026-01-01T20:00:00Z"))).toBe(false); // 02:00 Dhaka
  });
  it("supports overnight windows", () => {
    const n = { ...s, chatOnlineHoursStart: 20, chatOnlineHoursEnd: 4 };
    expect(isChatOnline(n, new Date("2026-01-01T20:00:00Z"))).toBe(true);
  });
});
