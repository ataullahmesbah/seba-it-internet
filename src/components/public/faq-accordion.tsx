"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  id: string;
  question: string;
  answerHtml: string;
  category?: string;
}

/** Accessible accordion (button + region). Optional client-side search and category grouping. */
export function FaqAccordion({ items, searchable, searchPlaceholder, noResults, grouped }: { items: FaqItem[]; searchable?: boolean; searchPlaceholder?: string; noResults?: string; grouped?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? items.filter((i) => i.question.toLowerCase().includes(n) || i.answerHtml.toLowerCase().includes(n)) : items;
  }, [items, q]);
  const groups = useMemo(() => {
    if (!grouped) return [{ name: "", items: filtered }];
    const m = new Map<string, FaqItem[]>();
    for (const i of filtered) m.set(i.category ?? "", [...(m.get(i.category ?? "") ?? []), i]);
    return [...m.entries()].map(([name, items]) => ({ name, items }));
  }, [filtered, grouped]);

  return (
    <div>
      {searchable && (
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="faq-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <input id="faq-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="input pl-10" />
        </div>
      )}
      {filtered.length === 0 && <p className="card p-6 text-center text-sm text-muted">{noResults}</p>}
      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.name}>
            {g.name && <h3 className="mb-3 text-sm font-semibold tracking-wide text-primary uppercase">{g.name}</h3>}
            <ul className="space-y-2.5">
              {g.items.map((i) => {
                const isOpen = open === i.id;
                return (
                  <li key={i.id} className="card overflow-hidden">
                    <h4>
                      <button
                        type="button"
                        className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-ink hover:bg-slate-50 sm:px-5"
                        aria-expanded={isOpen}
                        aria-controls={`faq-${i.id}`}
                        onClick={() => setOpen(isOpen ? null : i.id)}
                      >
                        {i.question}
                        <ChevronDown className={cn("h-4 w-4 shrink-0 text-primary transition-transform", isOpen && "rotate-180")} aria-hidden />
                      </button>
                    </h4>
                    <div id={`faq-${i.id}`} role="region" hidden={!isOpen} className="prose-content border-t border-line px-4 py-3 text-sm sm:px-5" dangerouslySetInnerHTML={{ __html: i.answerHtml }} />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
