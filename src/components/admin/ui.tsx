import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  NEW: "blue", UNREAD: "blue", WAITING: "amber", ACTIVE: "green", PUBLISHED: "green", CONTACTED: "violet", READ: "slate",
  IN_PROGRESS: "amber", CONVERTED: "green", WON: "green", REPLIED: "green", RESOLVED: "green", LOST: "slate", CLOSED: "slate",
  SPAM: "red", DRAFT: "amber", ARCHIVED: "slate", SENT: "green", FAILED: "red", PENDING: "amber", YES: "green", NO: "slate",
  INACTIVE: "slate", DISABLED: "red", POPULAR: "violet", FEATURED: "blue", OFFER: "amber", OFFLINE: "slate",
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  const key = typeof children === "string" ? children.toUpperCase().replace(/ /g, "_") : "";
  const t = tone ?? STATUS_TONE[key] ?? "slate";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset", TONES[t])}>{typeof children === "string" ? children.replace(/_/g, " ") : children}</span>;
}

export function Card({ children, className, title, actions }: { children: React.ReactNode; className?: string; title?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-4 text-xs text-muted">{total} record{total === 1 ? "" : "s"}</p>;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <p className="text-xs text-muted">
        Page {page} of {pages} · {total} records
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="btn-outline !min-h-9 !px-3" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className="btn-outline !min-h-9 !px-3" aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Flash({ message, tone = "green" }: { message?: string | null; tone?: "green" | "red" | "amber" }) {
  if (!message) return null;
  const cls = tone === "green" ? "bg-emerald-50 text-emerald-800" : tone === "red" ? "bg-red-50 text-danger" : "bg-amber-50 text-amber-900";
  return (
    <p role="status" className={cn("mb-4 rounded-xl px-4 py-3 text-sm", cls)}>
      {message}
    </p>
  );
}

export function DefinitionList({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
      {items
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="break-words text-ink">{v}</dd>
          </div>
        ))}
    </dl>
  );
}
