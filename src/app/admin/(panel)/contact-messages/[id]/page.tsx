import { LeadDetail } from "@/components/admin/lead-pages";

export const metadata = { title: "Contact Messages" };

export default async function Page({ params }: PageProps<"/admin/contact-messages/[id]">) {
  return <LeadDetail type="contact-messages" id={(await params).id} />;
}
