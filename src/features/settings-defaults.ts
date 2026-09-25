/** Typed SiteSetting keys (non-secret configuration only). */
export interface GeneralSettings {
  utilityBarEnabled: boolean;
  officeHoursEn: string;
  officeHoursBn: string;
  supportAvailabilityEn: string;
  supportAvailabilityBn: string;
  maintenanceBannerEnabled: boolean;
  maintenanceBannerEn: string;
  maintenanceBannerBn: string;
  chatEnabled: boolean;
  chatOnlineHoursStart: number; // 0-23, Asia/Dhaka
  chatOnlineHoursEnd: number;
  forms: { contact: boolean; connection: boolean; corporate: boolean; coverageInterest: boolean };
  visitorAckEmail: boolean;
  recipientEmails: { support: string; sales: string };
  btrcTariffUrl: string;
  careerUrl: string;
  browseCoverageEnabled: boolean;
  retentionMonths: number;
}

export interface SecuritySettings {
  require2faRoles: string[];
  turnstileOnPublicForms: boolean;
}

export const DEFAULT_GENERAL: GeneralSettings = {
  utilityBarEnabled: true,
  officeHoursEn: "Sat - Thu: 9:00 AM - 8:00 PM",
  officeHoursBn: "শনি - বৃহস্পতি: সকাল ৯টা - রাত ৮টা",
  supportAvailabilityEn: "Our support team is available 24/7 by phone. Live chat messages are answered as soon as an agent is online.",
  supportAvailabilityBn: "আমাদের সাপোর্ট টিম ফোনে ২৪/৭ পাওয়া যায়। এজেন্ট অনলাইনে এলেই লাইভ চ্যাটের উত্তর দেওয়া হয়।",
  maintenanceBannerEnabled: false,
  maintenanceBannerEn: "",
  maintenanceBannerBn: "",
  chatEnabled: true,
  chatOnlineHoursStart: 9,
  chatOnlineHoursEnd: 22,
  forms: { contact: true, connection: true, corporate: true, coverageInterest: true },
  visitorAckEmail: true,
  recipientEmails: { support: "", sales: "" },
  btrcTariffUrl: "",
  careerUrl: "",
  browseCoverageEnabled: true,
  retentionMonths: 24,
};

export const DEFAULT_SECURITY: SecuritySettings = { require2faRoles: [], turnstileOnPublicForms: false };

