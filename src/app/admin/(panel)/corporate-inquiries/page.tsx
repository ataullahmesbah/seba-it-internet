import { LeadList } from "@/components/admin/lead-pages";

export const metadata = { title: "Corporate Inquiries" };

export default async function Page({ searchParams }: PageProps<"/admin/corporate-inquiries">) {
  return <LeadList type="corporate-inquiries" searchParams={await searchParams} />;
}
