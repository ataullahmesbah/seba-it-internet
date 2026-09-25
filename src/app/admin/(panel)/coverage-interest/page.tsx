import { LeadList } from "@/components/admin/lead-pages";

export const metadata = { title: "Coverage Interest" };

export default async function Page({ searchParams }: PageProps<"/admin/coverage-interest">) {
  return <LeadList type="coverage-interest" searchParams={await searchParams} />;
}
