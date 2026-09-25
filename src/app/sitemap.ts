import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { localizedHref } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const STATIC = ["/", "/packages", "/corporate", "/coverage", "/pay-bill", "/blog", "/about", "/support", "/contact", "/get-connection", "/privacy", "/terms", "/payment-policy"];

/** English + Bangla public routes and published blog posts only (PRD 17.1). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!env.indexingAllowed) return [];
  const [posts, noindex, tariffs] = await Promise.all([
    db.blogPost.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
    db.seoEntry.findMany({ where: { indexable: false }, select: { routeKey: true } }),
    db.tariffDocument.count({ where: { active: true } }),
  ]);
  const hidden = new Set(noindex.map((n) => n.routeKey));
  const entry = (path: string, lastModified?: Date): MetadataRoute.Sitemap => {
    const en = env.appUrl + localizedHref(path, "en");
    const bn = env.appUrl + localizedHref(path, "bn");
    const alternates = { languages: { "en-BD": en, "bn-BD": bn } };
    return [
      { url: en, lastModified, alternates },
      { url: bn, lastModified, alternates },
    ];
  };
  return [
    ...[...STATIC, ...(tariffs > 0 ? ["/tariff"] : [])].filter((p) => !hidden.has(p === "/" ? "home" : p.slice(1))).flatMap((p) => entry(p)),
    ...posts.filter((p) => !hidden.has(`blog:${p.slug}`)).flatMap((p) => entry(`/blog/${p.slug}`, p.updatedAt)),
  ];
}
