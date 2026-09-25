"use client";

import { useId } from "react";
import { CircleCheck, CircleAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  name,
  error,
  required,
  children,
  className,
  hint,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; name: string; required?: boolean }) => React.ReactNode;
  className?: string;
  hint?: string;
}) {
  const id = useId() + name;
  const errId = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": errId, name, required })}
      {error ? (
        <p id={errId} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={errId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Hidden honeypot — real users never see or fill it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-danger">
      <CircleAlert className="h-4 w-4 shrink-0" aria-hidden /> {message}
    </p>
  );
}

export function SuccessPanel({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center rounded-2xl bg-emerald-50 px-6 py-10 text-center">
      <CircleCheck className="h-12 w-12 text-success" aria-hidden />
      <h3 className="mt-3 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-slate-700">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SubmitButton({ busy, label, busyLabel, className }: { busy: boolean; label: string; busyLabel: string; className?: string }) {
  return (
    <button type="submit" disabled={busy} className={cn("btn-primary w-full", className)} aria-busy={busy}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {busy ? busyLabel : label}
    </button>
  );
}

export function formToObject(form: HTMLFormElement): Record<string, unknown> {
  const fd = new FormData(form);
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}
