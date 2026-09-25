import { fail, ok } from "@/lib/api/response";
import { getPostBySlug } from "@/server/public-data";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/public/blog/[slug]">) {
  const { slug } = await ctx.params;
  const post = await getPostBySlug(slug);
  return post ? ok(post, undefined, { cache: true }) : fail("NOT_FOUND", "Post not found.");
}
