import { ok } from "@/lib/api/response";
import { getCorporateServices } from "@/server/public-data";

export async function GET() {
  return ok(await getCorporateServices(), undefined, { cache: true });
}
