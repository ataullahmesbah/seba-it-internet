"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Destructive/sensitive action button with explicit confirmation dialog that names the item
 * and explains the impact (PRD 7.2). Calls a server action with the provided hidden fields.
 */
export function ConfirmButton({
  action,
  fields,
  label,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  className,
  icon,
}: {
  action: (fd: FormData) => Promise<unknown>;
  fields: Record<string, string>;
  label: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  className?: string;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const show = () => {
    setError(null);
    setOpen(true);
    queueMicrotask(() => dialogRef.current?.showModal());
  };
  const hide = () => {
    dialogRef.current?.close();
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={show} className={className ?? cn(tone === "danger" ? "btn-danger" : "btn-primary", "!min-h-9 !px-3 text-xs")}>
        {icon}
        {label}
      </button>
      {open && (
        <dialog ref={dialogRef} onClose={() => setOpen(false)} className="m-auto w-[min(92vw,440px)] rounded-2xl p-0 shadow-2xl backdrop:bg-navy/50" aria-labelledby="confirm-title">
          <div className="p-6">
            <div className="flex gap-3">
              <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tone === "danger" ? "bg-red-50 text-danger" : "bg-primary-soft text-primary")}>
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div>
                <h2 id="confirm-title" className="font-semibold text-ink">{title}</h2>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </div>
            </div>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-outline !min-h-10" onClick={hide} disabled={pending}>
                Cancel
              </button>
              <button
                type="button"
                className={cn(tone === "danger" ? "btn-danger" : "btn-primary", "!min-h-10")}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const fd = new FormData();
                    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
                    const res = (await action(fd)) as { error?: string } | undefined;
                    if (res?.error) setError(res.error);
                    else hide();
                  })
                }
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
