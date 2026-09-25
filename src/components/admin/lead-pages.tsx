import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Mail, Phone, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/utils";
import { displayBdPhone } from "@/lib/validation/phone";
import { LEADS, getLead, listLeads, type LeadType } from "@/server/admin/leads";
import { anonymizeLeadAction, updateLeadAction } from "@/server/admin/lead-actions";
import { Badge, Card, DefinitionList, EmptyState, PageHeader, Pagination } from "./ui";
import { LeadStatusForm } from "./lead-status-form";
import { ConfirmButton } from "./confirm-button";

const PAGE_SIZE = 25;
type SP = Record<string, string | string[] | undefined>;
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function LeadList({ type, searchParams }: { type: LeadType; searchParams: SP }) {
  const def = LEADS[type];
  await requireAdminPage(def.perm);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const filters = { q: str(searchParams.q), status: str(searchParams.status), service: str(searchParams.service), districtId: str(searchParams.districtId), packageId: str(searchParams.packageId), from: str(searchParams.from), to: str(searchParams.to) };
  const [{ rows, total }, districts, packages] = await Promise.all([
    listLeads(type, filters, page, PAGE_SIZE),
    type !== "contact-messages" ? db.district.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true } }) : [],
    type === "connections" ? db.package.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, nameEn: true, speedMbps: true } }) : [],
  ]);
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  const hrefFor = (p: number) => {
    const u = new URLSearchParams(qs);
    if (p > 1) u.set("page", String(p));
    return `/admin/${type}${u.size ? `?${u}` : ""}`;
  };
  return (
    <div>
      <PageHeader
        title={def.title}
        actions={
          <a href={`/api/v1/admin/leads/${type}/export?${qs}`} className="btn-outline !min-h-10">
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]" role="search">
        <div className="relative">
          <label htmlFor="lq" className="sr-only">Search</label>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="lq" name="q" defaultValue={filters.q} placeholder="Name, phone, reference…" className="input pl-9" />
        </div>
        <select name="status" defaultValue={filters.status ?? ""} className="input" aria-label="Status">
          <option value="">All statuses</option>
          {def.statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        {type === "connections" ? (
          <select name="service" defaultValue={filters.service ?? ""} className="input" aria-label="Service">
            <option value="">All services</option>
            <option value="HOME">Home</option>
            <option value="CORPORATE">Corporate</option>
          </select>
        ) : districts.length ? (
          <select name="districtId" defaultValue={filters.districtId ?? ""} className="input" aria-label="District">
            <option value="">All districts</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
          </select>
        ) : <span className="hidden lg:block" />}
        <input type="date" name="from" defaultValue={filters.from} className="input" aria-label="From date" />
        <input type="date" name="to" defaultValue={filters.to} className="input" aria-label="To date" />
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary !min-h-11">Filter</button>
          <Link href={`/admin/${type}`} className="btn !min-h-11 text-muted">Reset</Link>
        </div>
        {type === "connections" && (
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-6 lg:grid-cols-4">
            <select name="districtId" defaultValue={filters.districtId ?? ""} className="input" aria-label="District">
              <option value="">All districts</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
            </select>
            <select name="packageId" defaultValue={filters.packageId ?? ""} className="input" aria-label="Package">
              <option value="">All packages</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.nameEn} ({p.speedMbps} Mbps)</option>)}
            </select>
          </div>
        )}
      </form>
      {rows.length === 0 ? (
        <EmptyState title="No records match" body="New submissions from the website appear here instantly." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Reference</th>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Contact</th>
                <th scope="col" className="px-4 py-3">Details</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/admin/${type}/${r.id}`} className="font-semibold text-primary hover:underline">{r.ref}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.contact}</td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="block truncate">{r.summary}</span>
                    {r.extra && <span className="block truncate text-xs text-muted">{r.extra}</span>}
                  </td>
                  <td className="px-4 py-3"><Badge>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={hrefFor} />
    </div>
  );
}

export async function LeadDetail({ type, id }: { type: LeadType; id: string }) {
  const def = LEADS[type];
  await requireAdminPage(def.perm);
  const lead = await getLead(type, id);
  if (!lead) notFound();
  const r = lead.record;
  // Opening an unread contact message marks it as read.
  if (type === "contact-messages" && r.status === "UNREAD") {
    await db.contactMessage.update({ where: { id }, data: { status: "READ" } });
    r.status = "READ";
  }
  const phone = typeof r.phone === "string" && r.phone.startsWith("+880") ? displayBdPhone(r.phone) : (r.phone as string | null);
  const email = r.email as string | null;
  const g = (k: string) => (r[k] === null || r[k] === undefined ? null : String(r[k]));
  const rows: Array<[string, React.ReactNode]> =
    type === "connections"
      ? [
          ["Name", g("name")],
          ["Phone", phone],
          ["Email", email],
          ["Service", g("serviceType")],
          ["Package", g("packageSnapshot")],
          ["District", g("districtName")],
          ["Thana / Upazila", g("thanaName")],
          ["Area", <span key="a">{g("areaName")} {r.areaCovered ? <Badge tone="green">Covered</Badge> : <Badge tone="amber">Not covered</Badge>}</span>],
          ["Full address", g("fullAddress")],
          ["Message", g("message")],
          ["Language", g("locale")],
          ["UTM", r.utm ? JSON.stringify(r.utm) : null],
        ]
      : type === "corporate-inquiries"
        ? [
            ["Company", g("companyName")],
            ["Contact person", g("contactPerson")],
            ["Phone", phone],
            ["Email", email],
            ["District", (r.district as { nameEn: string } | null)?.nameEn ?? null],
            ["Thana", (r.thana as { nameEn: string } | null)?.nameEn ?? null],
            ["Office address", g("officeAddress")],
            ["Required bandwidth", g("requiredBandwidth")],
            ["Number of users", g("numberOfUsers")],
            ["Message", g("message")],
            ["Language", g("locale")],
          ]
        : type === "contact-messages"
          ? [
              ["Name", g("name")],
              ["Phone", phone],
              ["Email", email],
              ["Subject", g("subject")],
              ["Message", <p key="m" className="whitespace-pre-wrap">{g("message")}</p>],
              ["Language", g("locale")],
            ]
          : [
              ["Name", g("name")],
              ["Phone", phone],
              ["Email", email],
              ["Location", g("locationSnapshot")],
              ["Area (free text)", g("freeTextArea")],
              ["Language", g("locale")],
            ];

  return (
    <div>
      <PageHeader title={r.referenceCode} description={`${def.title.replace(/s$/, "")} · received ${formatDateTime(r.createdAt)}`} back={{ href: `/admin/${type}`, label: def.title }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Submitted details" actions={<Badge>{r.status}</Badge>}>
            <DefinitionList items={rows} />
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              {phone && phone !== "[removed]" && (
                <a href={`tel:${String(r.phone)}`} className="btn-outline !min-h-9 text-xs"><Phone className="h-4 w-4" /> Call</a>
              )}
              {email && email !== "[removed]" && (
                <a href={`mailto:${email}?subject=${encodeURIComponent("Re: " + r.referenceCode)}`} className="btn-outline !min-h-9 text-xs"><Mail className="h-4 w-4" /> Reply by email</a>
              )}
            </div>
          </Card>
          <Card title="Status history">
            {lead.history.length === 0 ? (
              <p className="text-sm text-muted">No changes yet.</p>
            ) : (
              <ol className="space-y-3">
                {lead.history.map((h) => (
                  <li key={h.id} className="border-l-2 border-primary/30 pl-3 text-sm">
                    <p>
                      {h.fromStatus && h.fromStatus !== h.toStatus ? (
                        <>
                          <Badge>{h.fromStatus}</Badge> → <Badge>{h.toStatus}</Badge>
                        </>
                      ) : (
                        <Badge>{h.toStatus}</Badge>
                      )}
                    </p>
                    {h.note && <p className="mt-1 text-slate-700">{h.note}</p>}
                    <p className="mt-0.5 text-xs text-muted">{h.actor?.displayName ?? "System"} · {formatDateTime(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
        <aside className="space-y-4">
          <Card title="Update">
            <LeadStatusForm action={updateLeadAction.bind(null, type, id)} statuses={def.statuses} status={r.status} note={r.internalNote ?? ""} />
          </Card>
          <Card title="Privacy">
            <p className="mb-3 text-xs text-muted">Remove personal data for a privacy/deletion request. The reference and status remain for reporting.</p>
            <ConfirmButton
              action={anonymizeLeadAction}
              fields={{ type, id }}
              label="Anonymize record"
              title={`Anonymize ${r.referenceCode}?`}
              description="Name, phone, email, address and messages will be permanently removed. This cannot be undone."
              confirmLabel="Anonymize"
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}
