import "server-only";
import { db } from "@/lib/db";
import type { FieldDef } from "@/features/fields";
import type { ResourceConfig } from "@/features/admin/resources";
import { SERVER_RESOURCES, delegate, loadOptions } from "@/server/admin/resources";

export const PAGE_SIZE = 20;

/** Paginated, filtered, searchable list for a CRUD resource (never unbounded). */
export async function listResource(cfg: ResourceConfig, sp: Record<string, string | string[] | undefined>) {
  const srv = SERVER_RESOURCES[cfg.key];
  const page = Math.max(1, Math.min(10000, Number(sp.page) || 1));
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const where: Record<string, unknown> = {};
  if (q && cfg.searchFields?.length) where.OR = cfg.searchFields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } }));
  for (const f of cfg.filters ?? []) {
    const v = sp[f.name];
    if (typeof v !== "string" || !v) continue;
    where[f.name] = v === "true" ? true : v === "false" ? false : v;
  }
  if (cfg.key === "packages" && sp.archived !== "1") where.archivedAt = null;
  const orderBy = srv.defaultOrderBy ?? (srv.hasDisplayOrder ? [...(cfg.orderScope ?? []).map((s) => ({ [s]: "asc" })), { displayOrder: "asc" }, { createdAt: "asc" }] : [{ createdAt: "desc" }]);
  const model = delegate(srv.model);
  const [total, rows] = await Promise.all([
    model.count({ where }),
    model.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, ...(srv.include ? { include: srv.include } : {}) }),
  ]);
  const options = await loadOptions((cfg.filters ?? []).map((f) => f.optionsKey).filter((x): x is string => Boolean(x)));
  return { rows, total, page, q, options };
}

function dhakaLocal(d: Date): string {
  const shifted = new Date(d.getTime() + 6 * 3600 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** Convert a DB row into initial form values for the generic form. */
export function toFormValues(fields: FieldDef[], row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const f of fields) {
    for (const k of f.bilingual ? [f.name + "En", f.name + "Bn"] : [f.name]) {
      const v = row[k];
      if (v instanceof Date) out[k] = dhakaLocal(v);
      else if (v !== null && typeof v === "object" && "toFixed" in (v as object)) out[k] = String(v);
    }
  }
  return out;
}

export async function loadResourceForForm(cfg: ResourceConfig, id: string | null) {
  const srv = SERVER_RESOURCES[cfg.key];
  const optionKeys = cfg.fields.flatMap((f) => [f.optionsKey, ...(f.fields ?? []).map((s) => s.optionsKey)]).filter((x): x is string => Boolean(x));
  const options = await loadOptions(optionKeys);
  let values: Record<string, unknown> = {};
  if (id) {
    const row = await delegate(srv.model).findUnique({ where: { id }, ...(srv.include ? { include: srv.include } : {}) });
    if (!row) return null;
    values = toFormValues(cfg.fields, srv.toForm ? srv.toForm(row) : row);
  } else {
    // Sensible defaults for new records.
    for (const f of cfg.fields) {
      if (f.type === "checkbox" && ["active", "published", "indexable"].includes(f.name)) values[f.name] = true;
      if (f.name === "displayOrder") values[f.name] = 100;
      if (f.name === "billingPeriod") values[f.name] = "MONTHLY";
      if (f.name === "status") values[f.name] = "DRAFT";
      if (f.name === "priority") values[f.name] = 0;
    }
  }
  const mediaIds = cfg.fields.filter((f) => f.type === "media").map((f) => values[f.name]).filter((v): v is string => typeof v === "string" && v !== "");
  const mediaRows = mediaIds.length ? await db.media.findMany({ where: { id: { in: mediaIds } } }) : [];
  const media = Object.fromEntries(mediaRows.map((m) => [m.id, { id: m.id, url: m.secureUrl, filename: m.filename ?? m.publicId }]));
  return { values, options, media };
}
