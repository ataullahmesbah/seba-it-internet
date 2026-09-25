import { LeadList } from "@/components/admin/lead-pages";

export const metadata = { title: "Contact Messages" };

export default async function Page({ searchParams }: PageProps<"/admin/contact-messages">) {
  return <LeadList type="contact-messages" searchParams={await searchParams} />;
}
