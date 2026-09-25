import { Suspense } from "react";
import { Clock, FileText, Mail, Phone } from "lucide-react";
import Link from "@/components/public/link";
import { localizedHref } from "@/lib/i18n";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import type { SiteDTO, getNavigation } from "@/server/public-data";
import type { GeneralSettings } from "@/server/settings";
import { telHref } from "@/lib/utils";
import { Logo } from "./logo";
import { SocialIcon } from "./social-icons";
import { HeaderClient } from "./header-client";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader({
  site,
  nav,
  settings,
  locale,
  dict,
  hasTariff,
  staffSignedIn,
}: {
  site: SiteDTO;
  nav: Awaited<ReturnType<typeof getNavigation>>;
  settings: GeneralSettings;
  locale: AppLocale;
  dict: Dictionary;
  hasTariff: boolean;
  staffSignedIn: boolean;
}) {
  const links = nav.HEADER.map((n) => ({ label: locale === "bn" ? n.labelBn : n.labelEn, href: n.url, external: n.external, newTab: n.newTab }));
  return (
    // The whole header is sticky; on md+ the utility bar (h-9) scrolls away and the main bar stays pinned.
    <header className={settings.utilityBarEnabled ? "sticky top-0 z-40 md:-top-9" : "sticky top-0 z-40"}>
      {settings.utilityBarEnabled && (
        <div className="hidden bg-navy text-[12px] text-white/85 md:block">
          <div className="container-x flex h-9 items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              {site.hotline && (
                <a href={telHref(site.hotline)} className="flex items-center gap-1.5 hover:text-white">
                  <Phone className="h-3.5 w-3.5 text-accent" aria-hidden /> <span className="sr-only">{dict.header.hotline}: </span>
                  {site.hotline}
                </a>
              )}
              {site.supportEmail && (
                <a href={`mailto:${site.supportEmail}`} className="flex items-center gap-1.5 hover:text-white">
                  <Mail className="h-3.5 w-3.5 text-accent" aria-hidden /> {site.supportEmail}
                </a>
              )}
              {(locale === "bn" ? settings.officeHoursBn : settings.officeHoursEn) && (
                <span className="hidden items-center gap-1.5 lg:flex">
                  <Clock className="h-3.5 w-3.5 text-accent" aria-hidden /> {locale === "bn" ? settings.officeHoursBn : settings.officeHoursEn}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {hasTariff && (
                <>
                  <Link href={localizedHref("/tariff", locale)} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-semibold text-white hover:bg-primary">
                    <FileText className="h-3.5 w-3.5 text-accent" aria-hidden /> {dict.tariff.nav}
                  </Link>
                  <span className="h-4 w-px bg-white/20" aria-hidden />
                </>
              )}
              {site.social.map((sl) => (
                <a key={sl.platform + sl.url} href={sl.url} target="_blank" rel="noopener noreferrer" aria-label={sl.platform} className="hover:text-accent">
                  <SocialIcon platform={sl.platform} className="h-3.5 w-3.5" />
                </a>
              ))}
              <span className="h-4 w-px bg-white/20" aria-hidden />
              <Suspense fallback={null}>
                <LanguageSwitcher locale={locale} dark />
              </Suspense>
            </div>
          </div>
        </div>
      )}
      <Suspense fallback={<div className="h-16 lg:h-[72px]" />}>
        <HeaderClient
          logo={<Logo site={site} />}
          links={links}
          locale={locale}
          cta={{ label: dict.common.getConnection, href: "/get-connection" }}
          labels={{ openMenu: dict.header.openMenu, closeMenu: dict.header.closeMenu, supportChannels: dict.header.supportChannels, chat: dict.footer.liveChat }}
          contacts={{ hotline: site.hotline, email: site.supportEmail, whatsapp: site.whatsappUrl }}
          utilityBar={settings.utilityBarEnabled}
          tariff={hasTariff ? { label: dict.tariff.nav, href: "/tariff" } : null}
          dashboardLabel={staffSignedIn ? dict.common.dashboard : null}
        />
      </Suspense>
    </header>
  );
}
