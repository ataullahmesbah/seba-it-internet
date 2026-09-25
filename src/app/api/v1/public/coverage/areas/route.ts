import { fail, ok } from "@/lib/api/response";
import { clientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { getCoverageTree } from "@/server/public-data";

export async function GET(req: Request) {
  if (!(await rateLimit("coverageLookup", clientIp(req))).ok) return fail("RATE_LIMITED", "Too many requests.");
  const thanaId = new URL(req.url).searchParams.get("thanaId");
  if (!thanaId) return fail("VALIDATION_ERROR", "thanaId is required.", { thanaId: "required" });
  for (const d of await getCoverageTree()) {
    const t = d.thanas.find((x) => x.id === thanaId);
    if (t) return ok(t.areas, undefined, { cache: true });
  }
  return ok([], undefined, { cache: true });
}
