"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  changePasswordAction,
  disable2faAction,
  regenerateRecoveryCodesAction,
  updateProfileAction,
  type ProfileState,
} from "@/server/admin/profile-actions";
import { RecoveryCodes, TwoFactorSetup } from "./two-factor-setup";
import { PasswordInput } from "./password-input";

function Msg({ s }: { s: ProfileState }) {
  if (s.error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{s.error}</p>;
  if (s.message) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{s.message}</p>;
  return null;
}

export function ProfileNameForm({ displayName }: { displayName: string }) {
  const [s, a, p] = useActionState(updateProfileAction, {});
  return (
    <form action={a} className="space-y-3">
      <Msg s={s} />
      <div>
        <label htmlFor="dn" className="label">Display name</label>
        <input id="dn" name="displayName" defaultValue={displayName} className="input" maxLength={100} />
      </div>
      <button className="btn-primary" disabled={p}>{p && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
    </form>
  );
}

export function PasswordForm() {
  const [s, a, p] = useActionState(changePasswordAction, {});
  return (
    <form action={a} className="space-y-3">
      <Msg s={s} />
      <div>
        <label htmlFor="cur" className="label">Current password</label>
        <PasswordInput id="cur" name="current" required autoComplete="current-password" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="npw" className="label">New password (min 12)</label>
          <PasswordInput id="npw" name="password" required minLength={12} maxLength={128} autoComplete="new-password" />
        </div>
        <div>
          <label htmlFor="cpw" className="label">Confirm new password</label>
          <PasswordInput id="cpw" name="confirm" required minLength={12} maxLength={128} autoComplete="new-password" />
        </div>
      </div>
      <button className="btn-primary" disabled={p}>{p && <Loader2 className="h-4 w-4 animate-spin" />} Change password</button>
    </form>
  );
}

export function TwoFactorManage({ enabled, recoveryLeft, required }: { enabled: boolean; recoveryLeft: number; required: boolean }) {
  const [ds, disable, dp] = useActionState(disable2faAction, {});
  const [rs, regen, rp] = useActionState(regenerateRecoveryCodesAction, {});
  if (!enabled)
    return (
      <div className="space-y-3">
        <p className="text-sm">
          Status: <strong className="text-muted">Off</strong>
        </p>
        <TwoFactorSetup />
      </div>
    );
  return (
    <div className="space-y-5">
      <p className="text-sm">
        Status: <strong className="text-success">On</strong> · {recoveryLeft} recovery code(s) left.
      </p>
      <form action={regen} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="rpw" className="label">Regenerate recovery codes (confirm password)</label>
          <PasswordInput id="rpw" name="password" required autoComplete="current-password" />
        </div>
        <button className="btn-outline" disabled={rp}>Regenerate</button>
      </form>
      <Msg s={rs} />
      {rs.recoveryCodes && <RecoveryCodes codes={rs.recoveryCodes} />}
      {!required && (
        <form action={disable} className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="dpw" className="label">Turn off 2FA (confirm your password)</label>
            <PasswordInput id="dpw" name="password" required autoComplete="current-password" />
          </div>
          <button className="btn-danger" disabled={dp}>Turn off 2FA</button>
        </form>
      )}
      <Msg s={ds} />
      {required && <p className="text-xs text-muted">Your role requires 2FA, so it cannot be disabled.</p>}
    </div>
  );
}
