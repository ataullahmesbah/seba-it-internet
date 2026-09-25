"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { UserState } from "@/server/admin/user-actions";
import { userSecurityAction } from "@/server/admin/user-actions";
import { ReauthCard } from "./reauth-card";

interface RoleOpt {
  id: string;
  label: string;
  description: string | null;
  allowed: boolean;
}

function InviteLink({ link }: { link?: string }) {
  if (!link) return null;
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly value={link} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="One-time link" />
      <button type="button" className="btn-outline !min-h-11" onClick={() => navigator.clipboard?.writeText(link)}>Copy</button>
    </div>
  );
}

export function UserForm({
  action,
  roles,
  values,
  mode,
  needsReauth,
}: {
  action: (p: UserState, fd: FormData) => Promise<UserState>;
  roles: RoleOpt[];
  values: { email?: string; displayName?: string; isActive?: boolean; roleIds?: string[] };
  mode: "create" | "edit";
  needsReauth: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  return (
    <div className="space-y-4">
      {(needsReauth || state.reauth) && <ReauthCard />}
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.currentTarget);
          startTransition(() => formAction(fd));
        }}
        className="card max-w-2xl space-y-5 p-6"
      >
        {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">{state.error}</p>}
        {state.message && (
          <div role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {state.message}
            <InviteLink link={state.inviteLink} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">Email {mode === "create" && <span className="text-danger">*</span>}</label>
          <input id="email" name="email" type="email" defaultValue={values.email} readOnly={mode === "edit"} className="input read-only:bg-slate-50" maxLength={254} aria-invalid={Boolean(e.email)} />
          {mode === "edit" && <p className="mt-1 text-xs text-muted">Email cannot be changed. Create a new user instead.</p>}
          {e.email && <p className="field-error">{e.email}</p>}
        </div>
        <div>
          <label htmlFor="displayName" className="label">Display name <span className="text-danger">*</span></label>
          <input id="displayName" name="displayName" defaultValue={values.displayName} className="input" maxLength={100} aria-invalid={Boolean(e.displayName)} />
          {e.displayName && <p className="field-error">{e.displayName}</p>}
        </div>
        <fieldset>
          <legend className="label">Roles <span className="text-danger">*</span></legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <label key={r.id} className={`flex gap-2.5 rounded-xl border border-line p-3 text-sm ${r.allowed ? "" : "opacity-50"}`}>
                <input type="checkbox" name="roleIds" value={r.id} defaultChecked={values.roleIds?.includes(r.id)} disabled={!r.allowed} className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]" />
                <span>
                  <span className="block font-medium">{r.label}</span>
                  {r.description && <span className="block text-xs text-muted">{r.description}</span>}
                  {!r.allowed && <span className="block text-xs text-warning">Has permissions you don&apos;t have</span>}
                </span>
              </label>
            ))}
          </div>
          {e.roleIds && <p className="field-error">{e.roleIds}</p>}
        </fieldset>
        {mode === "edit" && (
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="h-4 w-4 accent-[var(--brand-primary)]" /> Active (can sign in)
          </label>
        )}
        {mode === "create" && <p className="text-xs text-muted">No password is set by admins. The user receives a single-use invitation link to choose their own password.</p>}
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "create" ? "Create user & send invite" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

export function UserSecurityPanel({ userId }: { userId: string }) {
  const [result, setResult] = useState<UserState | null>(null);
  const [pending, start] = useTransition();
  const run = (op: string, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("op", op);
      setResult(await userSecurityAction(fd));
    });
  };
  return (
    <div className="card space-y-3 p-5">
      <h2 className="font-semibold">Security</h2>
      {result?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{result.error}</p>}
      {result?.message && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {result.message}
          <InviteLink link={result.inviteLink} />
        </div>
      )}
      <button type="button" disabled={pending} className="btn-outline w-full !min-h-10 text-sm" onClick={() => run("send-reset", "Send a password reset link to this user?")}>Send password reset link</button>
      <button type="button" disabled={pending} className="btn-outline w-full !min-h-10 text-sm" onClick={() => run("revoke-sessions", "Sign this user out of all devices?")}>Revoke all sessions</button>
      <button type="button" disabled={pending} className="btn w-full !min-h-10 text-sm text-danger ring-1 ring-danger/30 hover:bg-red-50" onClick={() => run("reset-2fa", "Remove this user's 2FA and recovery codes? They will be signed out.")}>Reset 2FA</button>
    </div>
  );
}
