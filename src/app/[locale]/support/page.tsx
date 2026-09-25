import { headers } from "next/headers";
import { pick } from "@/lib/i18n";
import { s } from "@/features/section-utils";
import { stripTags } from "@/lib/sanitize";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getFaqs, getPageSections, getSite } from "@/server/public-data";
import { getGeneralSettings } from "@/server/settings";
import { toFaqItems } from "@/server/faq-items";
import { CtaBanner, PageHero, SectionHeading } from "@/components/public/blocks";
import { SupportChannels } from "@/components/public/support-channels";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { JsonLd } from "@/components/public/json-ld";

export async function generateMetadata({ params }: PageProps<"/[locale]/support">) {
  const { locale, dict } = await resolveLocale(params);
  return buildMetadata({ routeKey: "support", path: "/support", locale, title: dict.support.faqTitle });
}

export default async function SupportPage({ params }: PageProps<"/[locale]/support">) {
  const { locale, dict } = await resolveLocale(params);
  const [{ sections, media, order }, faqs, site, settings] = await Promise.all([getPageSections("support"), getFaqs(), getSite(), getGeneralSettings()]);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const catName = (id: string | null) => {
    const c = faqs.categories.find((x) => x.id === id);
    return c ? pick(c, "name", locale) : dict.support.general;
  };
  const items = toFaqItems(faqs.faqs, locale, catName);

  const render: Record<string, () => React.ReactNode> = {
    hero: () => <PageHero key="hero" data={sections.hero} media={media} locale={locale} />,
    channels: () => (
      <section key="channels" className="section" aria-labelledby="sup-ch">
        <div className="container-x">
          <SectionHeading id="sup-ch" title={s(sections.channels, "title", locale) || dict.support.channels} subtitle={s(sections.channels, "subtitle", locale) || dict.support.channelsSub} />
          <SupportChannels
            site={site}
            locale={locale}
            dict={dict}
            chatEnabled={settings.chatEnabled}
            supportNote={locale === "bn" ? settings.supportAvailabilityBn : settings.supportAvailabilityEn}
          />
        </div>
      </section>
    ),
    faq: () =>
      items.length ? (
        <section key="faq" className="pb-12 sm:pb-16" aria-labelledby="sup-faq">
          <JsonLd
            nonce={nonce}
            data={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: stripTags(i.answerHtml) } })),
            }}
          />
          <div className="container-x max-w-4xl">
            <SectionHeading id="sup-faq" title={s(sections.faq, "title", locale) || dict.support.faqTitle} subtitle={s(sections.faq, "subtitle", locale) || dict.support.faqSub} />
            <FaqAccordion items={items} searchable grouped searchPlaceholder={dict.support.searchFaq} noResults={dict.common.noResults} />
          </div>
        </section>
      ) : null,
    finalCta: () => <CtaBanner key="finalCta" data={sections.finalCta} locale={locale} />,
  };
  return <>{order.map((t) => render[t]?.() ?? null)}</>;
}
