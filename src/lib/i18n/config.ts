export const LOCALES = ["en", "bn"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "seba_locale";

export function isLocale(v: string | undefined | null): v is AppLocale {
  return v === "en" || v === "bn";
}

/** Locale-aware internal link: English unprefixed, Bangla under /bn. External/absolute URLs pass through. */
export function localizedHref(href: string, locale: AppLocale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href.startsWith("/admin") || href.startsWith("/api")) return href;
  const clean = stripLocale(href);
  if (locale === "en") return clean;
  return clean === "/" ? "/bn" : `/bn${clean}`;
}

export function stripLocale(pathname: string): string {
  if (pathname === "/bn" || pathname === "/en") return "/";
  if (pathname.startsWith("/bn/") || pathname.startsWith("/en/")) return pathname.slice(3);
  return pathname || "/";
}

/** Pick a bilingual field value: pick(obj, "title", "bn") → obj.titleBn */
export function pick<T extends object>(obj: T | null | undefined, base: string, locale: AppLocale): string {
  if (!obj) return "";
  const key = base + (locale === "bn" ? "Bn" : "En");
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

export function pickList<T extends object>(obj: T | null | undefined, base: string, locale: AppLocale): string[] {
  if (!obj) return [];
  const v = (obj as Record<string, unknown>)[base + (locale === "bn" ? "Bn" : "En")];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
}
