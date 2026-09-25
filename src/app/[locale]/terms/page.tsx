import { resolveLocale } from "@/server/page-context";
import { LegalPage, legalMetadata } from "@/components/public/legal-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await resolveLocale(params);
  return legalMetadata("terms", locale);
}

export default async function Page({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await resolveLocale(params);
  return <LegalPage pageKey="terms" locale={locale} />;
}
