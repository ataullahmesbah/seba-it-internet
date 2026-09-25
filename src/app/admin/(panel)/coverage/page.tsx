import Link from "next/link";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { requireAdminPage, can } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { ToggleActive } from "@/components/admin/toggle-active";

export const metadata = { title: "Coverage" };

export default async function CoveragePage({ searchParams }: PageProps<"/admin/coverage">) {
  const ctx = await requireAdminPage(["coverage.read", "coverage.manage"]);
  const canWrite = can(ctx, "coverage.manage");
  const sp = await searchParams;
  const districts = await db.district.findMany({ orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }], include: { _count: { select: { thanas: true } } } });
  const dId = (typeof sp.d === "string" && districts.some((d) => d.id === sp.d) ? sp.d : districts[0]?.id) ?? null;
  const thanas = dId ? await db.thana.findMany({ where: { districtId: dId }, orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }], include: { _count: { select: { areas: true } } } }) : [];
  const tId = (typeof sp.t === "string" && thanas.some((t) => t.id === sp.t) ? sp.t : thanas[0]?.id) ?? null;
  const areas = tId ? await db.coverageArea.findMany({ where: { thanaId: tId }, orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }] }) : [];
  const [activeAreas, totalAreas] = await Promise.all([db.coverageArea.count({ where: { active: true } }), db.coverageArea.count()]);

  const col = (title: string, addHref: string | null, manageHref: string, children: React.ReactNode) => (
    <section className="card flex min-h-80 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="flex gap-1">
          <Link href={manageHref} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-slate-100">Manage</Link>
          {canWrite && addHref && (
            <Link href={addHref} className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-white">
              <Plus className="h-3.5 w-3.5" /> Add
            </Link>
          )}
        </span>
      </header>
      <ul className="flex-1 divide-y divide-line overflow-y-auto">{children}</ul>
    </section>
  );

  return (
    <div>
      <PageHeader
        title="Coverage"
        description={`District → Thana/Upazila → Area. ${activeAreas} of ${totalAreas} areas are active. Deactivating a parent hides everything under it on the website.`}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {col(
          "Districts",
          "/admin/coverage-districts/new",
          "/admin/coverage-districts",
          districts.map((d) => (
            <li key={d.id} className={cn("flex items-center gap-2 px-4 py-2.5", d.id === dId && "bg-primary-soft")}>
              <ToggleActive resource="coverage-districts" id={d.id} active={d.active} label={d.nameEn} disabled={!canWrite} confirmText={`Deactivate ${d.nameEn}? All its thanas and areas will be hidden from the website.`} />
              <Link href={`/admin/coverage?d=${d.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{d.nameEn} <span className="text-muted">· {d.nameBn}</span></span>
                <span className="flex items-center gap-1 text-xs text-muted">{d._count.thanas} <ChevronRight className="h-4 w-4" /></span>
              </Link>
              <Link href={`/admin/coverage-districts/${d.id}`} className="rounded p-1 text-muted hover:text-primary" aria-label={`Edit ${d.nameEn}`}><Pencil className="h-3.5 w-3.5" /></Link>
            </li>
          )),
        )}
        {col(
          "Thanas / Upazilas",
          dId ? `/admin/coverage-thanas/new` : null,
          `/admin/coverage-thanas${dId ? `?districtId=${dId}` : ""}`,
          thanas.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted">No thanas yet</li>
          ) : (
            thanas.map((t) => (
              <li key={t.id} className={cn("flex items-center gap-2 px-4 py-2.5", t.id === tId && "bg-primary-soft")}>
                <ToggleActive resource="coverage-thanas" id={t.id} active={t.active} label={t.nameEn} disabled={!canWrite} confirmText={`Deactivate ${t.nameEn}? All its areas will be hidden from the website.`} />
                <Link href={`/admin/coverage?d=${dId}&t=${t.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{t.nameEn} <span className="text-muted">· {t.nameBn}</span></span>
                  <span className="flex items-center gap-1 text-xs text-muted">{t._count.areas} <ChevronRight className="h-4 w-4" /></span>
                </Link>
                <Link href={`/admin/coverage-thanas/${t.id}`} className="rounded p-1 text-muted hover:text-primary" aria-label={`Edit ${t.nameEn}`}><Pencil className="h-3.5 w-3.5" /></Link>
              </li>
            ))
          ),
        )}
        {col(
          "Areas",
          tId ? `/admin/coverage-areas/new` : null,
          `/admin/coverage-areas${tId ? `?thanaId=${tId}` : ""}`,
          areas.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted">No areas yet</li>
          ) : (
            areas.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-4 py-2.5">
                <ToggleActive resource="coverage-areas" id={a.id} active={a.active} label={a.nameEn} disabled={!canWrite} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {a.nameEn} <span className="text-muted">· {a.nameBn}</span>
                  {a.internalNote && <span className="block truncate text-[11px] text-amber-700">Note: {a.internalNote}</span>}
                </span>
                <Link href={`/admin/coverage-areas/${a.id}`} className="rounded p-1 text-muted hover:text-primary" aria-label={`Edit ${a.nameEn}`}><Pencil className="h-3.5 w-3.5" /></Link>
              </li>
            ))
          ),
        )}
      </div>
    </div>
  );
}
