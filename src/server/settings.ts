import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

import { DEFAULT_GENERAL, DEFAULT_SECURITY, type GeneralSettings, type SecuritySettings } from "@/features/settings-defaults";

export { DEFAULT_GENERAL, DEFAULT_SECURITY, type GeneralSettings, type SecuritySettings };

async function readSetting<T extends object>(key: string, defaults: T): Promise<T> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  const value = (row?.value ?? {}) as Partial<T>;
  return { ...defaults, ...value };
}

export const getGeneralSettings = unstable_cache(
  () => readSetting<GeneralSettings>("general", DEFAULT_GENERAL),
  ["settings-general"],
  { tags: ["settings"] },
);

export const getSecuritySettings = unstable_cache(
  () => readSetting<SecuritySettings>("security", DEFAULT_SECURITY),
  ["settings-security"],
  { tags: ["settings"] },
);

export function isChatOnline(s: GeneralSettings, now = new Date()): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }).format(now));
  const { chatOnlineHoursStart: a, chatOnlineHoursEnd: b } = s;
  if (a === b) return true;
  return a < b ? hour >= a && hour < b : hour >= a || hour < b;
}
