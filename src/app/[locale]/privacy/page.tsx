import { resolveLocale } from "@/server/page-context";
import { LegalPage, legalMetadata } from "@/components/public/legal-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await resolveLocale(params);
  return legalMetadata("privacy", locale);
}

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await resolveLocale(params);
  return <LegalPage pageKey="privacy" locale={locale} />;
}
