import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { LEGAL_PAGES, PAGE_SECTIONS } from "@/features/sections";
import { Badge, Flash, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Pages" };

export default async function PagesIndex({ searchParams }: PageProps<"/admin/pages">) {
  await requireAdminPage("home.update");
  const sp = await searchParams;
  const pages = await db.page.findMany({ select: { key: true, status: true, updatedAt: true, _count: { select: { sections: true } } } });
  const byKey = new Map(pages.map((p) => [p.key, p]));
  return (
    <div>
      <PageHeader title="Pages" description="Edit the fixed, typed sections of every public page in English and Bangla. Sections can be enabled, disabled and reordered — arbitrary HTML/JS sections are not allowed." />
      <Flash message={sp.saved ? "Saved. The public page has been updated." : null} />
      <div className="card divide-y divide-line">
        {Object.entries(PAGE_SECTIONS).map(([key, def]) => (
          <div key={key} className="flex items-center gap-3 px-5 py-4">
            <Link href={`/admin/pages/${key}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-primary">
              <span className="font-semibold">{def.label}</span>
              <span className="text-xs text-muted">{def.route}</span>
              <span className="text-xs text-muted">· {Object.keys(def.sections).length} sections</span>
            </Link>
            <a href={def.route} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-muted hover:text-primary" aria-label={`View ${def.label}`}><ExternalLink className="h-4 w-4" /></a>
            <ChevronRight className="h-4 w-4 text-muted" />
          </div>
        ))}
      </div>
      <h2 className="mt-8 mb-3 text-lg font-semibold">Legal pages</h2>
      <div className="card divide-y divide-line">
        {Object.entries(LEGAL_PAGES).map(([key, label]) => (
          <Link key={key} href={`/admin/pages/${key}`} className="flex items-center gap-3 px-5 py-4 hover:text-primary">
            <span className="flex-1 font-semibold">{label}</span>
            <Badge>{byKey.get(key)?.status ?? "DRAFT"}</Badge>
            <ChevronRight className="h-4 w-4 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
