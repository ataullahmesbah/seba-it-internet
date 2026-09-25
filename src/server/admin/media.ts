import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export function mediaSummary(m: { id: string; secureUrl: string; filename: string | null; publicId: string; width: number | null; height: number | null; bytes: number; category: string; altEn: string | null; altBn: string | null; format: string; createdAt: Date }) {
  return {
    id: m.id,
    url: m.secureUrl,
    filename: m.filename ?? m.publicId.split("/").pop() ?? m.publicId,
    publicId: m.publicId,
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    format: m.format,
    category: m.category,
    altEn: m.altEn,
    altBn: m.altBn,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Where is this asset used? Deletion is blocked while any active content references it. */
export async function mediaReferences(id: string): Promise<string[]> {
  const m = await db.media.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          brandLogoLight: true, brandLogoDark: true, brandFavicon: true, brandDefaultOg: true, seoEntries: true, corporateServices: true,
          paymentQrs: true, paymentLogos: true, blogFeatured: true, blogOg: true, reviews: true, offers: true,
        },
      },
    },
  });
  if (!m) return [];
  const refs: string[] = [];
  const c = m._count;
  if (c.brandLogoLight + c.brandLogoDark + c.brandFavicon + c.brandDefaultOg) refs.push("Brand settings");
  if (c.seoEntries) refs.push(`${c.seoEntries} SEO entr${c.seoEntries === 1 ? "y" : "ies"}`);
  if (c.corporateServices) refs.push(`${c.corporateServices} corporate service(s)`);
  if (c.paymentQrs + c.paymentLogos) refs.push("Payment methods");
  if (c.blogFeatured + c.blogOg) refs.push(`${c.blogFeatured + c.blogOg} blog post(s)`);
  if (c.reviews) refs.push(`${c.reviews} review(s)`);
  if (c.offers) refs.push(`${c.offers} offer(s)`);
  const sections = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*)::bigint AS n FROM "PageSection" WHERE data::text LIKE ${"%" + id + "%"}`;
  const n = Number(sections[0]?.n ?? 0);
  if (n) refs.push(`${n} page section(s)`);
  return refs;
}

/** Authoritative asset metadata from the Cloudinary Admin API (never trust client-declared size/format). */
export async function fetchCloudinaryResource(publicId: string, resourceType: "image" | "raw" = "image"): Promise<{ secure_url: string; format: string; width: number; height: number; bytes: number; resource_type: string } | null> {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64") },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}
