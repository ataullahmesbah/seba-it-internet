import { fail, ok, readJson } from "@/lib/api/response";
import { env } from "@/lib/env";
import { signUpload, MAX_BYTES, MAX_DOCUMENT_BYTES, SMALL_CATEGORIES } from "@/lib/cloudinary";
import { withAdmin } from "@/server/admin/api";

const CATEGORIES = ["LOGO", "HERO", "BLOG", "REVIEW", "OFFICE", "PAYMENT_QR", "GENERAL", "DOCUMENT"];

/** Server-authorized signature for a direct browser → Cloudinary upload. The API secret never leaves the server. */
export async function POST(req: Request) {
  return withAdmin(req, ["media.read", "media.manage"], async () => {
    if (!env.cloudinary.enabled) return fail("PROVIDER_ERROR", "Cloudinary is not configured. Set CLOUDINARY_* environment variables.");
    const body = (await readJson(req).catch(() => ({}))) as { category?: string };
    const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "GENERAL";
    return ok({ ...signUpload(category), category, maxBytes: category === "DOCUMENT" ? MAX_DOCUMENT_BYTES : SMALL_CATEGORIES.has(category) ? MAX_BYTES.small : MAX_BYTES.general });
  });
}
