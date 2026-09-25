import { ok } from "@/lib/api/response";
import { getActiveOffers, getFeaturedPackages, getPageSections } from "@/server/public-data";

export async function GET() {
  const [page, packages, offers] = await Promise.all([getPageSections("home"), getFeaturedPackages(), getActiveOffers()]);
  return ok({ ...page, featuredPackages: packages, offer: offers[0] ?? null }, undefined, { cache: true });
}
