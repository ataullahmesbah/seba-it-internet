import { ok } from "@/lib/api/response";
import { getNavigation, getSite } from "@/server/public-data";
import { getGeneralSettings } from "@/server/settings";

export async function GET() {
  const [site, nav, s] = await Promise.all([getSite(), getNavigation(), getGeneralSettings()]);
  return ok(
    {
      ...site,
      navigation: nav,
      settings: {
        officeHoursEn: s.officeHoursEn,
        officeHoursBn: s.officeHoursBn,
        supportAvailabilityEn: s.supportAvailabilityEn,
        supportAvailabilityBn: s.supportAvailabilityBn,
        chatEnabled: s.chatEnabled,
        maintenanceBanner: s.maintenanceBannerEnabled ? { en: s.maintenanceBannerEn, bn: s.maintenanceBannerBn } : null,
      },
    },
    undefined,
    { cache: true },
  );
}
