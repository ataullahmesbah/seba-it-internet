import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Email adapter (Resend REST API). The DB write that triggered the email has already
 * succeeded before this is called; failures are logged and never thrown to the visitor.
 */
export type EmailTemplate =
  | "contact_admin"
  | "connection_admin"
  | "corporate_admin"
  | "coverage_interest_admin"
  | "visitor_ack"
  | "password_reset"
  | "security_2fa_changed"
  | "security_password_changed";

interface SendArgs {
  template: EmailTemplate;
  to: string;
  subject: string;
  html: string;
  related?: { type: string; id: string };
}

export async function sendEmail({ template, to, subject, html, related }: SendArgs): Promise<boolean> {
  const log = await db.emailDeliveryLog.create({
    data: { template, recipient: to, relatedEntityType: related?.type, relatedEntityId: related?.id, status: "PENDING" },
  });
  const apiKey = env.email.resendApiKey;
  const from = env.email.from;
  if (!apiKey || !from) {
    await db.emailDeliveryLog.update({ where: { id: log.id }, data: { status: "FAILED", errorCode: "NOT_CONFIGURED" } });
    logger.info("email skipped (provider not configured)", { template });
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string };
    if (!res.ok) throw Object.assign(new Error("resend error"), { code: body.name ?? `HTTP_${res.status}` });
    await db.emailDeliveryLog.update({ where: { id: log.id }, data: { status: "SENT", providerId: body.id ?? null } });
    return true;
  } catch (err) {
    const code = (err as { code?: string }).code ?? "NETWORK_ERROR";
    await db.emailDeliveryLog.update({ where: { id: log.id }, data: { status: "FAILED", errorCode: code.slice(0, 60) } });
    logger.warn("email delivery failed", { provider: "resend", template, code });
    return false;
  }
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Version-controlled branded layout. Brand values come from BrandSetting. */
export async function renderEmail(title: string, rows: Array<[string, unknown]>, opts?: { intro?: string; cta?: { label: string; url: string } }) {
  const brand = await db.brandSetting.findUnique({ where: { id: "singleton" } });
  const name = esc(brand?.companyName ?? "Internet Service");
  const primary = brand?.primaryColor ?? "#0A66FF";
  const navy = brand?.secondaryColor ?? "#071A2E";
  const table = rows
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#475569;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 12px;color:#0F172A;font-size:14px">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#F4F8FC;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F8FC;padding:24px 0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
<tr><td style="background:${navy};padding:20px 24px;color:#fff;font-size:18px;font-weight:bold">${name}</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:20px;color:#0F172A">${esc(title)}</h1>
${opts?.intro ? `<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">${esc(opts.intro)}</p>` : ""}
${table ? `<table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:8px">${table}</table>` : ""}
${opts?.cta ? `<p style="margin:24px 0 0"><a href="${esc(opts.cta.url)}" style="background:${primary};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;font-size:14px;display:inline-block">${esc(opts.cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 24px;background:#F8FAFC;color:#94a3b8;font-size:12px">${name}${brand?.hotline ? " · " + esc(brand.hotline) : ""}${brand?.supportEmail ? " · " + esc(brand.supportEmail) : ""}</td></tr>
</table></td></tr></table></body></html>`;
}

export function adminUrl(path: string) {
  return `${env.appUrl}${path}`;
}
