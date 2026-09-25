import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { PAGE_SECTIONS } from "@/features/sections";
import { saveSectionAction } from "@/server/admin/page-actions";
import { PageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";

export const metadata = { title: "Edit section" };

export default async function EditSectionPage({ params }: PageProps<"/admin/pages/[page]/[section]">) {
  await requireAdminPage("home.update");
  const { page: key, section } = await params;
  const def = PAGE_SECTIONS[key]?.sections[section];
  if (!def) notFound();
  const row = await db.pageSection.findFirst({ where: { page: { key }, type: section } });
  const values = (row?.data ?? {}) as Record<string, unknown>;
  const mediaIds = Object.entries(values).filter(([k, v]) => /mediaId$/i.test(k) && typeof v === "string" && v).map(([, v]) => v as string);
  const media = mediaIds.length ? await db.media.findMany({ where: { id: { in: mediaIds } } }) : [];
  return (
    <div>
      <PageHeader title={def.label} description={`${PAGE_SECTIONS[key].label} page · ${def.description ?? "English and Bangla content"}`} back={{ href: `/admin/pages/${key}`, label: `${PAGE_SECTIONS[key].label} page` }} />
      <ResourceForm
        action={saveSectionAction.bind(null, key, section)}
        fields={def.fields}
        values={values}
        media={Object.fromEntries(media.map((m) => [m.id, { id: m.id, url: m.secureUrl, filename: m.filename ?? m.publicId }]))}
        cancelHref={`/admin/pages/${key}`}
      />
    </div>
  );
}
