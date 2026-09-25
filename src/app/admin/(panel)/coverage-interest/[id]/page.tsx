import { LeadDetail } from "@/components/admin/lead-pages";

export const metadata = { title: "Coverage Interest" };

export default async function Page({ params }: PageProps<"/admin/coverage-interest/[id]">) {
  return <LeadDetail type="coverage-interest" id={(await params).id} />;
}
