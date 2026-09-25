import "server-only";

/**
 * Central, typed access to environment configuration.
 * Feature code must read configuration through this module, never process.env directly.
 */
function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : undefined;
}

export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  get appUrl() {
    return (opt("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
  },
  /** Deployment/site key used to namespace external provider folders/channels. */
  get siteKey() {
    return opt("SITE_KEY") ?? "seba-it";
  },
  /** Staging/preview deployments must never be indexed. */
  get indexingAllowed() {
    if (opt("ALLOW_INDEXING") === "false") return false;
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
    return true;
  },
  get sessionSecret() {
    const v = opt("SESSION_SECRET");
    if (!v) {
      if (this.isProd) throw new Error("SESSION_SECRET is required");
      return "dev-only-session-secret-change-me-0000000000000000";
    }
    return v;
  },
  get encryptionKey() {
    const v = opt("APP_ENCRYPTION_KEY");
    if (!v) {
      if (this.isProd) throw new Error("APP_ENCRYPTION_KEY is required");
      return "dev-only-encryption-key-change-me-00000000000000000";
    }
    return v;
  },
  cloudinary: {
    get cloudName() { return opt("CLOUDINARY_CLOUD_NAME"); },
    get apiKey() { return opt("CLOUDINARY_API_KEY"); },
    get apiSecret() { return opt("CLOUDINARY_API_SECRET"); },
    get enabled() {
      return Boolean(opt("CLOUDINARY_CLOUD_NAME") && opt("CLOUDINARY_API_KEY") && opt("CLOUDINARY_API_SECRET"));
    },
  },
  email: {
    get resendApiKey() { return opt("RESEND_API_KEY"); },
    get from() { return opt("EMAIL_FROM"); },
    get supportTo() { return opt("EMAIL_SUPPORT_TO"); },
  },
  get ablyApiKey() { return opt("ABLY_API_KEY"); },
  upstash: {
    get url() { return opt("UPSTASH_REDIS_REST_URL"); },
    get token() { return opt("UPSTASH_REDIS_REST_TOKEN"); },
  },
  turnstile: {
    get siteKey() { return opt("TURNSTILE_SITE_KEY"); },
    get secretKey() { return opt("TURNSTILE_SECRET_KEY"); },
  },
};
