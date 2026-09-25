import Image from "next/image";
import type { SiteDTO } from "@/server/public-data";

/** Default brand mark (used until an ISP uploads its own logo). Generic — contains no brand text. */
export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-accent)" />
          <stop offset="1" stopColor="var(--brand-primary)" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="none" stroke="url(#bm-g)" strokeWidth="4" strokeDasharray="100 32" strokeLinecap="round" transform="rotate(-40 24 24)" />
      <path d="M15 24.5a12.5 12.5 0 0 1 18 0" fill="none" stroke="var(--brand-primary)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M19 28.5a6.8 6.8 0 0 1 10 0" fill="none" stroke="var(--brand-accent)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="24" cy="33" r="2.6" fill="var(--brand-primary)" />
    </svg>
  );
}

export function Logo({ site, variant = "dark", compact = false }: { site: SiteDTO; variant?: "dark" | "light"; compact?: boolean }) {
  const media = variant === "light" ? site.logoDark ?? site.logoLight : site.logoLight;
  if (media) {
    return (
      <Image
        src={media.url}
        alt={site.companyName}
        width={media.width ?? 180}
        height={media.height ?? 48}
        className="h-10 w-auto"
        priority
      />
    );
  }
  const words = site.shortName.split(" ");
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="leading-none">
        <span className={`block text-lg font-extrabold tracking-tight ${variant === "light" ? "text-white" : "text-navy"}`}>
          {words.slice(0, 2).join(" ")}
        </span>
        {!compact && (
          <span className={`mt-0.5 block text-[10px] font-semibold tracking-[0.3em] uppercase ${variant === "light" ? "text-accent" : "text-primary"}`}>
            {site.companyName.replace(site.shortName, "").trim() || "Internet"}
          </span>
        )}
      </span>
    </span>
  );
}
