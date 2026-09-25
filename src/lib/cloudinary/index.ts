import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/** Cloudinary adapter — signed uploads only; API secret never leaves the server. */
export const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "avif"] as const;
export const SMALL_CATEGORIES = new Set(["LOGO", "PAYMENT_QR", "REVIEW"]);
export const MAX_BYTES = { small: 2 * 1024 * 1024, general: 8 * 1024 * 1024 };

function sign(params: Record<string, string | number>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + env.cloudinary.apiSecret).digest("hex");
}

export function folderFor(category: string) {
  return `${env.siteKey}/${category.toLowerCase()}`;
}

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export function signUpload(category: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  // PDFs are uploaded as "raw" resources (always deliverable, not transformed); images keep format restrictions.
  const params: Record<string, string | number> =
    category === "DOCUMENT" ? { timestamp, folder: folderFor(category) } : { timestamp, folder: folderFor(category), allowed_formats: ALLOWED_FORMATS.join(",") };
  return {
    cloudName: env.cloudinary.cloudName!,
    apiKey: env.cloudinary.apiKey!,
    signature: sign(params),
    ...params,
  };
}

/** Verifies the signature Cloudinary returns with a successful upload (public_id + version). */
export function verifyUploadResponse(publicId: string, version: number | string, signature: string): boolean {
  const expected = createHash("sha1")
    .update(`public_id=${publicId}&version=${version}` + env.cloudinary.apiSecret)
    .digest("hex");
  return expected === signature;
}

export async function destroyAsset(publicId: string, resourceType: "image" | "raw" = "image"): Promise<boolean> {
  if (!env.cloudinary.enabled) return false;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp });
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: env.cloudinary.apiKey!,
    signature,
  });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${resourceType}/destroy`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}



export interface CloudinaryAssetRef {
  cloudName: string;
  resourceType: "image" | "raw";
  publicId: string;
  format: string | null;
}

/**
 * Parse a Cloudinary delivery URL:
 *   https://res.cloudinary.com/<cloud>/<image|raw>/upload/[transformations/][v123/]<public_id>
 * For raw assets the extension is part of the public id; for image assets it is the format.
 */
export function parseCloudinaryUrl(url: string): CloudinaryAssetRef | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "res.cloudinary.com") return null;
  const parts = u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const [cloudName, resourceType, deliveryType, ...rest] = parts;
  if (!cloudName || (resourceType !== "image" && resourceType !== "raw") || deliveryType !== "upload" || rest.length === 0) return null;
  // Skip optional transformation segments (contain "," or "_" params like "fl_attachment") and the version.
  let i = 0;
  while (i < rest.length - 1 && (/^v\d+$/.test(rest[i]) || /^[a-z]{1,3}_/.test(rest[i]) || rest[i].includes(","))) i++;
  const tail = rest.slice(i).join("/");
  if (resourceType === "raw") return { cloudName, resourceType, publicId: tail, format: null };
  const dot = tail.lastIndexOf(".");
  return dot > 0 ? { cloudName, resourceType, publicId: tail.slice(0, dot), format: tail.slice(dot + 1) } : { cloudName, resourceType, publicId: tail, format: null };
}

/** Signed, API-authenticated download URL (works even when public PDF delivery is restricted on the account). */
export function privateDownloadUrl(ref: CloudinaryAssetRef): string | null {
  if (!env.cloudinary.enabled || ref.cloudName !== env.cloudinary.cloudName) return null;
  const params: Record<string, string | number> = { public_id: ref.publicId, timestamp: Math.floor(Date.now() / 1000), type: "upload" };
  if (ref.format) params.format = ref.format;
  const signature = sign(params);
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: env.cloudinary.apiKey!, signature });
  return `https://api.cloudinary.com/v1_1/${ref.cloudName}/${ref.resourceType}/download?${qs}`;
}