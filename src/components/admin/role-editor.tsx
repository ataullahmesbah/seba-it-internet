"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { RoleState } from "@/server/admin/role-actions";
import { createRoleAction } from "@/server/admin/role-actions";
import { ReauthCard } from "./reauth-card";

export function RoleEditor({
  action,
  role,
  permissions,
  locked,
}: {
  action: (p: RoleState, fd: FormData) => Promise<RoleState>;
  role: { label: string; description: string | null; name: string; users: number; granted: string[] };
  permissions: Array<{ key: string; description: string }>;
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const groups = new Map<string, Array<{ key: string; description: string }>>();
  for (const p of permissions) {
    const g = p.key.split(".")[0];
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  return (
    <details className="card overflow-hidden" open={state.error !== undefined || state.message !== undefined}>
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
        <span>
          <span className="font-semibold">{role.label}</span> <span className="text-xs text-muted">({role.name} · {role.users} user{role.users === 1 ? "" : "s"})</span>
          {role.description && <span className="block text-xs text-muted">{role.description}</span>}
        </span>
        <span className="text-xs text-muted">{role.granted.length} / {permissions.length} permissions</span>
      </summary>
      <div className="border-t border-line p-5">
        {state.reauth && <ReauthCard />}
        {state.error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>}
        {state.message && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p>}
        <form action={formAction}>
          <fieldset disabled={locked} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor={`label-${role.name}`}>Display name</label>
                <input id={`label-${role.name}`} name="label" defaultValue={role.label} className="input" maxLength={60} />
              </div>
              <div>
                <label className="label" htmlFor={`desc-${role.name}`}>Description</label>
                <input id={`desc-${role.name}`} name="description" defaultValue={role.description ?? ""} className="input" maxLength={200} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...groups.entries()].map(([g, perms]) => (
                <div key={g} className="rounded-xl border border-line p-3">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{g.replace(/_/g, " ")}</p>
                  {perms.map((p) => (
                    <label key={p.key} className="flex items-start gap-2 py-1 text-sm">
                      <input type="checkbox" name="perm" value={p.key} defaultChecked={role.granted.includes(p.key)} className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]" />
                      <span>
                        <code className="text-xs">{p.key}</code>
                        <span className="block text-xs text-muted">{p.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            {!locked && (
              <button type="submit" disabled={pending} className="btn-primary">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save role
              </button>
            )}
          </fieldset>
          {locked && <p className="mt-3 text-xs text-muted">The Super Admin role always has every permission and cannot be edited.</p>}
        </form>
      </div>
    </details>
  );
}

export function NewRoleForm() {
  const [state, action, pending] = useActionState(createRoleAction, {});
  return (
    <form action={action} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="new-role" className="label">New custom role</label>
        <input id="new-role" name="label" placeholder="e.g. Billing Staff" className="input" maxLength={60} required />
        {state.error && <p className="field-error">{state.error}</p>}
        {state.message && <p className="mt-1 text-xs text-success">{state.message}</p>}
        {state.reauth && <div className="mt-3"><ReauthCard /></div>}
      </div>
      <button type="submit" disabled={pending} className="btn-primary">{pending && <Loader2 className="h-4 w-4 animate-spin" />} Create role</button>
    </form>
  );
}
