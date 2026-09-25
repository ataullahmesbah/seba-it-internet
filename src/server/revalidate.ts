import "server-only";
import { revalidateTag } from "next/cache";

export type CacheTag =
  | "brand" | "navigation" | "pages" | "seo" | "packages" | "corporate" | "coverage" | "payments"
  | "faq" | "reviews" | "offers" | "offices" | "blog" | "settings" | "tariff";

/** Immediately expire public cache tags after a successful admin mutation. */
export function invalidate(...tags: CacheTag[]) {
  for (const t of new Set(tags)) revalidateTag(t, { expire: 0 });
}
