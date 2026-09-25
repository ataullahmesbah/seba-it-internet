import { fail, ok } from "@/lib/api/response";
import { clientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { getCoverageTree } from "@/server/public-data";

export async function GET(req: Request) {
  if (!(await rateLimit("coverageLookup", clientIp(req))).ok) return fail("RATE_LIMITED", "Too many requests.");
  const tree = await getCoverageTree();
  return ok(tree.map((d) => ({ id: d.id, nameEn: d.nameEn, nameBn: d.nameBn })), undefined, { cache: true });
}
