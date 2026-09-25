export const dynamic = "force-dynamic";

import Link from "next/link";
import { Headphones, LockKeyhole, ShieldCheck } from "lucide-react";
import { getSite } from "@/server/public-data";
import { BrandMark } from "@/components/public/logo";
import { HeroNetworkArt } from "@/components/public/art";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  const brandVars = { "--brand-primary": site.primaryColor, "--brand-navy": site.secondaryColor, "--brand-accent": site.accentColor } as React.CSSProperties;
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]" style={brandVars}>
      {/* Brand panel */}
      <aside className="hero-bg relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <HeroNetworkArt className="absolute inset-x-0 bottom-0 h-2/3 w-full opacity-60" />
        <div className="relative flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <div>
            <p className="text-xl font-extrabold">{site.companyName}</p>
            <p className="text-xs tracking-[0.3em] text-accent uppercase">Staff Dashboard</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight font-extrabold">
            Manage your network,
            <span className="block text-accent">customers & content.</span>
          </h2>
          <p className="mt-4 text-white/75">Packages, coverage, leads, live chat and website content — all in one secure place.</p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><ShieldCheck className="h-4 w-4 text-accent" /></span> Role-based access & optional two-factor authentication</li>
            <li className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><Headphones className="h-4 w-4 text-accent" /></span> Live chat and lead notifications in real time</li>
            <li className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><LockKeyhole className="h-4 w-4 text-accent" /></span> Every change is recorded in the audit log</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} {site.companyName}. Authorized staff only.</p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-page px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <BrandMark className="h-11 w-11" />
            <div>
              <p className="text-lg font-bold text-navy">{site.companyName}</p>
              <p className="text-[11px] tracking-[0.25em] text-primary uppercase">Staff Dashboard</p>
            </div>
          </div>
          <div className="card p-6 shadow-[var(--shadow-lift)] sm:p-8">{children}</div>
          <p className="mt-6 text-center text-xs text-muted">
            <Link href="/" className="hover:text-primary">← Back to website</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
