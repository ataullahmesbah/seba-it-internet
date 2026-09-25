import { ok } from "@/lib/api/response";
import { getPaymentMethods } from "@/server/public-data";

export async function GET() {
  return ok(await getPaymentMethods(), undefined, { cache: true });
}
