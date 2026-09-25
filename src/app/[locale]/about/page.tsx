import { Eye, Target } from "lucide-react";
import { raw, rows, s } from "@/features/section-utils";
import { sanitizeRichText } from "@/lib/sanitize";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getOffices, getPageSections } from "@/server/public-data";
import { CtaBanner, FeatureGrid, PageHero, SectionHeading, StatsBand } from "@/components/public/blocks";
import { OfficeCard } from "@/components/public/office-card";
import { MediaImage } from "@/components/public/media-image";
import { NetworkDots } from "@/components/public/art";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await resolveLocale(params);
  return buildMetadata({ routeKey: "about", path: "/about", locale, title: locale === "bn" ? "আমাদের সম্পর্কে" : "About Us" });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale, dict } = await resolveLocale(params);
  const [{ sections, media, order }, offices] = await Promise.all([getPageSections("about"), getOffices()]);
  const story = sections.story;
  const storyImg = media[raw(story, "mediaId")];

  const render: Record<string, () => React.ReactNode> = {
    hero: () => <PageHero key="hero" data={sections.hero} media={media} locale={locale} />,
    story: () =>
      story ? (
        <section key="story" className="section" aria-labelledby="about-story">
          <div className="container-x grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 id="about-story" className="h2">
                {s(story, "title", locale)}
              </h2>
              <div className="prose-content mt-4" dangerouslySetInnerHTML={{ __html: sanitizeRichText(s(story, "body", locale)) }} />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-primary-soft to-accent-soft">
              {storyImg ? <MediaImage media={storyImg} locale={locale} className="object-cover" sizes="(min-width:1024px) 50vw, 100vw" /> : <NetworkDots className="absolute inset-0 m-auto h-3/4 w-3/4" />}
            </div>
          </div>
        </section>
      ) : null,
    missionVision: () =>
      sections.missionVision ? (
        <section key="mv" className="pb-12 sm:pb-16">
          <div className="container-x grid gap-6 md:grid-cols-2">
            {(
              [
                ["mission", dict.about.mission, Target],
                ["vision", dict.about.vision, Eye],
              ] as const
            ).map(([k, label, I]) => (
              <article key={k} className="card p-7">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
                  <I className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-4 text-xl font-bold text-ink">{label}</h2>
                <p className="mt-2 leading-7 text-slate-700">{s(sections.missionVision, k, locale)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null,
    highlights: () =>
      rows(sections.highlights, "items").length ? (
        <section key="hl" className="section bg-white" aria-labelledby="about-hl">
          <div className="container-x">
            <SectionHeading id="about-hl" title={s(sections.highlights, "title", locale)} subtitle={s(sections.highlights, "subtitle", locale)} />
            <FeatureGrid items={rows(sections.highlights, "items")} locale={locale} />
          </div>
        </section>
      ) : null,
    stats: () => <StatsBand key="stats" data={sections.stats} locale={locale} />,
    offices: () =>
      offices.length ? (
        <section key="offices" className="section" aria-labelledby="about-offices">
          <div className="container-x">
            <SectionHeading id="about-offices" title={s(sections.offices, "title", locale) || dict.about.offices} subtitle={s(sections.offices, "subtitle", locale)} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {offices.map((o) => (
                <OfficeCard key={o.id} office={o} locale={locale} dict={dict} />
              ))}
            </div>
          </div>
        </section>
      ) : null,
    finalCta: () => <CtaBanner key="finalCta" data={sections.finalCta} locale={locale} />,
  };
  return <>{order.map((t) => render[t]?.() ?? null)}</>;
}
