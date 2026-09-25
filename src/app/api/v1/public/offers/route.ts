import { ok } from "@/lib/api/response";
import { getActiveOffers } from "@/server/public-data";

export async function GET() {
  return ok(await getActiveOffers(), undefined, { cache: true });
}
