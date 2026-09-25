import Link from "@/components/public/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { localizedHref } from "@/lib/i18n";
import { lines, raw, rows, s } from "@/features/section-utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import {
  getActiveOffers,
  getCoverageTree,
  getFaqs,
  getFeaturedPackages,
  getLatestPosts,
  getPageSections,
  getReviews,
  getSite,
} from "@/server/public-data";
import { getGeneralSettings } from "@/server/settings";
import { toFaqItems } from "@/server/faq-items";
import {
  BlogCard,
  CtaBanner,
  FeatureGrid,
  OfferBanner,
  PackageGrid,
  PageHero,
  ReviewCard,
  SectionHeading,
  StatsBand,
  Steps,
  ViewAllLink,
} from "@/components/public/blocks";
import { CoverageChecker } from "@/components/public/coverage-checker";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { SupportChannels } from "@/components/public/support-channels";
import { CorporateArt, HomeArt } from "@/components/public/art";
import { MediaImage } from "@/components/public/media-image";
import type { AppLocale } from "@/lib/i18n";
import type { MediaDTO } from "@/server/public-data";

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await resolveLocale(params);
  return buildMetadata({ routeKey: "home", path: "/", locale });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale, dict } = await resolveLocale(params);
  const [page, packages, offers, tree, reviews, faqs, posts, site, settings] = await Promise.all([
    getPageSections("home"),
    getFeaturedPackages(4),
    getActiveOffers(),
    getCoverageTree(),
    getReviews(),
    getFaqs(),
    getLatestPosts(3),
    getSite(),
    getGeneralSettings(),
  ]);
  const { sections, media, order } = page;
  const districts = tree.map((d) => ({ id: d.id, nameEn: d.nameEn, nameBn: d.nameBn }));

  const render: Record<string, () => React.ReactNode> = {
    hero: () => <PageHero key="hero" data={sections.hero} media={media} locale={locale} size="lg" />,
    coverage: () => (
      <section key="coverage" className="relative z-10 -mt-8 sm:-mt-12" aria-label={s(sections.coverage, "title", locale)}>
        <div className="container-x">
          <CoverageChecker districts={districts} locale={locale} dict={dict} title={s(sections.coverage, "title", locale)} subtitle={s(sections.coverage, "subtitle", locale)} compact />
        </div>
      </section>
    ),
    packages: () =>
      packages.length ? (
        <section key="packages" className="section" aria-labelledby="home-packages">
          <div className="container-x">
            <SectionHeading
              id="home-packages"
              title={s(sections.packages, "title", locale) || dict.packages.title}
              subtitle={s(sections.packages, "subtitle", locale) || dict.packages.subtitle}
              action={<ViewAllLink href="/packages" label={dict.common.viewAll} locale={locale} />}
            />
            <PackageGrid packages={packages} locale={locale} dict={dict} />
          </div>
        </section>
      ) : null,
    serviceIntro: () => <ServiceIntro key="serviceIntro" data={sections.serviceIntro} media={media} locale={locale} />,
    whyChooseUs: () =>
      rows(sections.whyChooseUs, "items").length ? (
        <section key="why" className="section bg-white" aria-labelledby="home-why">
          <div className="container-x">
            <SectionHeading id="home-why" title={s(sections.whyChooseUs, "title", locale)} subtitle={s(sections.whyChooseUs, "subtitle", locale)} />
            <FeatureGrid items={rows(sections.whyChooseUs, "items").slice(0, 6)} locale={locale} />
          </div>
        </section>
      ) : null,
    offer: () => <OfferBanner key="offer" offer={offers[0] ?? null} data={sections.offer} locale={locale} />,
    howItWorks: () =>
      rows(sections.howItWorks, "items").length ? (
        <section key="how" className="section" aria-labelledby="home-how">
          <div className="container-x">
            <SectionHeading id="home-how" title={s(sections.howItWorks, "title", locale)} subtitle={s(sections.howItWorks, "subtitle", locale)} center />
            <Steps items={rows(sections.howItWorks, "items")} locale={locale} />
          </div>
        </section>
      ) : null,
    stats: () => <StatsBand key="stats" data={sections.stats} locale={locale} />,
    reviews: () =>
      reviews.length ? (
        <section key="reviews" className="section bg-white" aria-labelledby="home-reviews">
          <div className="container-x">
            <SectionHeading id="home-reviews" title={s(sections.reviews, "title", locale) || dict.home.reviewsTitle} subtitle={s(sections.reviews, "subtitle", locale)} />
            <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r) => (
                <div key={r.id} className="w-[85%] shrink-0 snap-start sm:w-auto">
                  <ReviewCard review={r} locale={locale} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null,
    blog: () =>
      posts.length ? (
        <section key="blog" className="section" aria-labelledby="home-blog">
          <div className="container-x">
            <SectionHeading
              id="home-blog"
              title={s(sections.blog, "title", locale) || dict.home.blogTitle}
              subtitle={s(sections.blog, "subtitle", locale)}
              action={<ViewAllLink href="/blog" label={dict.common.viewAll} locale={locale} />}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <BlogCard key={p.id} post={p} locale={locale} dict={dict} />
              ))}
            </div>
          </div>
        </section>
      ) : null,
    faq: () => {
      const featured = faqs.faqs.filter((f) => f.featured).slice(0, 6);
      const list = featured.length ? featured : faqs.faqs.slice(0, 6);
      return list.length ? (
        <section key="faq" className="section" aria-labelledby="home-faq">
          <div className="container-x max-w-4xl">
            <SectionHeading
              id="home-faq"
              title={s(sections.faq, "title", locale) || dict.home.faqTitle}
              subtitle={s(sections.faq, "subtitle", locale)}
              action={<ViewAllLink href="/support" label={dict.common.viewAll} locale={locale} />}
            />
            <FaqAccordion items={toFaqItems(list, locale)} />
          </div>
        </section>
      ) : null;
    },
    support: () => (
      <section key="support" className="section bg-white" aria-labelledby="home-support">
        <div className="container-x">
          <SectionHeading id="home-support" title={s(sections.support, "title", locale) || dict.support.channels} subtitle={s(sections.support, "subtitle", locale) || dict.support.channelsSub} />
          <SupportChannels site={site} locale={locale} dict={dict} chatEnabled={settings.chatEnabled} />
        </div>
      </section>
    ),
    finalCta: () => <CtaBanner key="finalCta" data={sections.finalCta} locale={locale} />,
  };

  return <>{order.map((type) => render[type]?.() ?? null)}</>;
}

function ServiceIntro({ data, media, locale }: { data: Record<string, unknown> | undefined; media: Record<string, MediaDTO>; locale: AppLocale }) {
  if (!data) return null;
  const card = (prefix: "home" | "corporate") => {
    const img = media[raw(data, `${prefix}MediaId`)];
    const points = lines(data, `${prefix}Points`, locale);
    const url = raw(data, `${prefix}CtaUrl`) || (prefix === "home" ? "/packages" : "/corporate");
    const script = s(data, `${prefix}Script`, locale);
    return (
      <article className="card grid overflow-hidden sm:grid-cols-2">
        <div className="flex flex-col p-6 sm:p-7">
          <h3 className="text-xl font-bold text-ink">{s(data, `${prefix}Title`, locale)}</h3>
          <p className="mt-1 text-sm text-muted">{s(data, `${prefix}Desc`, locale)}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {points.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {p}
              </li>
            ))}
          </ul>
          {s(data, `${prefix}CtaLabel`, locale) && (
            <Link href={localizedHref(url, locale)} className="btn-primary mt-6 self-start">
              {s(data, `${prefix}CtaLabel`, locale)} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
        <div className="relative min-h-52 bg-gradient-to-br from-primary-soft to-accent-soft">
          {img ? (
            <MediaImage media={img} locale={locale} className="object-cover" sizes="(min-width:1024px) 25vw, 100vw" />
          ) : prefix === "home" ? (
            <HomeArt className="absolute inset-0 h-full w-full" />
          ) : (
            <CorporateArt className="absolute inset-0 h-full w-full" />
          )}
          {script && <p className="script absolute top-3 right-4 max-w-[9rem] -rotate-6 text-right text-xl leading-tight text-navy">{script}</p>}
        </div>
      </article>
    );
  };
  return (
    <section className="py-6 sm:py-8">
      <div className="container-x grid gap-6 lg:grid-cols-2">
        {card("home")}
        {card("corporate")}
      </div>
    </section>
  );
}

