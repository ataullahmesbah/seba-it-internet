import { fail, ok } from "@/lib/api/response";
import { clientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { getCoverageTree } from "@/server/public-data";

export async function GET(req: Request) {
  if (!(await rateLimit("coverageLookup", clientIp(req))).ok) return fail("RATE_LIMITED", "Too many requests.");
  const districtId = new URL(req.url).searchParams.get("districtId");
  if (!districtId) return fail("VALIDATION_ERROR", "districtId is required.", { districtId: "required" });
  const d = (await getCoverageTree()).find((x) => x.id === districtId);
  return ok(d ? d.thanas.map((t) => ({ id: t.id, nameEn: t.nameEn, nameBn: t.nameBn })) : [], undefined, { cache: true });
}
