import { LeadDetail } from "@/components/admin/lead-pages";

export const metadata = { title: "Connection Requests" };

export default async function Page({ params }: PageProps<"/admin/connections/[id]">) {
  return <LeadDetail type="connections" id={(await params).id} />;
}
