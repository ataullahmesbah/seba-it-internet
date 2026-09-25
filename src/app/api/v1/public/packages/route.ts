import { ok } from "@/lib/api/response";
import { getPackages } from "@/server/public-data";

export async function GET() {
  return ok(await getPackages(), undefined, { cache: true });
}
