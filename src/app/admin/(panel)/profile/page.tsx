import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { getSecuritySettings } from "@/server/settings";
import { revokeOwnSessionAction } from "@/server/admin/profile-actions";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { PasswordForm, ProfileNameForm, TwoFactorManage } from "@/components/admin/profile-forms";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const ctx = await requireAdminPage();
  const [user, sessions, sec] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: ctx.userId }, include: { totp: true } }),
    db.session.findMany({ where: { userId: ctx.userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    getSecuritySettings(),
  ]);
  const recoveryLeft = Array.isArray(user.totp?.recoveryCodesHash) ? (user.totp!.recoveryCodesHash as unknown[]).length : 0;
  return (
    <div className="space-y-6">
      <PageHeader title="My Profile & Security" description={`${user.email} · ${ctx.roles.join(", ")}. Email and role changes require a higher-privileged admin.`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile"><ProfileNameForm displayName={user.displayName} /></Card>
        <Card title="Password"><PasswordForm /></Card>
      </div>
      <Card title="Two-factor authentication (optional)">
        <p className="mb-4 text-sm text-muted">
          Adds a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator…) at sign-in. It is optional — you can turn it
          on or off here at any time, unless a Super Admin makes it required for your role (Settings → Security policy).
        </p>
        <TwoFactorManage enabled={Boolean(user.totp?.enabledAt)} recoveryLeft={recoveryLeft} required={sec.require2faRoles.some((r) => ctx.roles.includes(r))} />
      </Card>
      <Card title="Active sessions">
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{s.userAgent || "Unknown device"}</span>
                <span className="text-xs text-muted">Signed in {formatDateTime(s.createdAt)} · last active {formatDateTime(s.lastSeenAt)} · expires {formatDateTime(s.expiresAt)}</span>
              </span>
              {s.id === ctx.sessionId ? (
                <Badge tone="green">This device</Badge>
              ) : (
                <form action={revokeOwnSessionAction}>
                  <input type="hidden" name="sessionId" value={s.id} />
                  <button className="btn-outline !min-h-8 text-xs">Revoke</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
