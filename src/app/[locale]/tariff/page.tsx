import { notFound } from "next/navigation";
import { CalendarDays, Download, ExternalLink, FileText, Hash } from "lucide-react";
import { pick } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getTariffDocuments } from "@/server/public-data";

export async function generateMetadata({ params }: PageProps<"/[locale]/tariff">) {
  const { locale, dict } = await resolveLocale(params);
  const docs = await getTariffDocuments();
  return buildMetadata({ routeKey: "tariff", path: "/tariff", locale, title: dict.tariff.title, description: dict.tariff.subtitle, noindex: docs.length === 0 });
}

/** Cloudinary PDFs are served through our own origin (/api/v1/public/tariff/:id/file) so they embed reliably. */
function embeddable(url: string) {
  try {
    return new URL(url).hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

const fileRoute = (id: string, download = false) => `/api/v1/public/tariff/${id}/file${download ? "?download=1" : ""}`;

export default async function TariffPage({ params }: PageProps<"/[locale]/tariff">) {
  const { locale, dict } = await resolveLocale(params);
  const docs = await getTariffDocuments();
  // The page exists only while at least one tariff document is active.
  if (docs.length === 0) notFound();
  const t = dict.tariff;

  return (
    <>
      <header className="hero-bg py-12 text-white sm:py-16">
        <div className="container-x">
          <p className="eyebrow mb-2">BTRC</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-white/80">{t.subtitle}</p>
        </div>
      </header>

      <section className="section">
        <div className="container-x space-y-10">
          {docs.length > 1 && (
            <nav aria-label={t.documents} className="card p-4">
              <ol className="grid gap-2 sm:grid-cols-2">
                {docs.map((d, i) => (
                  <li key={d.id}>
                    <a href={`#doc-${d.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-soft hover:text-primary">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">{i + 1}</span>
                      {pick(d, "title", locale) || d.titleEn}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {docs.map((d) => {
            const title = pick(d, "title", locale) || d.titleEn;
            const desc = pick(d, "description", locale);
            const proxied = embeddable(d.fileUrl);
            const openHref = proxied ? fileRoute(d.id) : d.fileUrl;
            const downloadHref = proxied ? fileRoute(d.id, true) : d.fileUrl;
            return (
              <article key={d.id} id={`doc-${d.id}`} className="card scroll-mt-28 overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-danger">
                      <FileText className="h-6 w-6" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-ink">{title}</h2>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        {d.memoNumber && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5" aria-hidden /> {t.memo}: {d.memoNumber}
                          </span>
                        )}
                        {d.issuedAt && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {t.issued}: {formatDate(d.issuedAt, locale)}
                          </span>
                        )}
                      </p>
                      {desc && <p className="mt-2 max-w-2xl text-sm text-slate-700">{desc}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a href={openHref} target="_blank" rel="noopener noreferrer" className="btn-outline !min-h-10">
                      <ExternalLink className="h-4 w-4" aria-hidden /> {t.open}
                    </a>
                    <a href={downloadHref} download={d.fileName || undefined} className="btn-primary !min-h-10">
                      <Download className="h-4 w-4" aria-hidden /> {t.download}
                    </a>
                  </div>
                </div>
                {proxied && (
                  <div className="hidden bg-slate-100 md:block">
                    <iframe src={`${fileRoute(d.id)}#view=FitH`} title={title} className="h-[80vh] min-h-[600px] w-full" loading="lazy" />
                    <p className="px-6 py-2 text-xs text-muted">{t.viewerNote}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}