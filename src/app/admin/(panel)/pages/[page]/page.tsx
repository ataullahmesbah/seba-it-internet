import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { LEGAL_PAGES, PAGE_SECTIONS } from "@/features/sections";
import { saveLegalPageAction } from "@/server/admin/page-actions";
import { Badge, Flash, PageHeader } from "@/components/admin/ui";
import { SectionControls } from "@/components/admin/section-controls";
import { ResourceForm } from "@/components/admin/resource-form";

export async function generateMetadata({ params }: PageProps<"/admin/pages/[page]">) {
  const { page } = await params;
  return { title: PAGE_SECTIONS[page]?.label ?? LEGAL_PAGES[page] ?? "Page" };
}

export default async function PageSectionsPage({ params, searchParams }: PageProps<"/admin/pages/[page]">) {
  await requireAdminPage("home.update");
  const { page: key } = await params;
  const sp = await searchParams;

  if (LEGAL_PAGES[key]) {
    const p = await db.page.findUnique({ where: { key } });
    return (
      <div>
        <PageHeader title={LEGAL_PAGES[key]} description="Legal copy must be reviewed and approved by the ISP/legal advisor before launch." back={{ href: "/admin/pages", label: "Pages" }} />
        <ResourceForm
          action={saveLegalPageAction.bind(null, key)}
          fields={[
            { name: "title", label: "Title", type: "text", bilingual: true, required: true, max: 150 },
            { name: "content", label: "Content", type: "richtext", bilingual: true },
            { name: "status", label: "Status", type: "select", required: true, options: [{ value: "PUBLISHED", label: "Published" }, { value: "DRAFT", label: "Draft (hidden, 404)" }] },
          ]}
          values={{ titleEn: p?.titleEn ?? LEGAL_PAGES[key], titleBn: p?.titleBn ?? "", contentEn: p?.contentEn ?? "", contentBn: p?.contentBn ?? "", status: p?.status ?? "DRAFT" }}
          cancelHref="/admin/pages"
        />
      </div>
    );
  }

  const def = PAGE_SECTIONS[key];
  if (!def) notFound();
  const page = await db.page.findUnique({ where: { key }, include: { sections: { orderBy: { displayOrder: "asc" } } } });
  const saved = page?.sections ?? [];
  const configured = new Set(saved.map((s) => s.type));
  const ordered = [...saved.filter((s) => def.sections[s.type]).map((s) => ({ type: s.type, enabled: s.enabled, configured: true })), ...Object.keys(def.sections).filter((t) => !configured.has(t)).map((t) => ({ type: t, enabled: false, configured: false }))];

  return (
    <div>
      <PageHeader
        title={`${def.label} page`}
        description="Sections render on the website in this order. Disabled sections are hidden."
        back={{ href: "/admin/pages", label: "Pages" }}
        actions={<a href={def.route} target="_blank" rel="noopener noreferrer" className="btn-outline !min-h-10">View page</a>}
      />
      <Flash message={sp.saved ? "Section saved. The public page has been updated." : null} />
      <ol className="card divide-y divide-line">
        {ordered.map((s, i) => {
          const sd = def.sections[s.type];
          return (
            <li key={s.type} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="w-6 text-sm text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{sd.label}</p>
                {sd.description && <p className="text-xs text-muted">{sd.description}</p>}
              </div>
              {!s.configured ? <Badge tone="amber">Not configured</Badge> : s.enabled ? <Badge tone="green">Visible</Badge> : <Badge tone="slate">Hidden</Badge>}
              <SectionControls page={key} type={s.type} enabled={s.enabled} configured={s.configured} />
              <Link href={`/admin/pages/${key}/${s.type}`} className="btn-outline !min-h-9 !px-3 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
