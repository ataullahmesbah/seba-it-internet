import "server-only";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, type AppLocale, type Dictionary } from "@/lib/i18n";

export async function resolveLocale(params: Promise<{ locale: string }>): Promise<{ locale: AppLocale; dict: Dictionary }> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, dict: getDictionary(locale) };
}
