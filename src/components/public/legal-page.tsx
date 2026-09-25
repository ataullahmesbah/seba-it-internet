import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { pick, type AppLocale } from "@/lib/i18n";
import { sanitizeRichText } from "@/lib/sanitize";
import { getLegalPage } from "@/server/public-data";
import { buildMetadata } from "@/server/seo";

export async function legalMetadata(key: string, locale: AppLocale) {
  const page = await getLegalPage(key);
  if (!page) return { title: "404", robots: { index: false } };
  return buildMetadata({ routeKey: key, path: `/${key}`, locale, title: pick(page, "title", locale) });
}

export async function LegalPage({ pageKey, locale }: { pageKey: string; locale: AppLocale }) {
  const page = await getLegalPage(pageKey);
  if (!page) notFound();
  return (
    <>
      <header className="hero-bg py-12 text-white sm:py-16">
        <div className="container-x max-w-4xl">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{pick(page, "title", locale)}</h1>
          <p className="mt-2 text-sm text-white/70">
            {locale === "bn" ? "সর্বশেষ হালনাগাদ" : "Last updated"}: {formatDate(page.updatedAt, locale)}
          </p>
        </div>
      </header>
      <div className="container-x max-w-4xl py-10">
        <div className="card prose-content p-6 sm:p-10" dangerouslySetInnerHTML={{ __html: sanitizeRichText(pick(page, "content", locale)) }} />
      </div>
    </>
  );
}
