import { LeadList } from "@/components/admin/lead-pages";

export const metadata = { title: "Connection Requests" };

export default async function Page({ searchParams }: PageProps<"/admin/connections">) {
  return <LeadList type="connections" searchParams={await searchParams} />;
}
