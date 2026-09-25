import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { BRAND_FIELDS } from "@/features/admin/settings-fields";
import { saveBrandAction } from "@/server/admin/settings-actions";
import { PageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";

export const metadata = { title: "Brand Settings" };

export default async function BrandPage() {
  await requireAdminPage("brand.update");
  const brand = await db.brandSetting.findUnique({ where: { id: "singleton" } });
  const values = (brand ?? { primaryColor: "#0A66FF", secondaryColor: "#071A2E", accentColor: "#00BCEB" }) as Record<string, unknown>;
  const ids = ["logoLightMediaId", "logoDarkMediaId", "faviconMediaId", "defaultOgMediaId"].map((k) => values[k]).filter((v): v is string => typeof v === "string");
  const media = ids.length ? await db.media.findMany({ where: { id: { in: ids } } }) : [];
  return (
    <div>
      <PageHeader title="Brand Settings" description="Company identity, logos, theme colors and contact channels. Changes apply to the website immediately — no redeploy needed." />
      <ResourceForm
        action={saveBrandAction}
        fields={BRAND_FIELDS}
        values={values}
        media={Object.fromEntries(media.map((m) => [m.id, { id: m.id, url: m.secureUrl, filename: m.filename ?? m.publicId }]))}
        aside={
          <div className="card space-y-3 p-5 text-xs text-muted">
            <p className="font-semibold text-ink">Current palette</p>
            <div className="flex gap-2">
              {["primaryColor", "secondaryColor", "accentColor"].map((k) => (
                <span key={k} className="h-10 flex-1 rounded-lg ring-1 ring-line" style={{ background: String(values[k] ?? "#fff") }} title={String(values[k])} />
              ))}
            </div>
            <p>Keep enough contrast between primary and white text (WCAG AA).</p>
          </div>
        }
      />
    </div>
  );
}
