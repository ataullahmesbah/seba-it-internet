import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { pick, type AppLocale, type Dictionary } from "@/lib/i18n";
import type { OfficeDTO } from "@/server/public-data";
import { telHref } from "@/lib/utils";

export function OfficeCard({ office, locale, dict }: { office: OfficeDTO; locale: AppLocale; dict: Dictionary }) {
  const head = office.type === "HEAD_OFFICE";
  return (
    <article className={`card flex flex-col p-6 ${head ? "ring-2 ring-primary/30" : ""}`}>
      <p className={`text-xs font-semibold tracking-wide uppercase ${head ? "text-primary" : "text-muted"}`}>{head ? dict.contact.headOffice : dict.contact.branch}</p>
      <h3 className="mt-1 text-lg font-bold text-ink">{pick(office, "name", locale)}</h3>
      <ul className="mt-4 flex-1 space-y-2.5 text-sm text-slate-700">
        <li className="flex gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="whitespace-pre-line">{pick(office, "address", locale)}</span>
        </li>
        {office.phone && (
          <li>
            <a href={telHref(office.phone)} className="flex gap-2.5 hover:text-primary">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {office.phone}
            </a>
          </li>
        )}
        {office.email && (
          <li>
            <a href={`mailto:${office.email}`} className="flex gap-2.5 break-all hover:text-primary">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {office.email}
            </a>
          </li>
        )}
        {pick(office, "hours", locale) && (
          <li className="flex gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="sr-only">{dict.contact.hours}: </span>
              {pick(office, "hours", locale)}
            </span>
          </li>
        )}
      </ul>
      {office.mapUrl && (
        <a href={office.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          {dict.contact.openMap} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}
    </article>
  );
}
