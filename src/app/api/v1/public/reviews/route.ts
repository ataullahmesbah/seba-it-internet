import { ok } from "@/lib/api/response";
import { getReviews } from "@/server/public-data";

export async function GET() {
  return ok(await getReviews(), undefined, { cache: true });
}
