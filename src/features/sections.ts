import { bt, bta, t, ICON_OPTIONS, type FieldDef } from "./fields";

/**
 * Fixed, typed page sections (PRD 8.3). Admins can edit, enable/disable and reorder these,
 * but can never insert arbitrary HTML/JS sections.
 */
export interface SectionDef {
  label: string;
  description?: string;
  fields: FieldDef[];
}

const cta = (prefix: string, label: string): FieldDef[] => [
  bt(prefix + "Label", `${label} label`, { width: "half" }),
  t(prefix + "Url", `${label} URL`, { type: "url", allowRelative: true, width: "half" }),
];

const titleSub: FieldDef[] = [bt("title", "Title", { required: true, max: 150 }), bta("subtitle", "Subtitle", { max: 300 })];

const chipRepeater = (name: string, label: string, maxItems = 4): FieldDef => ({
  name,
  label,
  type: "repeater",
  maxItems,
  fields: [
    { name: "icon", label: "Icon", type: "icon", options: ICON_OPTIONS },
    bt("label", "Label", { required: true, max: 60 }),
  ],
});

const itemRepeater = (name: string, label: string, maxItems = 8, withUrl = false): FieldDef => ({
  name,
  label,
  type: "repeater",
  maxItems,
  fields: [
    { name: "icon", label: "Icon", type: "icon", options: ICON_OPTIONS },
    bt("title", "Title", { required: true, max: 80 }),
    bta("desc", "Description", { max: 240 }),
    ...(withUrl ? [t("url", "Link URL", { type: "url", allowRelative: true })] : []),
  ],
});

const statRepeater: FieldDef = {
  name: "items",
  label: "Stats (client-approved numbers only)",
  type: "repeater",
  maxItems: 6,
  help: "Never publish invented customer counts or uptime figures. Only enter numbers approved by the ISP.",
  fields: [
    { name: "icon", label: "Icon", type: "icon", options: ICON_OPTIONS },
    t("value", "Value", { required: true, max: 20, placeholder: "e.g. 64" }),
    bt("label", "Label", { required: true, max: 60 }),
  ],
};

export const heroFields: FieldDef[] = [
  bt("eyebrow", "Eyebrow (optional)", { max: 80 }),
  bt("headline", "Headline", { required: true, max: 120 }),
  bt("highlight", "Highlighted second line", { max: 80, help: "Shown in accent color below the headline." }),
  bta("subheadline", "Sub-headline", { max: 300, help: "Recommended max ~180 characters." }),
  bt("script", "Handwritten accent text", { max: 60 }),
  ...cta("primaryCta", "Primary CTA"),
  ...cta("secondaryCta", "Secondary CTA"),
  { name: "mediaId", label: "Background image", type: "media", mediaCategory: "HERO", help: "Optional. A branded network illustration is used when empty." },
  chipRepeater("chips", "Trust chips (max 4)"),
];

const finalCta: SectionDef = {
  label: "Final CTA banner",
  fields: [
    bt("headline", "Headline", { required: true, max: 120 }),
    bta("message", "Message", { max: 300 }),
    bt("script", "Handwritten accent text", { max: 60 }),
    { name: "points", label: "Check-list points", type: "lines", bilingual: true, max: 6 },
    ...cta("primaryCta", "Primary CTA"),
    ...cta("secondaryCta", "Secondary CTA"),
  ],
};

export const PAGE_SECTIONS: Record<string, { label: string; route: string; sections: Record<string, SectionDef> }> = {
  home: {
    label: "Home",
    route: "/",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      coverage: { label: "Quick Coverage Checker", fields: titleSub },
      packages: { label: "Popular Packages", description: "Shows up to 4 featured active packages.", fields: titleSub },
      serviceIntro: {
        label: "Home vs Corporate",
        fields: [
          bt("homeTitle", "Home card title", { required: true }),
          bta("homeDesc", "Home card description"),
          { name: "homePoints", label: "Home card points", type: "lines", bilingual: true, max: 6 },
          ...cta("homeCta", "Home card CTA"),
          { name: "homeMediaId", label: "Home card image", type: "media", mediaCategory: "GENERAL" },
          bt("homeScript", "Home card handwritten text"),
          bt("corporateTitle", "Corporate card title", { required: true }),
          bta("corporateDesc", "Corporate card description"),
          { name: "corporatePoints", label: "Corporate card points", type: "lines", bilingual: true, max: 6 },
          ...cta("corporateCta", "Corporate card CTA"),
          { name: "corporateMediaId", label: "Corporate card image", type: "media", mediaCategory: "GENERAL" },
          bt("corporateScript", "Corporate card handwritten text"),
        ],
      },
      whyChooseUs: { label: "Why Choose Us", fields: [...titleSub, itemRepeater("items", "Benefit cards (max 6)", 6)] },
      offer: {
        label: "Current Offer",
        description: "Displays the highest-priority active offer (managed under Offers). Hidden when none is active.",
        fields: [bt("eyebrow", "Eyebrow", { max: 60 }), bt("script", "Handwritten accent text", { max: 60 })],
      },
      howItWorks: { label: "Get Connected in 4 Steps", fields: [...titleSub, itemRepeater("items", "Steps", 4)] },
      stats: { label: "Network / Coverage Summary", fields: [...titleSub, bt("script", "Handwritten accent text"), statRepeater] },
      reviews: { label: "Reviews", fields: titleSub },
      blog: { label: "Latest Blog Posts", fields: titleSub },
      faq: { label: "FAQ Preview", fields: titleSub },
      support: { label: "Support Channels", fields: titleSub },
      finalCta,
    },
  },
  packages: {
    label: "Packages",
    route: "/packages",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      list: { label: "Package grid", fields: [...titleSub, bt("note", "Side note (e.g. VAT/installation)", { max: 160 })] },
      help: {
        label: "Not sure which plan?",
        fields: [...titleSub, itemRepeater("items", "Help items", 4), ...cta("cta", "CTA"), bt("script", "Handwritten accent text"), { name: "mediaId", label: "Image", type: "media", mediaCategory: "GENERAL" }],
      },
      faq: { label: "FAQ", fields: titleSub },
      finalCta,
    },
  },
  corporate: {
    label: "Corporate",
    route: "/corporate",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      services: { label: "Corporate services", fields: titleSub },
      benefits: { label: "Why choose us for business", fields: [...titleSub, itemRepeater("items", "Benefits", 6)] },
      inquiry: {
        label: "Inquiry form",
        fields: [...titleSub, bt("script", "Handwritten accent text"), { name: "mediaId", label: "Side image", type: "media", mediaCategory: "GENERAL" }, statRepeater],
      },
      trust: { label: "Trusted by businesses (stats)", fields: [...titleSub, statRepeater] },
      reviews: { label: "Business reviews", fields: titleSub },
      faq: { label: "FAQ", fields: titleSub },
      finalCta,
    },
  },
  coverage: {
    label: "Coverage",
    route: "/coverage",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      checker: { label: "Coverage checker", fields: titleSub },
      browse: { label: "Browse coverage", description: "Groups active areas by district and thana.", fields: titleSub },
      stats: { label: "Coverage stats", fields: [...titleSub, statRepeater] },
      finalCta,
    },
  },
  "pay-bill": {
    label: "Pay Bill",
    route: "/pay-bill",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      notice: { label: "Instruction notice", fields: [bt("title", "Title", { required: true }), bta("body", "Body", { required: true }), bt("script", "Handwritten accent text")] },
      methods: { label: "Mobile payment methods", fields: titleSub },
      bank: { label: "Bank transfer", fields: [...titleSub, bta("note", "Important note")] },
      help: { label: "Payment help", fields: [...titleSub, itemRepeater("items", "Help cards", 4, true), bt("cardTitle", "Support card title"), bta("cardBody", "Support card text"), { name: "mediaId", label: "Support card image", type: "media", mediaCategory: "GENERAL" }] },
      finalCta,
    },
  },
  blog: {
    label: "Blog",
    route: "/blog",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      story: { label: "Share your story box", fields: [...titleSub, ...cta("cta", "CTA")] },
    },
  },
  about: {
    label: "About",
    route: "/about",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      story: { label: "Company story", fields: [bt("title", "Title", { required: true }), { name: "body", label: "Story", type: "richtext", bilingual: true, required: true }, { name: "mediaId", label: "Image", type: "media", mediaCategory: "GENERAL" }] },
      missionVision: { label: "Mission & Vision", fields: [bta("mission", "Mission", { required: true }), bta("vision", "Vision", { required: true })] },
      highlights: { label: "Network highlights", fields: [...titleSub, itemRepeater("items", "Highlights", 6)] },
      stats: { label: "Stats", fields: [...titleSub, statRepeater] },
      offices: { label: "Offices preview", fields: titleSub },
      finalCta,
    },
  },
  support: {
    label: "Support / FAQ",
    route: "/support",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      channels: { label: "Support channels", fields: titleSub },
      faq: { label: "FAQ", fields: titleSub },
      finalCta,
    },
  },
  contact: {
    label: "Contact",
    route: "/contact",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      form: { label: "Contact form", fields: titleSub },
      offices: { label: "Offices", fields: titleSub },
    },
  },
  "get-connection": {
    label: "Get Connection",
    route: "/get-connection",
    sections: {
      hero: { label: "Hero", fields: heroFields },
      form: { label: "Form", fields: titleSub },
      steps: { label: "Steps", fields: [...titleSub, itemRepeater("items", "Steps", 4)] },
    },
  },
};

export const LEGAL_PAGES: Record<string, string> = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  "payment-policy": "Payment / Refund Policy",
};
