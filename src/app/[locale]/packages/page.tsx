import Link from "@/components/public/link";
import { ArrowRight, Info } from "lucide-react";
import { localizedHref } from "@/lib/i18n";
import { raw, rows, rs, s } from "@/features/section-utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getFaqs, getPackages, getPageSections } from "@/server/public-data";
import { toFaqItems } from "@/server/faq-items";
import { CtaBanner, PackageGrid, PageHero, SectionHeading, ViewAllLink } from "@/components/public/blocks";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { Icon } from "@/components/ui/icon";
import { SupportArt } from "@/components/public/art";
import { MediaImage } from "@/components/public/media-image";

export async function generateMetadata({ params }: PageProps<"/[locale]/packages">) {
  const { locale, dict } = await resolveLocale(params);
  return buildMetadata({ routeKey: "packages", path: "/packages", locale, title: dict.packages.allTitle });
}

export default async function PackagesPage({ params }: PageProps<"/[locale]/packages">) {
  const { locale, dict } = await resolveLocale(params);
  const [{ sections, media }, packages, faqs] = await Promise.all([getPageSections("packages"), getPackages(), getFaqs()]);
  const packageFaqs = faqs.faqs.filter((f) => {
    const cat = faqs.categories.find((c) => c.id === f.categoryId);
    return cat?.slug === "packages" || f.featured;
  }).slice(0, 6);
  const help = sections.help;
  const helpImg = media[raw(help, "mediaId")];

  return (
    <>
      <PageHero data={sections.hero} media={media} locale={locale} />
      <section className="section" aria-labelledby="pk-title">
        <div className="container-x">
          <SectionHeading
            id="pk-title"
            title={s(sections.list, "title", locale) || dict.packages.allTitle}
            subtitle={s(sections.list, "subtitle", locale) || dict.packages.allSubtitle}
            action={
              s(sections.list, "note", locale) ? (
                <p className="flex max-w-xs items-start gap-2 rounded-xl bg-primary-soft px-3 py-2 text-xs text-navy">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {s(sections.list, "note", locale)}
                </p>
              ) : null
            }
          />
          <PackageGrid packages={packages} locale={locale} dict={dict} />
        </div>
      </section>
      {help && (
        <section className="pb-12 sm:pb-16">
          <div className="container-x">
            <div className="card grid items-center gap-6 overflow-hidden bg-gradient-to-r from-white to-primary-soft p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr_auto]">
              <div>
                <h2 className="text-2xl font-bold text-ink">{s(help, "title", locale)}</h2>
                <p className="mt-1 text-sm text-muted">{s(help, "subtitle", locale)}</p>
              </div>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {rows(help, "items").map((it, i) => (
                  <li key={i} className="text-center">
                    <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                      <Icon name={it.icon} className="h-5 w-5" />
                    </span>
                    <p className="mt-2 text-xs font-semibold text-ink">{rs(it, "title", locale)}</p>
                  </li>
                ))}
              </ul>
              <div className="relative flex items-center gap-4">
                <div className="relative hidden h-36 w-36 overflow-hidden rounded-2xl sm:block">
                  {helpImg ? <MediaImage media={helpImg} locale={locale} className="object-cover" sizes="144px" /> : <SupportArt className="h-full w-full" />}
                </div>
                {s(help, "ctaLabel", locale) && (
                  <Link href={localizedHref(raw(help, "ctaUrl") || "/contact", locale)} className="btn-primary">
                    {s(help, "ctaLabel", locale)} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      {packageFaqs.length > 0 && (
        <section className="pb-12 sm:pb-16" aria-labelledby="pk-faq">
          <div className="container-x max-w-4xl">
            <SectionHeading
              id="pk-faq"
              title={s(sections.faq, "title", locale) || dict.home.faqTitle}
              subtitle={s(sections.faq, "subtitle", locale)}
              action={<ViewAllLink href="/support" label={dict.common.viewAll} locale={locale} />}
            />
            <FaqAccordion items={toFaqItems(packageFaqs, locale)} />
          </div>
        </section>
      )}
      <CtaBanner data={sections.finalCta} locale={locale} />
    </>
  );
}
