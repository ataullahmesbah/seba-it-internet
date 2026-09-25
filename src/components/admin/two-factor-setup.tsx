"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, ShieldCheck } from "lucide-react";
import { confirm2faSetupAction, start2faSetupAction, type ProfileState } from "@/server/admin/profile-actions";

export function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">Recovery codes (shown once)</p>
      <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <button type="button" className="btn-outline mt-3 !min-h-9 text-xs" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}>
        Copy codes
      </button>
    </div>
  );
}

export function TwoFactorSetup({ onDoneHref }: { onDoneHref?: string }) {
  const [setup, setSetup] = useState<ProfileState | null>(null);
  const [starting, start] = useTransition();
  const [state, action, pending] = useActionState(confirm2faSetupAction, {});

  if (state.recoveryCodes) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <ShieldCheck className="h-5 w-5" /> {state.message}
        </p>
        <RecoveryCodes codes={state.recoveryCodes} />
        {onDoneHref && (
          <a href={onDoneHref} className="btn-primary w-full">
            Continue to dashboard
          </a>
        )}
      </div>
    );
  }

  if (!setup?.qr) {
    return (
      <div className="space-y-3">
        {setup?.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{setup.error}</p>}
        <button type="button" className="btn-primary" disabled={starting} onClick={() => start(async () => setSetup(await start2faSetupAction()))}>
          {starting && <Loader2 className="h-4 w-4 animate-spin" />} Set up authenticator app
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted">Scan this QR code with Google Authenticator, Microsoft Authenticator, 1Password or a similar app, then enter the 6-digit code.</p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <Image src={setup.qr} alt="Authenticator QR code" width={180} height={180} unoptimized className="rounded-lg border border-line" />
        <div className="text-xs text-muted">
          <p>Can&apos;t scan? Enter this key manually:</p>
          <code className="mt-1 block rounded bg-slate-100 p-2 font-mono text-[13px] break-all text-ink">{setup.secret}</code>
        </div>
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div>
        <label htmlFor="totp-code" className="label">6-digit code</label>
        <input id="totp-code" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input max-w-48 text-center font-mono text-lg tracking-widest" />
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Verify & enable
      </button>
    </form>
  );
}
