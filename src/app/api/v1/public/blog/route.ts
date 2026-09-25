import { ok } from "@/lib/api/response";
import { getBlogList } from "@/server/public-data";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Math.min(1000, Number(sp.get("page")) || 1));
  const pageSize = Math.max(1, Math.min(50, Number(sp.get("pageSize")) || 9));
  const category = sp.get("category")?.slice(0, 100) || null;
  const q = sp.get("q")?.slice(0, 100) || null;
  const { total, posts } = await getBlogList(page, pageSize, category, q);
  return ok(posts, { page, pageSize, total }, { cache: true });
}
