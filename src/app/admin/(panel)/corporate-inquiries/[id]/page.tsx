import { LeadDetail } from "@/components/admin/lead-pages";

export const metadata = { title: "Corporate Inquiries" };

export default async function Page({ params }: PageProps<"/admin/corporate-inquiries/[id]">) {
  return <LeadDetail type="corporate-inquiries" id={(await params).id} />;
}
