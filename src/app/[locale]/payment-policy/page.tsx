import { resolveLocale } from "@/server/page-context";
import { LegalPage, legalMetadata } from "@/components/public/legal-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/payment-policy">) {
  const { locale } = await resolveLocale(params);
  return legalMetadata("payment-policy", locale);
}

export default async function Page({ params }: PageProps<"/[locale]/payment-policy">) {
  const { locale } = await resolveLocale(params);
  return <LegalPage pageKey="payment-policy" locale={locale} />;
}
