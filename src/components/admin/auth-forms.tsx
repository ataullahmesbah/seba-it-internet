"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, LogIn, Mail } from "lucide-react";
import { PasswordInput } from "./password-input";
import type { AuthState } from "@/server/admin/auth-actions";

type Action = (prev: AuthState, fd: FormData) => Promise<AuthState>;

function Alert({ state }: { state: AuthState }) {
  if (state.error) return <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-danger">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-success">{state.message}</p>;
  return null;
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} {label}
    </button>
  );
}

export function LoginForm({ action, notice }: { action: Action; notice?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <LogIn className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your staff account to continue.</p>
      </div>
      {notice && <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-success">{notice}</p>}
      <Alert state={state} />
      <div>
        <label htmlFor="email" className="label">Email address</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="email" name="email" type="email" required autoComplete="username" className="input pl-10" maxLength={254} placeholder="you@company.com" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label">Password</label>
          <Link href="/admin/forgot-password" className="mb-1.5 text-xs font-medium text-primary hover:underline">Forgot password?</Link>
        </div>
        <PasswordInput id="password" name="password" required autoComplete="current-password" maxLength={128} placeholder="••••••••••••" />
      </div>
      <Submit pending={pending} label="Sign in" />
      <p className="text-center text-xs text-muted">Protected area. Sign-in attempts are rate-limited and logged.</p>
    </form>
  );
}

export function TwoFactorForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <h1 className="text-xl font-bold text-ink">Two-factor verification</h1>
      <p className="text-sm text-muted">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p>
      <Alert state={state} />
      <div>
        <label htmlFor="code" className="label">Verification code</label>
        <input id="code" name="code" required autoComplete="one-time-code" inputMode="text" className="input text-center font-mono text-lg tracking-widest" maxLength={20} autoFocus />
      </div>
      <Submit pending={pending} label="Verify" />
    </form>
  );
}

export function ForgotForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <h1 className="text-xl font-bold text-ink">Reset password</h1>
      <p className="text-sm text-muted">Enter your staff email. If an account exists you will receive a single-use link valid for 15 minutes.</p>
      <Alert state={state} />
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required className="input" maxLength={254} />
      </div>
      <Submit pending={pending} label="Send reset link" />
      <p className="text-center text-sm"><Link href="/admin/login" className="text-primary hover:underline">Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm({ action, token }: { action: Action; token: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <h1 className="text-xl font-bold text-ink">Choose a new password</h1>
      <p className="text-sm text-muted">Minimum 12 characters. All existing sessions will be signed out.</p>
      <Alert state={state} />
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="label">New password</label>
        <PasswordInput id="password" name="password" required minLength={12} maxLength={128} autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirm password</label>
        <PasswordInput id="confirm" name="confirm" required minLength={12} maxLength={128} autoComplete="new-password" />
      </div>
      <Submit pending={pending} label="Update password" />
    </form>
  );
}
