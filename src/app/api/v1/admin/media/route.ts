import type { MediaCategory, Prisma } from "@prisma/client";
import { fail, ok, readJson } from "@/lib/api/response";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ALLOWED_FORMATS, MAX_BYTES, SMALL_CATEGORIES, destroyAsset, folderFor, verifyUploadResponse } from "@/lib/cloudinary";
import { withAdmin } from "@/server/admin/api";
import { fetchCloudinaryResource, mediaSummary } from "@/server/admin/media";
import { audit } from "@/server/audit";

const CATEGORIES = ["LOGO", "HERO", "BLOG", "REVIEW", "OFFICE", "PAYMENT_QR", "GENERAL"];

export async function GET(req: Request) {
  return withAdmin(req, ["media.read", "media.manage"], async () => {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(60, Number(sp.get("pageSize")) || 24);
    const category = sp.get("category");
    const q = sp.get("q")?.trim().slice(0, 100);
    const where: Prisma.MediaWhereInput = {
      ...(category && CATEGORIES.includes(category) ? { category: category as MediaCategory } : {}),
      ...(q ? { OR: [{ filename: { contains: q, mode: "insensitive" } }, { publicId: { contains: q, mode: "insensitive" } }, { altEn: { contains: q, mode: "insensitive" } }] } : {}),
    };
    const [total, rows] = await Promise.all([db.media.count({ where }), db.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize })]);
    return ok(rows.map(mediaSummary), { page, pageSize, total, uploadsEnabled: env.cloudinary.enabled });
  });
}

/** Register an uploaded asset after verifying Cloudinary's signature and reading authoritative metadata. */
export async function POST(req: Request) {
  return withAdmin(req, ["media.read", "media.manage"], async (ctx) => {
    if (!env.cloudinary.enabled) return fail("PROVIDER_ERROR", "Cloudinary is not configured.");
    const b = (await readJson(req).catch(() => ({}))) as Record<string, unknown>;
    const publicId = String(b.publicId ?? "");
    const version = String(b.version ?? "");
    const signature = String(b.signature ?? "");
    const category = CATEGORIES.includes(String(b.category)) ? String(b.category) : "GENERAL";
    if (!publicId || !version || !signature || !verifyUploadResponse(publicId, version, signature)) return fail("VALIDATION_ERROR", "Upload signature could not be verified.");
    if (!publicId.startsWith(env.siteKey + "/")) return fail("VALIDATION_ERROR", "Asset is outside this site's folder.");
    const meta = await fetchCloudinaryResource(publicId);
    if (!meta) return fail("PROVIDER_ERROR", "Could not read the uploaded asset from Cloudinary.");
    const max = SMALL_CATEGORIES.has(category) ? MAX_BYTES.small : MAX_BYTES.general;
    if (!(ALLOWED_FORMATS as readonly string[]).includes(meta.format) || meta.resource_type !== "image" || meta.bytes > max) {
      await destroyAsset(publicId).catch(() => false);
      return fail("VALIDATION_ERROR", `Only JPEG, PNG, WebP or AVIF images up to ${Math.round(max / 1024 / 1024)} MB are allowed.`);
    }
    const media = await db.media.upsert({
      where: { publicId },
      update: {},
      create: {
        publicId,
        secureUrl: meta.secure_url,
        resourceType: "image",
        format: meta.format,
        width: meta.width,
        height: meta.height,
        bytes: meta.bytes,
        filename: String(b.filename ?? "").slice(0, 200) || null,
        altEn: String(b.altEn ?? "").slice(0, 200) || null,
        altBn: String(b.altBn ?? "").slice(0, 200) || null,
        category: category as MediaCategory,
        createdBy: ctx.userId,
      },
    });
    await audit(ctx.userId, "media.create", "Media", media.id, { folder: folderFor(category) });
    return ok(mediaSummary(media), undefined, { status: 201 });
  });
}
