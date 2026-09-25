import { ok } from "@/lib/api/response";
import { getFaqs } from "@/server/public-data";

export async function GET() {
  return ok(await getFaqs(), undefined, { cache: true });
}
