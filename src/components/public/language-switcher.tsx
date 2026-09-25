"use client";

import Link from "@/components/public/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOCALE_COOKIE, localizedHref, stripLocale, type AppLocale } from "@/lib/i18n/config";

function rememberLocale(l: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

/** EN / বাংলা switcher that maps the current route to its locale equivalent (keeps query params). */
export function LanguageSwitcher({ locale, compact, dark }: { locale: AppLocale; compact?: boolean; dark?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const base = stripLocale(pathname);
  const qs = search.toString();
  const hrefFor = (l: AppLocale) => localizedHref(base, l) + (qs ? `?${qs}` : "");
  return (
    <div
      className={cn("flex items-center rounded-full border p-0.5 text-xs font-semibold", dark ? "border-white/25" : "border-line")}
      role="group"
      aria-label="Language"
    >
      {(["en", "bn"] as const).map((l) => (
        <Link
          key={l}
          href={hrefFor(l)}
          onClick={() => rememberLocale(l)}
          hrefLang={l === "en" ? "en-BD" : "bn-BD"}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          className={cn(
            "inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2.5 transition-colors",
            l === locale ? "bg-primary text-white" : dark ? "text-white/80 hover:text-white" : "text-slate-600 hover:text-primary",
          )}
        >
          {l === "en" ? "EN" : compact ? "বাং" : "বাংলা"}
        </Link>
      ))}
    </div>
  );
}
