import { ok } from "@/lib/api/response";
import { getOffices } from "@/server/public-data";

export async function GET() {
  return ok(await getOffices(), undefined, { cache: true });
}
