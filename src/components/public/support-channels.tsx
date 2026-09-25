import { Mail, MessageCircle, Phone } from "lucide-react";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import type { SiteDTO } from "@/server/public-data";
import { telHref } from "@/lib/utils";
import { SocialIcon } from "./social-icons";
import { OpenChatButton } from "./copy-button";

/** Support channel cards — only configured channels are shown (PRD 5.8). */
export function SupportChannels({ site, dict, chatEnabled, supportNote }: { site: SiteDTO; locale: AppLocale; dict: Dictionary; chatEnabled: boolean; supportNote?: string }) {
  const t = dict.support;
  const card = "card flex min-h-24 items-center gap-4 p-5 text-left transition-shadow hover:shadow-[var(--shadow-lift)]";
  const iconWrap = "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl";
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chatEnabled && (
          <OpenChatButton
            className={card}
            label={
              <>
                <span className={`${iconWrap} bg-primary-soft text-primary`}>
                  <MessageCircle className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{t.liveChat}</span>
                  <span className="text-sm text-muted">{t.liveChatDesc}</span>
                </span>
              </>
            }
          />
        )}
        {site.hotline && (
          <a href={telHref(site.hotline)} className={card}>
            <span className={`${iconWrap} bg-emerald-50 text-success`}>
              <Phone className="h-6 w-6" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-ink">{t.call}</span>
              <span className="text-sm text-muted">{site.hotline}</span>
            </span>
          </a>
        )}
        {site.whatsappUrl && (
          <a href={site.whatsappUrl} target="_blank" rel="noopener noreferrer" className={card}>
            <span className={`${iconWrap} bg-emerald-50 text-emerald-600`}>
              <SocialIcon platform="whatsapp" className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold text-ink">{t.whatsapp}</span>
              <span className="text-sm text-muted">{t.whatsappDesc}</span>
            </span>
          </a>
        )}
        {site.messengerUrl && (
          <a href={site.messengerUrl} target="_blank" rel="noopener noreferrer" className={card}>
            <span className={`${iconWrap} bg-violet-50 text-violet-600`}>
              <SocialIcon platform="messenger" className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold text-ink">{t.messenger}</span>
              <span className="text-sm text-muted">{t.messengerDesc}</span>
            </span>
          </a>
        )}
        {site.supportEmail && (
          <a href={`mailto:${site.supportEmail}`} className={card}>
            <span className={`${iconWrap} bg-sky-50 text-sky-600`}>
              <Mail className="h-6 w-6" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{t.email}</span>
              <span className="block truncate text-sm text-muted">{site.supportEmail}</span>
            </span>
          </a>
        )}
      </div>
      {supportNote && <p className="mt-4 text-sm text-muted">{supportNote}</p>}
    </div>
  );
}
