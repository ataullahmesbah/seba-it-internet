"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import { confirmPasswordAction } from "@/server/admin/profile-actions";
import { PasswordInput } from "./password-input";

/** Sensitive-action re-authentication (password confirmation valid for 10 minutes). */
export function ReauthCard() {
  const [state, action, pending] = useActionState(confirmPasswordAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state.message) router.refresh();
  }, [state.message, router]);
  if (state.message) return <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>;
  return (
    <form action={action} className="card flex flex-col gap-3 border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-end">
      <LockKeyhole className="hidden h-8 w-8 shrink-0 text-warning sm:block" aria-hidden />
      <div className="flex-1">
        <label htmlFor="reauth-pw" className="label">Confirm your password to change sensitive settings</label>
        <PasswordInput id="reauth-pw" name="password" required autoComplete="current-password" className="bg-white" />
        {state.error && <p className="field-error">{state.error}</p>}
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm
      </button>
    </form>
  );
}
