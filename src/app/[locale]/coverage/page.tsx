import { MapPin } from "lucide-react";
import { fmt, pick } from "@/lib/i18n";
import { s } from "@/features/section-utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getCoverageTree, getPageSections } from "@/server/public-data";
import { getGeneralSettings } from "@/server/settings";
import { CtaBanner, PageHero, SectionHeading, StatsBand } from "@/components/public/blocks";
import { CoverageChecker } from "@/components/public/coverage-checker";

export async function generateMetadata({ params }: PageProps<"/[locale]/coverage">) {
  const { locale, dict } = await resolveLocale(params);
  return buildMetadata({ routeKey: "coverage", path: "/coverage", locale, title: dict.coverage.title });
}

export default async function CoveragePage({ params }: PageProps<"/[locale]/coverage">) {
  const { locale, dict } = await resolveLocale(params);
  const [{ sections, media, order }, tree, settings] = await Promise.all([getPageSections("coverage"), getCoverageTree(), getGeneralSettings()]);
  const districts = tree.map((d) => ({ id: d.id, nameEn: d.nameEn, nameBn: d.nameBn }));

  const render: Record<string, () => React.ReactNode> = {
    hero: () => <PageHero key="hero" data={sections.hero} media={media} locale={locale} />,
    checker: () => (
      <section key="checker" className="relative z-10 -mt-8 sm:-mt-12">
        <div className="container-x">
          <CoverageChecker
            districts={districts}
            locale={locale}
            dict={dict}
            title={s(sections.checker, "title", locale) || dict.coverage.title}
            subtitle={s(sections.checker, "subtitle", locale) || dict.coverage.subtitle}
            compact
          />
        </div>
      </section>
    ),
    browse: () =>
      settings.browseCoverageEnabled && tree.length ? (
        <section key="browse" className="section" aria-labelledby="cov-browse">
          <div className="container-x">
            <SectionHeading id="cov-browse" title={s(sections.browse, "title", locale) || dict.coverage.browseTitle} subtitle={s(sections.browse, "subtitle", locale) || dict.coverage.browseSubtitle} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {tree.map((d) => (
                <article key={d.id} className="card p-6">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                    <MapPin className="h-5 w-5 text-primary" aria-hidden /> {pick(d, "name", locale)}
                  </h3>
                  <div className="mt-4 space-y-4">
                    {d.thanas.map((t) => (
                      <div key={t.id}>
                        <p className="flex items-center justify-between text-sm font-semibold text-navy">
                          {pick(t, "name", locale)}
                          <span className="text-xs font-normal text-muted">{fmt(dict.coverage.areasCount, { n: t.areas.length })}</span>
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {t.areas.map((a) => (
                            <li key={a.id} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-navy">
                              {pick(a, "name", locale)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null,
    stats: () => <StatsBand key="stats" data={sections.stats} locale={locale} />,
    finalCta: () => <CtaBanner key="finalCta" data={sections.finalCta} locale={locale} />,
  };
  return <>{order.map((t) => render[t]?.() ?? null)}</>;
}
