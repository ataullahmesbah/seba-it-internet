import "server-only";
import type { Metadata } from "next";
import { env } from "@/lib/env";
import { localizedHref, type AppLocale } from "@/lib/i18n";
import { getSeoEntry, getSite } from "@/server/public-data";

/**
 * Per-route metadata with global fallback, canonical (same-locale), hreflang pairs
 * (en-BD / bn-BD + x-default → English), OG image (page → brand default), robots.
 */
export async function buildMetadata(opts: {
  routeKey: string;
  path: string; // unprefixed canonical path, e.g. "/packages"
  locale: AppLocale;
  title?: string;
  description?: string;
  image?: string | null;
  type?: "website" | "article";
  noindex?: boolean;
}): Promise<Metadata> {
  const [site, seo] = await Promise.all([getSite(), getSeoEntry(opts.routeKey)]);
  const bn = opts.locale === "bn";
  const seoTitle = bn ? seo?.titleBn : seo?.titleEn;
  const seoDesc = bn ? seo?.descriptionBn : seo?.descriptionEn;
  const title = seoTitle || opts.title || site.companyName;
  const description = seoDesc || opts.description || (bn ? site.descriptionBn || site.taglineBn : site.descriptionEn || site.taglineEn) || "";
  const image = seo?.og?.url || opts.image || site.defaultOg?.url || undefined;
  const indexable = env.indexingAllowed && !opts.noindex && (seo ? seo.indexable : true);
  const url = (l: AppLocale) => env.appUrl + localizedHref(opts.path, l);
  return {
    title: opts.routeKey === "home" && !seoTitle ? { absolute: `${site.companyName}${site.taglineEn && !bn ? " — " + site.taglineEn : bn && site.taglineBn ? " — " + site.taglineBn : ""}` } : title,
    description,
    alternates: {
      canonical: url(opts.locale),
      languages: { "en-BD": url("en"), "bn-BD": url("bn"), "x-default": url("en") },
    },
    openGraph: {
      type: opts.type ?? "website",
      title,
      description,
      url: url(opts.locale),
      siteName: site.companyName,
      locale: bn ? "bn_BD" : "en_BD",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}
