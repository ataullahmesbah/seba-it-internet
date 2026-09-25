import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { requireAdminPage, can } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { getResource } from "@/features/admin/resources";
import { SERVER_RESOURCES } from "@/server/admin/resources";
import { loadResourceForForm } from "@/server/admin/resource-data";
import { saveResourceAction } from "@/server/admin/resource-actions";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Flash } from "@/components/admin/ui";
import { FieldsGrid, ResourceForm } from "@/components/admin/resource-form";

export const metadata = { title: "Edit" };

export default async function EditResourcePage({ params }: PageProps<"/admin/[resource]/[id]">) {
  const { resource, id } = await params;
  const cfg = getResource(resource);
  const srv = SERVER_RESOURCES[resource];
  if (!cfg || !srv) notFound();
  const ctx = await requireAdminPage(srv.read.concat(srv.write));
  const data = await loadResourceForForm(cfg, id);
  if (!data) notFound();
  const canWrite = can(ctx, srv.write);
  const name = String(data.values[cfg.nameField] ?? cfg.singular);
  const meta = (
    <div className="card space-y-2 p-5 text-xs text-muted">
      {data.values.createdAt instanceof Date ? <p>Created: {formatDateTime(data.values.createdAt)}</p> : null}
      {data.values.updatedAt instanceof Date ? <p>Updated: {formatDateTime(data.values.updatedAt)}</p> : null}
      {cfg.preview && (
        <Link href={cfg.preview(id)} target="_blank" className="btn-outline mt-2 w-full !min-h-9 text-xs">
          <Eye className="h-4 w-4" /> Preview
        </Link>
      )}
    </div>
  );
  return (
    <div>
      <PageHeader title={name} description={`Edit ${cfg.singular.toLowerCase()}`} back={{ href: `/admin/${resource}`, label: cfg.title }} />
      {canWrite ? (
        <ResourceForm
          action={saveResourceAction.bind(null, resource, id)}
          fields={cfg.fields}
          values={data.values}
          options={data.options}
          media={data.media}
          cancelHref={`/admin/${resource}`}
          needsReauth={cfg.sensitive && !hasRecentAuth(ctx)}
          aside={meta}
        />
      ) : (
        <>
          <Flash tone="amber" message="Read-only access." />
          <fieldset disabled className="card p-6">
            <FieldsGrid fields={cfg.fields} values={data.values} errors={{}} options={data.options} media={data.media} />
          </fieldset>
        </>
      )}
    </div>
  );
}
