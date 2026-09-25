import Link from "@/components/public/link";
import { ArrowRight, ChevronRight, Info, Landmark, Mail, Phone } from "lucide-react";
import { localizedHref, pick, pickList } from "@/lib/i18n";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { raw, rows, rs, s } from "@/features/section-utils";
import { telHref } from "@/lib/utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getPageSections, getPaymentMethods, getSite, type PaymentMethodDTO } from "@/server/public-data";
import { CtaBanner, PageHero, SectionHeading } from "@/components/public/blocks";
import { CopyButton } from "@/components/public/copy-button";
import { MediaImage } from "@/components/public/media-image";
import { SupportArt } from "@/components/public/art";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata({ params }: PageProps<"/[locale]/pay-bill">) {
  const { locale, dict } = await resolveLocale(params);
  return buildMetadata({ routeKey: "pay-bill", path: "/pay-bill", locale, title: dict.payBill.chooseMethod });
}

const BRAND: Record<string, { color: string; bg: string }> = {
  BKASH: { color: "#E2136E", bg: "#FDE7F1" },
  NAGAD: { color: "#EC1C24", bg: "#FDE8E0" },
  ROCKET: { color: "#8C3494", bg: "#F3E8F5" },
};

function MethodCard({ m, locale, dict }: { m: PaymentMethodDTO; locale: AppLocale; dict: Dictionary }) {
  const b = BRAND[m.type] ?? { color: "var(--brand-primary)", bg: "var(--color-primary-soft)" };
  const steps = pickList(m, "instructions", locale);
  return (
    <article className="card flex flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        {m.logo ? (
          <div className="relative h-12 w-28">
            <MediaImage media={m.logo} locale={locale} className="object-contain object-left" sizes="112px" />
          </div>
        ) : (
          <span className="rounded-xl px-3 py-2 text-xl font-extrabold tracking-tight" style={{ color: b.color, background: b.bg }}>
            {pick(m, "title", locale)}
          </span>
        )}
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto] gap-4">
        <dl className="space-y-3 text-sm">
          {pick(m, "accountType", locale) && (
            <div>
              <dt className="text-xs text-muted">{dict.payBill.accountType}</dt>
              <dd className="font-semibold text-ink">{pick(m, "accountType", locale)}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted">{dict.payBill.accountNumber}</dt>
            <dd className="flex items-center gap-1 text-lg font-bold text-ink">
              <span className="break-all">{m.accountNumber}</span>
              <CopyButton value={m.accountNumber} label={dict.common.copy} copiedLabel={dict.common.copied} />
            </dd>
          </div>
        </dl>
        {m.qr && (
          <figure className="text-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-line bg-white">
              <MediaImage media={m.qr} locale={locale} className="object-contain p-1" sizes="96px" />
            </div>
            <figcaption className="mt-1 text-[10px] text-muted">{dict.payBill.scanToPay}</figcaption>
          </figure>
        )}
      </div>
      {steps.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-bold text-ink">{dict.payBill.paymentSteps}</h3>
          <ol className="mt-3 flex-1 space-y-2.5 text-sm">
            {steps.map((st, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{i + 1}</span>
                <span className="text-slate-700">{st}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      {pick(m, "referenceInstruction", locale) && (
        <p className="mt-5 flex gap-2 rounded-xl bg-primary-soft px-3 py-2.5 text-xs text-navy">
          <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden /> {pick(m, "referenceInstruction", locale)}
        </p>
      )}
      <Link href={localizedHref("/support", locale)} className="btn-outline mt-5 w-full !min-h-10">
        {dict.payBill.needHelp} <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  );
}

export default async function PayBillPage({ params }: PageProps<"/[locale]/pay-bill">) {
  const { locale, dict } = await resolveLocale(params);
  const [{ sections, media, order }, methods, site] = await Promise.all([getPageSections("pay-bill"), getPaymentMethods(), getSite()]);
  const mobile = methods.filter((m) => m.type !== "BANK");
  const banks = methods.filter((m) => m.type === "BANK");
  const t = dict.payBill;
  const help = sections.help;
  const helpImg = media[raw(help, "mediaId")];

  const render: Record<string, () => React.ReactNode> = {
    hero: () => <PageHero key="hero" data={sections.hero} media={media} locale={locale} />,
    notice: () => (
      <section key="notice" className="pt-10">
        <div className="container-x">
          <div className="card flex flex-col gap-4 border-primary/20 bg-primary-soft/60 p-6 sm:flex-row sm:items-center">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Info className="h-6 w-6" aria-hidden />
            </span>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-ink">{s(sections.notice, "title", locale) || t.instructionsOnly}</h2>
              <p className="mt-1 text-sm text-slate-700">{s(sections.notice, "body", locale) || t.instructionsBody}</p>
            </div>
            {s(sections.notice, "script", locale) && <p className="script hidden max-w-[10rem] text-right text-xl leading-tight text-navy lg:block">{s(sections.notice, "script", locale)}</p>}
          </div>
        </div>
      </section>
    ),
    methods: () => (
      <section key="methods" className="section" aria-labelledby="pb-methods">
        <div className="container-x">
          <SectionHeading id="pb-methods" title={s(sections.methods, "title", locale) || t.chooseMethod} subtitle={s(sections.methods, "subtitle", locale) || t.chooseMethodSub} />
          {mobile.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mobile.map((m) => (
                <MethodCard key={m.id} m={m} locale={locale} dict={dict} />
              ))}
            </div>
          ) : !banks.length ? (
            <p className="card p-8 text-center text-muted">{t.noMethods}</p>
          ) : null}
        </div>
      </section>
    ),
    bank: () =>
      banks.length ? (
        <section key="bank" className="pb-12 sm:pb-16" aria-labelledby="pb-bank">
          <div className="container-x">
            <div className="card p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Landmark className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2 id="pb-bank" className="text-xl font-bold text-ink">
                    {s(sections.bank, "title", locale) || t.bankTransfer}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{s(sections.bank, "subtitle", locale) || t.bankTransferSub}</p>
                </div>
              </div>
              {/* Desktop table */}
              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-page text-xs text-muted uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">{t.bankName}</th>
                      <th scope="col" className="px-4 py-3">{t.accountName}</th>
                      <th scope="col" className="px-4 py-3">{t.accountNumber}</th>
                      <th scope="col" className="px-4 py-3">{t.accountType}</th>
                      <th scope="col" className="px-4 py-3">{t.branch}</th>
                      <th scope="col" className="px-4 py-3">{t.routing}</th>
                      <th scope="col" className="px-4 py-3"><span className="sr-only">{dict.common.copy}</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {banks.map((b) => (
                      <tr key={b.id}>
                        <td className="px-4 py-3 font-semibold text-ink">{b.bankName}</td>
                        <td className="px-4 py-3">{b.accountName}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{b.accountNumber}</td>
                        <td className="px-4 py-3">{pick(b, "accountType", locale)}</td>
                        <td className="px-4 py-3">{b.branch}</td>
                        <td className="px-4 py-3 font-mono">{b.routingNumber}</td>
                        <td className="px-4 py-3">
                          <CopyButton value={b.accountNumber} label={dict.common.copy} copiedLabel={dict.common.copied} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="mt-6 grid gap-4 md:hidden">
                {banks.map((b) => (
                  <dl key={b.id} className="rounded-xl border border-line p-4 text-sm">
                    <dt className="sr-only">{t.bankName}</dt>
                    <dd className="font-bold text-ink">{b.bankName}</dd>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div><dt className="text-xs text-muted">{t.accountName}</dt><dd>{b.accountName}</dd></div>
                      <div><dt className="text-xs text-muted">{t.accountNumber}</dt><dd className="flex items-center gap-1 font-mono font-semibold">{b.accountNumber}<CopyButton value={b.accountNumber} label={dict.common.copy} copiedLabel={dict.common.copied} /></dd></div>
                      <div><dt className="text-xs text-muted">{t.branch}</dt><dd>{b.branch}</dd></div>
                      <div><dt className="text-xs text-muted">{t.routing}</dt><dd className="font-mono">{b.routingNumber}</dd></div>
                    </div>
                  </dl>
                ))}
              </div>
              {(s(sections.bank, "note", locale) || pick(banks[0], "referenceInstruction", locale)) && (
                <p className="mt-6 flex gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-navy">
                  <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    <strong>{t.important}:</strong> {s(sections.bank, "note", locale) || pick(banks[0], "referenceInstruction", locale)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null,
    help: () =>
      help ? (
        <section key="help" className="pb-12 sm:pb-16" aria-labelledby="pb-help">
          <div className="container-x grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <SectionHeading id="pb-help" title={s(help, "title", locale) || t.helpTitle} subtitle={s(help, "subtitle", locale) || t.helpSub} />
              <div className="grid gap-4 sm:grid-cols-2">
                {rows(help, "items").map((it, i) => (
                  <Link key={i} href={localizedHref(it.url || "/support", locale)} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon name={it.icon} fallback="help" className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink">{rs(it, "title", locale)}</span>
                      <span className="block text-xs text-muted">{rs(it, "desc", locale)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
            <aside className="card relative overflow-hidden bg-gradient-to-br from-primary-soft to-white p-6">
              <h3 className="text-xl font-bold text-ink">{s(help, "cardTitle", locale)}</h3>
              <p className="mt-1 text-sm text-muted">{s(help, "cardBody", locale)}</p>
              <ul className="mt-5 space-y-3 text-sm font-semibold">
                {site.hotline && (
                  <li>
                    <a href={telHref(site.hotline)} className="flex items-center gap-2 hover:text-primary">
                      <Phone className="h-4 w-4 text-primary" aria-hidden /> {site.hotline}
                    </a>
                  </li>
                )}
                {site.supportEmail && (
                  <li>
                    <a href={`mailto:${site.supportEmail}`} className="flex items-center gap-2 break-all hover:text-primary">
                      <Mail className="h-4 w-4 text-primary" aria-hidden /> {site.supportEmail}
                    </a>
                  </li>
                )}
              </ul>
              <Link href={localizedHref("/contact", locale)} className="btn-primary mt-6">
                {dict.common.contactUs} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <div className="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 opacity-90">
                {helpImg ? <MediaImage media={helpImg} locale={locale} className="object-cover" sizes="160px" decorative /> : <SupportArt className="h-full w-full" />}
              </div>
            </aside>
          </div>
        </section>
      ) : null,
    finalCta: () => <CtaBanner key="finalCta" data={sections.finalCta} locale={locale} />,
  };
  return <>{order.map((ty) => render[ty]?.() ?? null)}</>;
}

