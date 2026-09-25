"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { moveSectionAction, toggleSectionAction } from "@/server/admin/page-actions";

export function SectionControls({ page, type, enabled, configured }: { page: string; type: string; enabled: boolean; configured: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: (fd: FormData) => Promise<unknown>, extra: Record<string, string> = {}) =>
    start(async () => {
      const fd = new FormData();
      fd.set("page", page);
      fd.set("type", type);
      for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      await fn(fd);
      router.refresh();
    });
  return (
    <span className="flex items-center gap-2">
      {configured && (
        <>
          <button type="button" disabled={pending} onClick={() => run(moveSectionAction, { dir: "up" })} className="rounded p-1 text-muted hover:bg-slate-100" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" disabled={pending} onClick={() => run(moveSectionAction, { dir: "down" })} className="rounded p-1 text-muted hover:bg-slate-100" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`Section ${enabled ? "enabled" : "disabled"}`}
            disabled={pending}
            onClick={() => run(toggleSectionAction)}
            className={cn("relative inline-flex h-6 w-10 items-center rounded-full transition-colors", enabled ? "bg-success" : "bg-slate-300")}
          >
            <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-[18px]" : "translate-x-0.5")} />
          </button>
        </>
      )}
    </span>
  );
}
