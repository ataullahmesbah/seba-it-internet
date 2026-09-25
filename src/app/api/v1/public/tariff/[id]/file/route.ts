import { NextResponse } from "next/server";
import { fail } from "@/lib/api/response";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { parseCloudinaryUrl, privateDownloadUrl } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";

const MAX_BYTES = 25 * 1024 * 1024;

async function tryFetch(url: string): Promise<Response | null> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(20000), cache: "no-store" });
        return res.ok && res.body ? res : null;
    } catch {
        return null;
    }
}

function safeFileName(name: string | null, fallback: string) {
    const base = (name || fallback).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "tariff.pdf";
    return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

/**
 * Serves an active tariff PDF from our own origin so it can be embedded and downloaded reliably.
 * Cloudinary files are fetched server-side; if public delivery is refused (e.g. PDF delivery restricted
 * on the account), a signed API download is used. Other hosts are simply redirected to.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/public/tariff/[id]/file">) {
    if (!(await rateLimit("coverageLookup", clientIp(req))).ok) return fail("RATE_LIMITED", "Too many requests.");
    const { id } = await ctx.params;
    const doc = await db.tariffDocument.findFirst({ where: { id, active: true } });
    if (!doc) return fail("NOT_FOUND", "Document not found.");

    const ref = parseCloudinaryUrl(doc.fileUrl);
    if (!ref) return NextResponse.redirect(doc.fileUrl, 302);

    let upstream = await tryFetch(doc.fileUrl);
    if (!upstream) {
        const signed = privateDownloadUrl(ref);
        if (signed) upstream = await tryFetch(signed);
    }
    if (!upstream) {
        logger.warn("tariff pdf fetch failed", { id, publicId: ref.publicId });
        return new NextResponse(
            "The PDF could not be loaded from storage. In Cloudinary open Settings → Security and enable “Allow delivery of PDF and ZIP files”, or check that CLOUDINARY_* keys belong to the same account.",
            { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
        );
    }
    const length = Number(upstream.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) return fail("VALIDATION_ERROR", "Document is too large.");

    const download = new URL(req.url).searchParams.get("download") === "1";
    const fileName = safeFileName(doc.fileName, ref.publicId.split("/").pop() ?? "tariff.pdf");
    const headers = new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
    });
    if (length) headers.set("Content-Length", String(length));
    return new NextResponse(upstream.body, { status: 200, headers });
}