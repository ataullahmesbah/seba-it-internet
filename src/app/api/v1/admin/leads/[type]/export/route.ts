import { fail } from "@/lib/api/response";
import { withAdmin } from "@/server/admin/api";
import { LEADS, isLeadType, listLeads } from "@/server/admin/leads";
import { audit } from "@/server/audit";

/** Neutralize spreadsheet formula injection. */
function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request, ctx: RouteContext<"/api/v1/admin/leads/[type]/export">) {
  const { type } = await ctx.params;
  if (!isLeadType(type)) return fail("NOT_FOUND", "Unknown lead type.");
  return withAdmin(req, LEADS[type].perm, async (admin) => {
    const sp = new URL(req.url).searchParams;
    const filters = Object.fromEntries(["q", "status", "service", "districtId", "packageId", "from", "to"].map((k) => [k, sp.get(k) ?? undefined]));
    const { rows } = await listLeads(type, filters, 1, 5000);
    const header = ["Reference", "Name", "Contact", "Summary", "Details", "Status", "Created (UTC)"];
    const body = rows.map((r) => [r.ref, r.name, r.contact, r.summary, r.extra ?? "", r.status, r.createdAt].map(csvCell).join(","));
    await audit(admin.userId, "leads.export", LEADS[type].entity, null, { rows: rows.length });
    return new Response("﻿" + [header.map(csvCell).join(","), ...body].join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
