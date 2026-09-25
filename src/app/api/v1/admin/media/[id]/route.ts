import type { MediaCategory } from "@prisma/client";
import { fail, ok, readJson } from "@/lib/api/response";
import { db } from "@/lib/db";
import { destroyAsset } from "@/lib/cloudinary";
import { withAdmin } from "@/server/admin/api";
import { mediaReferences, mediaSummary } from "@/server/admin/media";
import { audit } from "@/server/audit";
import { invalidate } from "@/server/revalidate";

const CATEGORIES = ["LOGO", "HERO", "BLOG", "REVIEW", "OFFICE", "PAYMENT_QR", "GENERAL"];

export async function GET(req: Request, ctx: RouteContext<"/api/v1/admin/media/[id]">) {
  return withAdmin(req, ["media.read", "media.manage"], async () => {
    const { id } = await ctx.params;
    const m = await db.media.findUnique({ where: { id } });
    if (!m) return fail("NOT_FOUND", "Media not found.");
    return ok({ ...mediaSummary(m), references: await mediaReferences(id) });
  });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/v1/admin/media/[id]">) {
  return withAdmin(req, "media.manage", async (admin) => {
    const { id } = await ctx.params;
    const b = (await readJson(req).catch(() => ({}))) as Record<string, unknown>;
    const data: { altEn?: string | null; altBn?: string | null; category?: MediaCategory } = {};
    if (typeof b.altEn === "string") data.altEn = b.altEn.trim().slice(0, 200) || null;
    if (typeof b.altBn === "string") data.altBn = b.altBn.trim().slice(0, 200) || null;
    if (typeof b.category === "string" && CATEGORIES.includes(b.category)) data.category = b.category as MediaCategory;
    const m = await db.media.update({ where: { id }, data }).catch(() => null);
    if (!m) return fail("NOT_FOUND", "Media not found.");
    await audit(admin.userId, "media.update", "Media", id, { changedFields: Object.keys(data) });
    invalidate("brand", "pages", "blog", "corporate", "payments", "reviews", "offers", "seo");
    return ok(mediaSummary(m));
  });
}

/** Deleting referenced media is blocked to avoid broken public pages (PRD 16.2). */
export async function DELETE(req: Request, ctx: RouteContext<"/api/v1/admin/media/[id]">) {
  return withAdmin(req, "media.manage", async (admin) => {
    const { id } = await ctx.params;
    const m = await db.media.findUnique({ where: { id } });
    if (!m) return fail("NOT_FOUND", "Media not found.");
    const refs = await mediaReferences(id);
    if (refs.length) return fail("CONFLICT", `This image is in use (${refs.join(", ")}). Replace it there first.`);
    await destroyAsset(m.publicId).catch(() => false);
    await db.media.delete({ where: { id } });
    await audit(admin.userId, "media.delete", "Media", id, { publicId: m.publicId });
    return ok({ deleted: true });
  });
}
