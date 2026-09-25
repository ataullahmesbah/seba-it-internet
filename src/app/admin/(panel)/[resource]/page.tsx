import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Search } from "lucide-react";
import { requireAdminPage, can } from "@/lib/auth/guard";
import { getResource, type Column } from "@/features/admin/resources";
import { SERVER_RESOURCES } from "@/server/admin/resources";
import { PAGE_SIZE, listResource } from "@/server/admin/resource-data";
import { Badge, EmptyState, Flash, PageHeader, Pagination } from "@/components/admin/ui";
import { DeleteRowButton, MoveButtons } from "@/components/admin/row-actions";
import { formatDateTime, formatMoney } from "@/lib/utils";

function cell(row: Record<string, unknown>, c: Column): React.ReactNode {
  const v = c.key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), row);
  switch (c.type) {
    case "bool":
      return v ? <Badge tone="green">Yes</Badge> : <span className="text-muted">—</span>;
    case "status-active":
      return row.archivedAt ? <Badge tone="slate">Archived</Badge> : v ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>;
    case "badge":
      return v ? <Badge>{String(v)}</Badge> : "—";
    case "date":
      return v ? <span className="whitespace-nowrap text-muted">{formatDateTime(v as Date)}</span> : "—";
    case "money":
      return v !== null && v !== undefined ? `৳ ${formatMoney(String(v))}` : "—";
    case "mbps":
      return `${v} Mbps`;
    default:
      return v === null || v === undefined || v === "" ? <span className="text-muted">—</span> : String(v);
  }
}

export async function generateMetadata({ params }: PageProps<"/admin/[resource]">) {
  const cfg = getResource((await params).resource);
  return { title: cfg?.title ?? "Not found" };
}

export default async function ResourceListPage({ params, searchParams }: PageProps<"/admin/[resource]">) {
  const { resource } = await params;
  const cfg = getResource(resource);
  const srv = SERVER_RESOURCES[resource];
  if (!cfg || !srv) notFound();
  const ctx = await requireAdminPage(srv.read.concat(srv.write));
  const canWrite = can(ctx, srv.write);
  const sp = await searchParams;
  const { rows, total, page, q, options } = await listResource(cfg, sp);
  const base = `/admin/${resource}`;
  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page" && k !== "saved") u.set(k, v);
    if (p > 1) u.set("page", String(p));
    return `${base}${u.size ? `?${u}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        back={cfg.parent}
        actions={
          <>
            {resource === "blog" && <Link href="/admin/blog-categories" className="btn-outline !min-h-10">Categories</Link>}
            {resource === "faqs" && <Link href="/admin/faq-categories" className="btn-outline !min-h-10">Categories</Link>}
            {resource === "navigation" && <Link href="/admin/social-links" className="btn-outline !min-h-10">Social links</Link>}
            {resource === "packages" && (
              <Link href={sp.archived === "1" ? base : `${base}?archived=1`} className="btn-outline !min-h-10">
                {sp.archived === "1" ? "Hide archived" : "Show archived"}
              </Link>
            )}
            {canWrite && (
              <Link href={`${base}/new`} className="btn-primary !min-h-10">
                <Plus className="h-4 w-4" /> New {cfg.singular.toLowerCase()}
              </Link>
            )}
          </>
        }
      />
      <Flash message={sp.saved ? "Saved successfully. The public website has been updated." : null} />
      {!canWrite && <Flash tone="amber" message="Read-only access: you can view but not change this module." />}

      {(cfg.searchFields?.length || cfg.filters?.length) && (
        <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" role="search">
          {cfg.searchFields?.length ? (
            <div className="relative min-w-56 flex-1">
              <label htmlFor="q" className="sr-only">Search</label>
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input id="q" name="q" defaultValue={q} placeholder="Search…" className="input pl-9" />
            </div>
          ) : null}
          {(cfg.filters ?? []).map((f) => (
            <div key={f.name}>
              <label htmlFor={`flt-${f.name}`} className="mb-1 block text-xs text-muted">{f.label}</label>
              <select id={`flt-${f.name}`} name={f.name} defaultValue={typeof sp[f.name] === "string" ? (sp[f.name] as string) : ""} className="input !min-h-10">
                <option value="">All</option>
                {(f.options ?? options[f.optionsKey ?? ""] ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
          <button type="submit" className="btn-secondary !min-h-10">Apply</button>
          <Link href={base} className="btn !min-h-10 text-muted">Reset</Link>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState title={`No ${cfg.title.toLowerCase()} found`} body={q ? "Try another search." : undefined} action={canWrite ? <Link href={`${base}/new`} className="btn-primary">Create the first one</Link> : undefined} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs text-muted uppercase">
              <tr>
                {cfg.columns.map((c) => (
                  <th key={c.key} scope="col" className="px-4 py-3 font-semibold">{c.label}</th>
                ))}
                <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => {
                const id = String(row.id);
                const name = String(row[cfg.nameField] ?? "");
                return (
                  <tr key={id} className="hover:bg-slate-50/60">
                    {cfg.columns.map((c, i) => (
                      <td key={c.key} className="px-4 py-3">
                        {i === 0 ? (
                          <Link href={`${base}/${id}`} className="font-medium text-ink hover:text-primary">{cell(row, c)}</Link>
                        ) : c.type === "order" ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-8 text-muted">{String(row.displayOrder)}</span>
                            {canWrite && srv.hasDisplayOrder && <MoveButtons resource={resource} id={id} />}
                          </span>
                        ) : (
                          cell(row, c)
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className="flex justify-end gap-1">
                        <Link href={`${base}/${id}`} className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-primary" aria-label={`Edit ${name}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                        {canWrite && (
                          <DeleteRowButton
                            resource={resource}
                            id={id}
                            name={name}
                            description={
                              resource === "packages"
                                ? "Packages referenced by past connection requests are archived instead of deleted, so lead history stays intact."
                                : resource === "blog"
                                  ? "Published or draft posts are archived first (hidden, 404 publicly). Deleting an archived post removes it permanently."
                                  : resource.startsWith("coverage")
                                    ? "Parents with child records cannot be deleted. Consider deactivating instead so historical leads keep their location."
                                    : "This permanently removes the record from the website. This cannot be undone."
                            }
                          />
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={hrefFor} />
    </div>
  );
}
