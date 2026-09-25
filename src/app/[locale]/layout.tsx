import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";
import { getDictionary, isLocale, type AppLocale } from "@/lib/i18n";
import { getNavigation, getOffices, getSite, getTariffDocuments } from "@/server/public-data";
import { getGeneralSettings, getSecuritySettings } from "@/server/settings";
import { TurnstileProvider } from "@/components/public/turnstile";
import { env } from "@/lib/env";
import { getAdminContext } from "@/lib/auth/session";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { ChatWidget } from "@/components/public/chat-widget";
import { JsonLd } from "@/components/public/json-ld";
import { TriangleAlert } from "lucide-react";

export const viewport: Viewport = { themeColor: "#071A2E", width: "device-width", initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(env.appUrl),
    title: { default: site.companyName, template: `%s | ${site.companyName}` },
    applicationName: site.companyName,
    icons: site.favicon ? { icon: site.favicon.url } : { icon: "/icon.svg" },
    robots: env.indexingAllowed ? undefined : { index: false, follow: false },
  };
}

export default async function PublicLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: AppLocale = raw;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const [site, nav, settings, offices, security, tariffs] = await Promise.all([getSite(), getNavigation(), getGeneralSettings(), getOffices(), getSecuritySettings(), getTariffDocuments()]);
  const hasTariff = tariffs.length > 0;
  // Show a "Dashboard" shortcut only to staff with a valid, fully verified session.
  const admin = await getAdminContext();
  const staffSignedIn = Boolean(admin && (!admin.twoFactorEnabled || admin.twoFactorPassed));
  const turnstileKey = security.turnstileOnPublicForms ? env.turnstile.siteKey ?? null : null;
  const dict = getDictionary(locale);
  const headOffice = offices.find((o) => o.isPrimary) ?? offices.find((o) => o.type === "HEAD_OFFICE") ?? null;
  const brandVars = {
    "--brand-primary": site.primaryColor,
    "--brand-navy": site.secondaryColor,
    "--brand-accent": site.accentColor,
  } as React.CSSProperties;
  const banner = settings.maintenanceBannerEnabled ? (locale === "bn" ? settings.maintenanceBannerBn : settings.maintenanceBannerEn) : "";

  return (
    <html lang={locale} className={fontVariables} style={brandVars}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
          {dict.common.skipToContent}
        </a>
        <JsonLd
          nonce={nonce}
          data={{
            "@context": "https://schema.org",
            "@type": "InternetServiceProvider",
            name: site.companyName,
            url: env.appUrl,
            logo: site.logoLight?.url,
            telephone: site.hotline ?? undefined,
            email: site.supportEmail ?? undefined,
            address: headOffice ? { "@type": "PostalAddress", streetAddress: headOffice.addressEn, addressCountry: "BD" } : undefined,
            sameAs: site.social.map((s) => s.url),
          }}
        />
        {banner && (
          <div role="status" className="bg-amber-100 text-amber-900">
            <p className="container-x flex items-center gap-2 py-2 text-sm">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> {banner}
            </p>
          </div>
        )}
        <SiteHeader site={site} nav={nav} settings={settings} locale={locale} dict={dict} hasTariff={hasTariff} staffSignedIn={staffSignedIn} />
        <main id="main">
          <TurnstileProvider siteKey={turnstileKey}>{children}</TurnstileProvider>
        </main>
        {turnstileKey && <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer nonce={nonce} />}
        <SiteFooter site={site} nav={nav} settings={settings} headOffice={headOffice} locale={locale} dict={dict} hasTariff={hasTariff} />
        {settings.chatEnabled && (
          <ChatWidget
            locale={locale}
            companyName={site.companyName}
            labels={{ ...dict.chat, close: dict.common.close, retry: dict.common.retry }}
          />
        )}
      </body>
    </html>
  );
}
