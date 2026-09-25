import { formatMoney } from "@/lib/utils";
import { pick } from "@/lib/i18n";
import { rows, s } from "@/features/section-utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getCoverageTree, getPackages, getPageSections } from "@/server/public-data";
import { PageHero, SectionHeading } from "@/components/public/blocks";
import { ConnectionForm } from "@/components/public/lead-forms";

export async function generateMetadata({ params }: PageProps<"/[locale]/get-connection">) {
  const { locale, dict } = await resolveLocale(params);
  return buildMetadata({ routeKey: "get-connection", path: "/get-connection", locale, title: dict.common.getConnection });
}

export default async function GetConnectionPage({ params, searchParams }: PageProps<"/[locale]/get-connection">) {
  const { locale, dict } = await resolveLocale(params);
  const sp = await searchParams;
  const packageId = typeof sp.package === "string" ? sp.package : undefined;
  const service = sp.service === "corporate" ? "CORPORATE" : "HOME";
  const [{ sections, media }, tree, packages] = await Promise.all([getPageSections("get-connection"), getCoverageTree(), getPackages()]);
  const districts = tree.map((d) => ({ id: d.id, nameEn: d.nameEn, nameBn: d.nameBn }));
  const options = packages.map((p) => ({ id: p.id, label: `${pick(p, "name", locale)} — ${p.speedMbps} Mbps — ৳${formatMoney(p.price, locale)}${dict.common.perMonth}` }));

  return (
    <>
      <PageHero data={sections.hero} media={media} locale={locale} />
      <section className="relative z-10 -mt-8 pb-12 sm:-mt-12 sm:pb-16">
        <div className="container-x grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-ink">{s(sections.form, "title", locale) || dict.forms.connectionFormTitle}</h2>
            <p className="mt-1 mb-6 text-sm text-muted">{s(sections.form, "subtitle", locale) || dict.forms.connectionFormSubtitle}</p>
            <ConnectionForm districts={districts} packages={options} locale={locale} dict={dict} initialPackageId={packageId} initialService={service} />
          </div>
          {rows(sections.steps, "items").length > 0 && (
            <aside className="card h-fit p-6 sm:p-8">
              <SectionHeading title={s(sections.steps, "title", locale)} subtitle={s(sections.steps, "subtitle", locale)} className="!mb-6" />
              <ol className="space-y-5">
                {rows(sections.steps, "items").map((it, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-ink">{locale === "bn" ? it.titleBn : it.titleEn}</p>
                      <p className="text-sm text-muted">{locale === "bn" ? it.descBn : it.descEn}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </div>
      </section>
    </>
  );
}

