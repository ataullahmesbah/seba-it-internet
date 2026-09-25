import { ArrowRight } from "lucide-react";
import { pick } from "@/lib/i18n";
import { raw, rows, s } from "@/features/section-utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getCorporateServices, getCoverageTree, getFaqs, getPageSections, getReviews } from "@/server/public-data";
import { toFaqItems } from "@/server/faq-items";
import { CtaBanner, FeatureGrid, PageHero, ReviewCard, SectionHeading, StatsBand } from "@/components/public/blocks";
import { CorporateForm } from "@/components/public/lead-forms";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { Icon } from "@/components/ui/icon";
import { CorporateArt } from "@/components/public/art";
import { MediaImage } from "@/components/public/media-image";

export async function generateMetadata({ params }: PageProps<"/[locale]/corporate">) {
  const { locale, dict } = await resolveLocale(params);
  return buildMetadata({ routeKey: "corporate", path: "/corporate", locale, title: dict.corporate.servicesTitle });
}

export default async function CorporatePage({ params }: PageProps<"/[locale]/corporate">) {
  const { locale, dict } = await resolveLocale(params);
  const [{ sections, media, order }, services, tree, reviews, faqs] = await Promise.all([
    getPageSections("corporate"),
    getCorporateServices(),
    getCoverageTree(),
    getReviews(),
    getFaqs(),
  ]);
  const districts = tree.map((d) => ({ id: d.id, nameEn: d.nameEn, nameBn: d.nameBn }));
  const inquiry = sections.inquiry;
  const inquiryImg = media[raw(inquiry, "mediaId")];
  const inquiryStats = rows(inquiry, "items");
  const bizReviews = reviews.filter((r) => r.areaOrCompany && /ltd|company|group|limited|business|corp/i.test(r.areaOrCompany)).slice(0, 3);
  const faqItems = faqs.faqs.filter((f) => /corporate|business|dedicated|static/i.test(f.questionEn)).slice(0, 6);

  const render: Record<string, () => React.ReactNode> = {
    hero: () => <PageHero key="hero" data={sections.hero} media={media} locale={locale} />,
    services: () =>
      services.length ? (
        <section key="services" className="section" aria-labelledby="corp-services">
          <div className="container-x">
            <SectionHeading id="corp-services" title={s(sections.services, "title", locale) || dict.corporate.servicesTitle} subtitle={s(sections.services, "subtitle", locale) || dict.corporate.servicesSub} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((sv, i) => (
                <article key={sv.id} className={`card group flex gap-4 p-6 transition-shadow hover:shadow-[var(--shadow-lift)] ${i === services.length - 1 && services.length % 3 === 1 ? "lg:col-span-3" : ""}`}>
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    {sv.media ? <MediaImage media={sv.media} locale={locale} fill={false} className="h-8 w-8 object-contain" sizes="32px" decorative /> : <Icon name={sv.iconKey} className="h-7 w-7" />}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-bold text-ink">{pick(sv, "title", locale)}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted">{pick(sv, "description", locale)}</p>
                  </div>
                  <a href="#inquiry" className="self-end text-primary opacity-70 group-hover:opacity-100" aria-label={`${pick(sv, "title", locale)} — ${dict.forms.submitInquiry}`}>
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null,
    benefits: () =>
      rows(sections.benefits, "items").length ? (
        <section key="benefits" className="section bg-white" aria-labelledby="corp-benefits">
          <div className="container-x">
            <SectionHeading id="corp-benefits" title={s(sections.benefits, "title", locale)} subtitle={s(sections.benefits, "subtitle", locale)} />
            <FeatureGrid items={rows(sections.benefits, "items")} locale={locale} />
          </div>
        </section>
      ) : null,
    inquiry: () => (
      <section key="inquiry" id="inquiry" className="section scroll-mt-24" aria-labelledby="corp-inquiry">
        <div className="container-x grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="hero-bg relative hidden min-h-96 overflow-hidden rounded-3xl text-white lg:block">
            {inquiryImg ? <MediaImage media={inquiryImg} locale={locale} className="object-cover" sizes="40vw" /> : <CorporateArt className="absolute inset-0 h-full w-full opacity-90" />}
            {s(inquiry, "script", locale) && <p className="script absolute top-6 left-6 max-w-[12rem] -rotate-6 text-3xl leading-tight">{s(inquiry, "script", locale)}</p>}
            {inquiryStats.length > 0 && (
              <dl className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-2 bg-navy/85 p-5">
                {inquiryStats.slice(0, 3).map((st, i) => (
                  <div key={i}>
                    <dd className="text-xl font-extrabold">{st.value}</dd>
                    <dt className="text-[11px] text-white/70">{locale === "bn" ? st.labelBn : st.labelEn}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="card p-6 sm:p-8">
            <h2 id="corp-inquiry" className="text-2xl font-bold text-ink">
              {s(inquiry, "title", locale) || dict.forms.corporateFormTitle}
            </h2>
            <p className="mt-1 mb-6 text-sm text-muted">{s(inquiry, "subtitle", locale) || dict.forms.corporateFormSubtitle}</p>
            <CorporateForm districts={districts} locale={locale} dict={dict} />
          </div>
        </div>
      </section>
    ),
    trust: () => <StatsBand key="trust" data={sections.trust} locale={locale} withArt={false} />,
    reviews: () =>
      bizReviews.length ? (
        <section key="reviews" className="section" aria-labelledby="corp-reviews">
          <div className="container-x">
            <SectionHeading id="corp-reviews" title={s(sections.reviews, "title", locale) || dict.home.reviewsTitle} subtitle={s(sections.reviews, "subtitle", locale)} />
            <div className="grid gap-5 md:grid-cols-3">
              {bizReviews.map((r) => (
                <ReviewCard key={r.id} review={r} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      ) : null,
    faq: () =>
      faqItems.length ? (
        <section key="faq" className="section" aria-labelledby="corp-faq">
          <div className="container-x max-w-4xl">
            <SectionHeading id="corp-faq" title={s(sections.faq, "title", locale) || dict.home.faqTitle} subtitle={s(sections.faq, "subtitle", locale)} />
            <FaqAccordion items={toFaqItems(faqItems, locale)} />
          </div>
        </section>
      ) : null,
    finalCta: () => <CtaBanner key="finalCta" data={sections.finalCta} locale={locale} />,
  };
  return <>{order.map((t) => render[t]?.() ?? null)}</>;
}
