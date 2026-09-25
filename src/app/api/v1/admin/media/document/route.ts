import { fail, ok, readJson } from "@/lib/api/response";
import { env } from "@/lib/env";
import { MAX_DOCUMENT_BYTES, destroyAsset, verifyUploadResponse } from "@/lib/cloudinary";
import { withAdmin } from "@/server/admin/api";
import { fetchCloudinaryResource } from "@/server/admin/media";
import { audit } from "@/server/audit";

/** Verify a signed PDF (raw) upload and return its delivery URL. */
export async function POST(req: Request) {
  return withAdmin(req, ["packages.manage", "media.manage", "media.read"], async (ctx) => {
    if (!env.cloudinary.enabled) return fail("PROVIDER_ERROR", "Cloudinary is not configured.");
    const b = (await readJson(req).catch(() => ({}))) as Record<string, unknown>;
    const publicId = String(b.publicId ?? "");
    const version = String(b.version ?? "");
    const signature = String(b.signature ?? "");
    if (!publicId || !verifyUploadResponse(publicId, version, signature)) return fail("VALIDATION_ERROR", "Upload signature could not be verified.");
    if (!publicId.startsWith(`${env.siteKey}/document/`)) return fail("VALIDATION_ERROR", "Asset is outside this site's document folder.");
    const meta = await fetchCloudinaryResource(publicId, "raw");
    if (!meta) return fail("PROVIDER_ERROR", "Could not read the uploaded file from Cloudinary.");
    if (!publicId.toLowerCase().endsWith(".pdf") || meta.bytes > MAX_DOCUMENT_BYTES) {
      await destroyAsset(publicId, "raw").catch(() => false);
      return fail("VALIDATION_ERROR", "Only PDF files up to 15 MB are allowed.");
    }
    await audit(ctx.userId, "document.upload", "Document", publicId);
    return ok({ url: meta.secure_url, bytes: meta.bytes }, undefined, { status: 201 });
  });
}
