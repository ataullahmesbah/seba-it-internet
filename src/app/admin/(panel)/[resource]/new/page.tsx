import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { getResource } from "@/features/admin/resources";
import { SERVER_RESOURCES } from "@/server/admin/resources";
import { loadResourceForForm } from "@/server/admin/resource-data";
import { saveResourceAction } from "@/server/admin/resource-actions";
import { PageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";

export const metadata = { title: "Create" };

export default async function NewResourcePage({ params }: PageProps<"/admin/[resource]/new">) {
  const { resource } = await params;
  const cfg = getResource(resource);
  const srv = SERVER_RESOURCES[resource];
  if (!cfg || !srv) notFound();
  const ctx = await requireAdminPage(srv.write);
  const data = await loadResourceForForm(cfg, null);
  if (!data) notFound();
  return (
    <div>
      <PageHeader title={`New ${cfg.singular.toLowerCase()}`} back={{ href: `/admin/${resource}`, label: cfg.title }} />
      <ResourceForm
        action={saveResourceAction.bind(null, resource, null)}
        fields={cfg.fields}
        values={data.values}
        options={data.options}
        media={data.media}
        cancelHref={`/admin/${resource}`}
        submitLabel="Create"
        needsReauth={cfg.sensitive && !hasRecentAuth(ctx)}
      />
    </div>
  );
}
