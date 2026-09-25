"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { LeadState } from "@/server/admin/lead-actions";

export function LeadStatusForm({ action, statuses, status, note }: { action: (p: LeadState, fd: FormData) => Promise<LeadState>; statuses: string[]; status: string; note: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p>}
      <div>
        <label htmlFor="lead-status" className="label">Status</label>
        <select id="lead-status" name="status" defaultValue={status} className="input">
          {statuses.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="lead-history" className="label">Activity note (added to history)</label>
        <input id="lead-history" name="historyNote" className="input" maxLength={1000} placeholder="e.g. Called customer, visit scheduled" />
      </div>
      <div>
        <label htmlFor="lead-note" className="label">Internal note (staff only)</label>
        <textarea id="lead-note" name="internalNote" defaultValue={note} className="input min-h-28 py-2.5" maxLength={5000} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
    </form>
  );
}
