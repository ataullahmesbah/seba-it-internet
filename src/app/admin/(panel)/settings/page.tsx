import { requireAdminPage, can } from "@/lib/auth/guard";
import { hasRecentAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { GENERAL_FIELDS } from "@/features/admin/settings-fields";
import { getGeneralSettings, getSecuritySettings } from "@/server/settings";
import { saveGeneralSettingsAction, saveSecuritySettingsAction } from "@/server/admin/settings-actions";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireAdminPage(["settings.manage", "settings.security.manage"]);
  const [g, sec, roles] = await Promise.all([getGeneralSettings(), getSecuritySettings(), db.role.findMany({ orderBy: { name: "asc" } })]);
  const values = {
    ...g,
    formContact: g.forms.contact,
    formConnection: g.forms.connection,
    formCorporate: g.forms.corporate,
    formCoverageInterest: g.forms.coverageInterest,
    recipientSupport: g.recipientEmails.support,
    recipientSales: g.recipientEmails.sales,
  };
  const providers: Array<[string, boolean]> = [
    ["Cloudinary (media)", env.cloudinary.enabled],
    ["Resend (email)", Boolean(env.email.resendApiKey && env.email.from)],
    ["Ably (realtime)", Boolean(env.ablyApiKey)],
    ["Upstash Redis (rate limiting)", Boolean(env.upstash.url && env.upstash.token)],
    ["Cloudflare Turnstile", Boolean(env.turnstile.secretKey)],
  ];
  return (
    <div className="space-y-10">
      <div>
        <PageHeader title="Settings" description="Operational configuration. Secrets and API keys are never editable here — they live in environment variables." />
        <Card title="Integrations status" className="mb-6">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map(([name, on]) => (
              <li key={name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                {name} {on ? <Badge tone="green">Configured</Badge> : <Badge tone="amber">Not configured</Badge>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Without Ably, chat and notifications use polling. Without Upstash, rate limits are per-instance in memory. Without Resend, emails are logged as not sent (submissions are still saved).</p>
        </Card>
        {can(ctx, "settings.manage") && <ResourceForm action={saveGeneralSettingsAction} fields={GENERAL_FIELDS} values={values} />}
      </div>
      {can(ctx, "settings.security.manage") && (
        <div>
          <h2 className="mb-4 text-xl font-bold">Security policy</h2>
          <ResourceForm
            action={saveSecuritySettingsAction}
            needsReauth={!hasRecentAuth(ctx)}
            fields={[
              ...roles.map((r) => ({ name: `require2fa_${r.name}`, label: `Require 2FA for ${r.label}`, type: "checkbox" as const, width: "half" as const })),
              { name: "turnstileOnPublicForms", label: "Require Cloudflare Turnstile on public forms (needs TURNSTILE keys)", type: "checkbox" as const },
            ]}
            values={{ ...Object.fromEntries(roles.map((r) => [`require2fa_${r.name}`, sec.require2faRoles.includes(r.name)])), turnstileOnPublicForms: sec.turnstileOnPublicForms }}
          />
        </div>
      )}
    </div>
  );
}
