import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { EmptyState, PageHeader, Pagination } from "@/components/admin/ui";

export const metadata = { title: "Audit Logs" };
const PAGE_SIZE = 50;

/** Read-only, append-only audit trail (PRD 8.23). */
export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdminPage("audit.read");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim().slice(0, 100) : "");
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AuditLogWhereInput = {
    ...(s("action") ? { action: { contains: s("action"), mode: "insensitive" } } : {}),
    ...(s("entity") ? { entityType: s("entity") } : {}),
    ...(s("actor") ? { actorUserId: s("actor") } : {}),
    ...(s("from") || s("to") ? { createdAt: { ...(s("from") ? { gte: new Date(`${s("from")}T00:00:00+06:00`) } : {}), ...(s("to") ? { lte: new Date(`${s("to")}T23:59:59+06:00`) } : {}) } } : {}),
  };
  const [total, logs, actors, entities] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { actor: { select: { displayName: true, email: true } } } }),
    db.user.findMany({ select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, where: { entityType: { not: null } }, take: 100 }),
  ]);
  const qs = new URLSearchParams(Object.entries({ action: s("action"), entity: s("entity"), actor: s("actor"), from: s("from"), to: s("to") }).filter(([, v]) => v));
  return (
    <div>
      <PageHeader title="Audit Logs" description="Security and content changes. Records cannot be edited or deleted from the dashboard. IPs are stored as privacy-preserving hashes." />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <input name="action" defaultValue={s("action")} placeholder="Action contains… (e.g. login)" className="input lg:col-span-2" aria-label="Action" />
        <select name="entity" defaultValue={s("entity")} className="input" aria-label="Entity">
          <option value="">All entities</option>
          {entities.map((e) => <option key={e.entityType} value={e.entityType!}>{e.entityType}</option>)}
        </select>
        <select name="actor" defaultValue={s("actor")} className="input" aria-label="Actor">
          <option value="">All users</option>
          {actors.map((a) => <option key={a.id} value={a.id}>{a.displayName}</option>)}
        </select>
        <input type="date" name="from" defaultValue={s("from")} className="input" aria-label="From" />
        <div className="flex gap-2">
          <input type="date" name="to" defaultValue={s("to")} className="input" aria-label="To" />
          <button type="submit" className="btn-secondary !min-h-11">Go</button>
        </div>
      </form>
      {logs.length === 0 ? (
        <EmptyState title="No audit records" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Time</th>
                <th scope="col" className="px-4 py-3">Actor</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">Entity</th>
                <th scope="col" className="px-4 py-3">Details</th>
                <th scope="col" className="px-4 py-3">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-2.5">{l.actor ? l.actor.displayName : <span className="text-muted">System / anonymous</span>}</td>
                  <td className="px-4 py-2.5"><code className="text-xs">{l.action}</code></td>
                  <td className="px-4 py-2.5 text-xs">{l.entityType}{l.entityId ? <span className="block text-muted">{l.entityId}</span> : null}</td>
                  <td className="max-w-xs px-4 py-2.5 font-mono text-[11px] break-words text-muted">{l.metadata ? JSON.stringify(l.metadata).slice(0, 300) : ""}</td>
                  <td className="px-4 py-2.5 text-[11px] text-muted">{l.userAgent?.slice(0, 60)}{l.ipHash ? <span className="block">ip#{l.ipHash.slice(0, 8)}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/admin/audit?${new URLSearchParams([...qs, ...(p > 1 ? [["page", String(p)]] : [])])}`} />
      <p className="mt-2 text-xs text-muted"><Link href="/admin/audit" className="underline">Reset filters</Link></p>
    </div>
  );
}
