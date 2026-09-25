import type { AppLocale } from "@/lib/i18n/config";

export type Data = Record<string, unknown> | undefined;

/** Localized string from section JSON: s(data, "headline", "bn") → data.headlineBn */
export function s(data: Data, key: string, locale: AppLocale): string {
  if (!data) return "";
  const v = data[key + (locale === "bn" ? "Bn" : "En")];
  return typeof v === "string" ? v : "";
}

/** Non-localized string. */
export function raw(data: Data, key: string): string {
  const v = data?.[key];
  return typeof v === "string" ? v : "";
}

export function lines(data: Data, key: string, locale: AppLocale): string[] {
  const v = data?.[key + (locale === "bn" ? "Bn" : "En")];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
}

export interface RepeaterRow {
  [k: string]: string;
}

export function rows(data: Data, key: string): RepeaterRow[] {
  const v = data?.[key];
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as RepeaterRow[]) : [];
}

export function rs(row: RepeaterRow, key: string, locale: AppLocale): string {
  return row[key + (locale === "bn" ? "Bn" : "En")] || "";
}
