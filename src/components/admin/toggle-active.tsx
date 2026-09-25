"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toggleActiveAction } from "@/server/admin/resource-actions";

export function ToggleActive({ resource, id, active, label, disabled, confirmText }: { resource: string; id: string; active: boolean; label: string; disabled?: boolean; confirmText?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${label}: ${active ? "active" : "inactive"}`}
      disabled={disabled || pending}
      onClick={() => {
        if (active && confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const fd = new FormData();
          fd.set("resource", resource);
          fd.set("id", id);
          await toggleActiveAction(fd);
          router.refresh();
        });
      }}
      className={cn("relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", active ? "bg-success" : "bg-slate-300")}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", active ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}
