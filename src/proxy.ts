import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (formerly middleware):
 *  - English is canonical & unprefixed; internally rewritten to /en/*. Bangla lives under /bn/*.
 *  - /en/* URLs redirect to their unprefixed canonical form.
 *  - Optimistic admin gate (real auth is enforced server-side on every request/action).
 *  - Per-request CSP nonce + request id.
 */
const ADMIN_PUBLIC = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];
const SESSION_COOKIES = ["__Host-seba_admin", "seba_admin"];

function csp(nonce: string, https: boolean) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.cloudinary.com https://*.ably.io https://*.ably-realtime.com wss://*.ably.io wss://*.ably-realtime.com https://*.ably.net wss://*.ably.net",
    "frame-src 'self' https://res.cloudinary.com https://www.google.com https://maps.google.com https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const hasCookie = SESSION_COOKIES.some((c) => request.cookies.has(c));
    if (!hasCookie && !ADMIN_PUBLIC.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const https = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const policy = csp(nonce, https);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-request-id", request.headers.get("x-request-id") ?? crypto.randomUUID());
  requestHeaders.set("x-pathname", pathname);

  let response: NextResponse;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isBn = pathname === "/bn" || pathname.startsWith("/bn/");
  if (isAdmin || isBn) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname === "/" ? "" : pathname}`;
    url.search = search;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  response.headers.set("Content-Security-Policy", policy);
  if (isAdmin) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Prefetch requests must also pass through so locale rewrites apply to them.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
