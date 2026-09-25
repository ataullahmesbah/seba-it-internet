import Link from "@/components/public/link";
import { Mail, MapPin, Phone, MessageCircle, CodeXml } from "lucide-react";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n";
import type { OfficeDTO, SiteDTO, getNavigation } from "@/server/public-data";
import type { GeneralSettings } from "@/server/settings";
import { telHref } from "@/lib/utils";
import { Logo } from "./logo";
import { SocialIcon } from "./social-icons";

type Nav = Awaited<ReturnType<typeof getNavigation>>;

export function SiteFooter({
  site,
  nav,
  settings,
  headOffice,
  locale,
  dict,
  hasTariff,
}: {
  site: SiteDTO;
  nav: Nav;
  settings: GeneralSettings;
  headOffice: OfficeDTO | null;
  locale: AppLocale;
  dict: Dictionary;
  hasTariff: boolean;
}) {
  const col = (title: string, items: Nav["HEADER"], extra?: React.ReactNode) => (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      <ul className="space-y-2.5 text-sm">
        {items.map((i) => (
          <li key={i.url + i.labelEn}>
            <Link
              href={i.external ? i.url : localizedHref(i.url, locale)}
              target={i.newTab ? "_blank" : undefined}
              rel={i.external ? "noopener noreferrer" : undefined}
              className="text-white/70 transition-colors hover:text-accent"
            >
              {locale === "bn" ? i.labelBn : i.labelEn}
            </Link>
          </li>
        ))}
        {extra}
      </ul>
    </div>
  );
  const tagline = locale === "bn" ? site.taglineBn : site.taglineEn;
  const description = locale === "bn" ? site.descriptionBn : site.descriptionEn;
  return (
    <footer className="bg-navy text-white" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Footer
      </h2>
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.4fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo site={site} variant="light" />
          {tagline && <p className="mt-4 text-sm font-medium text-accent">{tagline}</p>}
          {description && <p className="mt-2 max-w-xs text-sm leading-6 text-white/65">{description}</p>}
          {site.social.length > 0 && (
            <div className="mt-5 flex gap-2">
              {site.social.map((s) => (
                <a
                  key={s.platform + s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.platform}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-primary"
                >
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          )}
        </div>
        {col(
          dict.footer.company,
          nav.FOOTER_COMPANY,
          settings.careerUrl ? (
            <li>
              <a href={settings.careerUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-accent">
                {dict.footer.career}
              </a>
            </li>
          ) : null,
        )}
        {col(dict.footer.internet, nav.FOOTER_INTERNET)}
        {col(dict.footer.support, nav.FOOTER_SUPPORT)}
        {col(
          dict.footer.legal,
          nav.FOOTER_LEGAL,
          hasTariff ? (
            <li>
              <Link href={localizedHref("/tariff", locale)} className="text-white/70 hover:text-accent">
                {dict.tariff.nav}
              </Link>
            </li>
          ) : settings.btrcTariffUrl ? (
            <li>
              <a href={settings.btrcTariffUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-accent">
                {dict.footer.btrcTariff}
              </a>
            </li>
          ) : null,
        )}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">{dict.footer.getInTouch}</h2>
          <ul className="space-y-3 text-sm text-white/75">
            {site.hotline && (
              <li>
                <a href={telHref(site.hotline)} className="flex items-start gap-2.5 hover:text-accent">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> {site.hotline}
                </a>
              </li>
            )}
            {site.supportEmail && (
              <li>
                <a href={`mailto:${site.supportEmail}`} className="flex items-start gap-2.5 break-all hover:text-accent">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> {site.supportEmail}
                </a>
              </li>
            )}
            {site.whatsappUrl && (
              <li>
                <a href={site.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:text-accent">
                  <SocialIcon platform="whatsapp" className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> WhatsApp
                </a>
              </li>
            )}
            {site.messengerUrl && (
              <li>
                <a href={site.messengerUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:text-accent">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> Messenger
                </a>
              </li>
            )}
            {headOffice && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span className="whitespace-pre-line">{locale === "bn" ? headOffice.addressBn : headOffice.addressEn}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.companyName}. {dict.footer.rights}
          </p>
          <p className="flex items-center gap-1.5">
            {tagline && <span className="script text-base text-accent/90">{tagline}</span>}
            <span aria-hidden>·</span> <CodeXml className="h-3.5 w-3.5 text-accent" aria-hidden /> {dict.footer.madeIn}{" "}
            <a href="https://www.ataullahmesbah.com" target="_blank" rel="noopener" className="font-semibold text-white/80 underline-offset-2 hover:text-accent hover:underline">
              Ataullah Mesbah
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
