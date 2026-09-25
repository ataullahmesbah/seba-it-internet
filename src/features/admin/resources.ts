import { bt, bta, t, ICON_OPTIONS, type FieldDef, type SelectOption } from "@/features/fields";
import { SOCIAL_PLATFORMS } from "@/components/public/social-icons";

/**
 * Client-safe CRUD resource definitions (fields, list columns, filters).
 * Server-side behavior (model, permissions, hooks, cache tags) lives in server/admin/resources.ts.
 */
export type ColumnType = "text" | "bool" | "badge" | "date" | "money" | "order" | "status-active" | "mbps" | "image";

export interface Column {
  key: string;
  label: string;
  type?: ColumnType;
  className?: string;
}

export interface FilterDef {
  name: string;
  label: string;
  options?: SelectOption[];
  optionsKey?: string;
}

export interface ResourceConfig {
  key: string;
  title: string;
  singular: string;
  description?: string;
  fields: FieldDef[];
  columns: Column[];
  nameField: string;
  searchFields?: string[];
  filters?: FilterDef[];
  /** Enables up/down reordering by displayOrder (scoped by these fields). */
  orderScope?: string[];
  /** Back link for nested modules (e.g. coverage). */
  parent?: { href: string; label: string };
  /** Requires recent re-authentication for mutations. */
  sensitive?: boolean;
  preview?: (id: string) => string;
}

const order: FieldDef = { name: "displayOrder", label: "Display order", type: "number", min: 0, max: 100000, width: "half", help: "Lower numbers appear first." };
const active: FieldDef = { name: "active", label: "Active (visible on website)", type: "checkbox", width: "half" };
const slug: FieldDef = { name: "slug", label: "Slug", type: "text", max: 100, width: "half", help: "Lowercase letters, numbers and hyphens. Leave empty to generate from the English name." };

const BILLING: SelectOption[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

export const RESOURCES: Record<string, ResourceConfig> = {
  packages: {
    key: "packages",
    title: "Packages",
    singular: "Package",
    description: "Home internet packages. Speeds, prices and VAT notes must be verified by the ISP.",
    nameField: "nameEn",
    searchFields: ["nameEn", "nameBn", "slug"],
    orderScope: [],
    filters: [{ name: "active", label: "Status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] }],
    columns: [
      { key: "nameEn", label: "Name" },
      { key: "speedMbps", label: "Speed", type: "mbps" },
      { key: "price", label: "Price", type: "money" },
      { key: "popular", label: "Popular", type: "bool" },
      { key: "featured", label: "Featured", type: "bool" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
      { key: "updatedAt", label: "Updated", type: "date" },
    ],
    fields: [
      bt("name", "Package name", { required: true, min: 2, max: 80 }),
      bt("tagline", "Short tagline", { max: 80 }),
      slug,
      { name: "iconKey", label: "Icon", type: "icon", options: ICON_OPTIONS, width: "half" },
      { name: "speedMbps", label: "Speed (Mbps)", type: "number", required: true, min: 1, max: 100000, width: "half" },
      { name: "billingPeriod", label: "Billing period", type: "select", options: BILLING, required: true, width: "half" },
      { name: "price", label: "Price (BDT)", type: "number", required: true, min: 0, max: 9999999, width: "half" },
      { name: "oldPrice", label: "Old price (optional)", type: "number", min: 0, max: 9999999, width: "half" },
      { name: "features", label: "Feature bullets (one per line, max 5 shown)", type: "lines", bilingual: true, max: 8, required: true },
      bt("vatNote", "VAT note", { max: 120 }),
      bt("installationNote", "Installation note", { max: 120 }),
      bt("offerBadge", "Offer badge (optional)", { max: 30, bnOptional: true }),
      { name: "popular", label: "Mark as Most Popular", type: "checkbox", width: "half" },
      { name: "featured", label: "Featured on home page", type: "checkbox", width: "half" },
      active,
      order,
    ],
  },
  tariffs: {
    key: "tariffs",
    title: "BTRC Approved Tariff",
    singular: "Tariff document",
    description: "PDF tariff approvals shown on the public “BTRC Approved Tariff” page. The page and its menu link appear only when at least one document is active.",
    nameField: "titleEn",
    searchFields: ["titleEn", "titleBn", "memoNumber"],
    orderScope: [],
    columns: [
      { key: "titleEn", label: "Title" },
      { key: "memoNumber", label: "Memo no." },
      { key: "issuedAt", label: "Issued", type: "date" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      bt("title", "Title", { required: true, max: 200, placeholder: "e.g. BTRC Approved Tariff — 2025" }),
      { name: "fileUrl", label: "PDF file", type: "pdf", required: true, help: "Upload a PDF (max 15 MB, needs Cloudinary) or paste an https:// link to the PDF." },
      t("fileName", "Download file name (optional)", { max: 120, width: "half", placeholder: "btrc-tariff-2025.pdf" }),
      t("memoNumber", "Memo / reference number (optional)", { max: 120, width: "half" }),
      { name: "issuedAt", label: "Issue date (optional)", type: "datetime", width: "half" },
      bta("description", "Short description (optional)", { max: 600, bnOptional: true }),
      active,
      order,
    ],
  },
  corporate: {
    key: "corporate",
    title: "Corporate Services",
    singular: "Corporate service",
    description: "Service cards on the Corporate page.",
    nameField: "titleEn",
    searchFields: ["titleEn", "titleBn"],
    orderScope: [],
    columns: [
      { key: "titleEn", label: "Title" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
      { key: "updatedAt", label: "Updated", type: "date" },
    ],
    fields: [
      bt("title", "Title", { required: true, max: 100 }),
      bta("description", "Description", { required: true, max: 500 }),
      slug,
      { name: "iconKey", label: "Icon", type: "icon", options: ICON_OPTIONS, width: "half" },
      { name: "mediaId", label: "Image (optional, replaces icon)", type: "media", mediaCategory: "GENERAL" },
      active,
      order,
    ],
  },
  offers: {
    key: "offers",
    title: "Offers",
    singular: "Offer",
    description: "The highest-priority active offer within its date window is shown on the home page. Expired offers hide automatically.",
    nameField: "titleEn",
    searchFields: ["titleEn", "titleBn"],
    columns: [
      { key: "titleEn", label: "Title" },
      { key: "priority", label: "Priority" },
      { key: "startAt", label: "Starts", type: "date" },
      { key: "endAt", label: "Ends", type: "date" },
      { key: "active", label: "Status", type: "status-active" },
    ],
    fields: [
      bt("title", "Title", { required: true, max: 120 }),
      bta("description", "Description", { required: true, max: 400 }),
      { name: "highlights", label: "Highlights (one per line)", type: "lines", bilingual: true, max: 6 },
      bt("ctaLabel", "CTA label", { max: 40 }),
      t("ctaUrl", "CTA URL", { type: "url", allowRelative: true, placeholder: "/get-connection" }),
      { name: "mediaId", label: "Background image (optional)", type: "media", mediaCategory: "GENERAL" },
      { name: "startAt", label: "Start (Asia/Dhaka)", type: "datetime", width: "half" },
      { name: "endAt", label: "End (Asia/Dhaka)", type: "datetime", width: "half" },
      { name: "priority", label: "Priority (higher wins)", type: "number", min: 0, max: 1000, required: true, width: "half" },
      active,
    ],
  },
  faqs: {
    key: "faqs",
    title: "FAQ",
    singular: "FAQ",
    nameField: "questionEn",
    searchFields: ["questionEn", "questionBn"],
    orderScope: [],
    filters: [{ name: "categoryId", label: "Category", optionsKey: "faqCategories" }],
    columns: [
      { key: "questionEn", label: "Question" },
      { key: "category.nameEn", label: "Category" },
      { key: "featured", label: "Featured", type: "bool" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      { name: "categoryId", label: "Category", type: "select", optionsKey: "faqCategories" },
      bt("question", "Question", { required: true, min: 2, max: 300 }),
      bta("answer", "Answer", { required: true, max: 5000, help: "Plain text, or basic HTML: <p>, <strong>, <em>, <a>, <ul>/<li>." }),
      { name: "featured", label: "Featured (home page preview)", type: "checkbox", width: "half" },
      active,
      order,
    ],
  },
  "faq-categories": {
    key: "faq-categories",
    title: "FAQ Categories",
    singular: "FAQ category",
    nameField: "nameEn",
    orderScope: [],
    parent: { href: "/admin/faqs", label: "FAQ" },
    columns: [
      { key: "nameEn", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [bt("name", "Name", { required: true, max: 80 }), slug, active, order],
  },
  reviews: {
    key: "reviews",
    title: "Reviews",
    singular: "Review",
    description: "Customer testimonials. Only publish real, approved feedback. There is no public submission form.",
    nameField: "displayName",
    searchFields: ["displayName", "areaOrCompany"],
    orderScope: [],
    columns: [
      { key: "displayName", label: "Name" },
      { key: "areaOrCompany", label: "Area / company" },
      { key: "rating", label: "Rating" },
      { key: "featured", label: "Featured", type: "bool" },
      { key: "published", label: "Published", type: "bool" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      t("displayName", "Display name", { required: true, min: 2, max: 100, width: "half" }),
      t("areaOrCompany", "Area or company (optional)", { max: 100, width: "half" }),
      bta("quote", "Quote", { required: true, max: 600 }),
      { name: "rating", label: "Rating (1-5, optional)", type: "number", min: 1, max: 5, width: "half" },
      { name: "avatarMediaId", label: "Avatar (optional)", type: "media", mediaCategory: "REVIEW" },
      { name: "featured", label: "Featured", type: "checkbox", width: "half" },
      { name: "published", label: "Published", type: "checkbox", width: "half" },
      order,
    ],
  },
  blog: {
    key: "blog",
    title: "Blog Posts",
    singular: "Blog post",
    nameField: "titleEn",
    searchFields: ["titleEn", "titleBn", "slug"],
    filters: [
      { name: "status", label: "Status", options: [{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" }] },
      { name: "categoryId", label: "Category", optionsKey: "blogCategories" },
    ],
    columns: [
      { key: "titleEn", label: "Title" },
      { key: "category.nameEn", label: "Category" },
      { key: "status", label: "Status", type: "badge" },
      { key: "authorDisplayName", label: "Author" },
      { key: "publishedAt", label: "Published", type: "date" },
      { key: "updatedAt", label: "Updated", type: "date" },
    ],
    preview: (id) => `/admin/blog/${id}/preview`,
    fields: [
      bt("title", "Title", { required: true, min: 3, max: 180 }),
      { ...slug, help: "Shared by English and Bangla URLs. Changing the slug of a published post breaks old links (no redirects in V1)." },
      { name: "categoryId", label: "Category", type: "select", optionsKey: "blogCategories", width: "half" },
      bta("excerpt", "Excerpt", { max: 500, required: true }),
      { name: "content", label: "Content", type: "richtext", bilingual: true, required: true },
      { name: "featuredMediaId", label: "Featured image", type: "media", mediaCategory: "BLOG" },
      t("authorDisplayName", "Author display name", { max: 100, width: "half" }),
      { name: "readMinutes", label: "Read time (minutes)", type: "number", min: 1, max: 120, width: "half" },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        width: "half",
        options: [
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ],
        help: "Only Published posts are public. Drafts/archived return 404.",
      },
      { name: "publishedAt", label: "Publish date (Asia/Dhaka)", type: "datetime", width: "half", help: "Set automatically on first publish. A future date keeps the post hidden until then." },
      { name: "featured", label: "Featured on blog page", type: "checkbox" },
      bt("seoTitle", "SEO title", { max: 120, softMax: 70 }),
      bta("seoDescription", "SEO description", { max: 300, softMax: 170 }),
      { name: "ogMediaId", label: "Social share image (optional)", type: "media", mediaCategory: "BLOG" },
    ],
  },
  "blog-categories": {
    key: "blog-categories",
    title: "Blog Categories",
    singular: "Blog category",
    nameField: "nameEn",
    orderScope: [],
    parent: { href: "/admin/blog", label: "Blog" },
    columns: [
      { key: "nameEn", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [bt("name", "Name", { required: true, max: 80 }), slug, active, order],
  },
  offices: {
    key: "offices",
    title: "Offices",
    singular: "Office",
    description: "Head office appears first. Exactly one office can be the primary head office.",
    nameField: "nameEn",
    orderScope: [],
    columns: [
      { key: "nameEn", label: "Name" },
      { key: "type", label: "Type", type: "badge" },
      { key: "isPrimary", label: "Primary", type: "bool" },
      { key: "phone", label: "Phone" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      bt("name", "Office name", { required: true, max: 100 }),
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        width: "half",
        options: [
          { value: "HEAD_OFFICE", label: "Head office" },
          { value: "BRANCH", label: "Branch" },
        ],
      },
      t("district", "District (optional)", { max: 60, width: "half" }),
      bta("address", "Address", { required: true, max: 500 }),
      t("phone", "Phone", { max: 40, width: "half" }),
      t("email", "Email", { type: "email", max: 254, width: "half" }),
      bt("hours", "Opening hours", { max: 120 }),
      t("mapUrl", "Map link (https)", { type: "url" }),
      { name: "latitude", label: "Latitude (optional)", type: "number", min: -90, max: 90, width: "half" },
      { name: "longitude", label: "Longitude (optional)", type: "number", min: -180, max: 180, width: "half" },
      { name: "isPrimary", label: "Primary head office", type: "checkbox", width: "half" },
      active,
      order,
    ],
  },
  payments: {
    key: "payments",
    title: "Payment Methods",
    singular: "Payment method",
    description: "Instruction-only Pay Bill content. Changes are audited and require recent password confirmation.",
    nameField: "titleEn",
    sensitive: true,
    orderScope: [],
    filters: [
      {
        name: "type",
        label: "Type",
        options: [
          { value: "BKASH", label: "bKash" },
          { value: "NAGAD", label: "Nagad" },
          { value: "ROCKET", label: "Rocket" },
          { value: "BANK", label: "Bank" },
        ],
      },
    ],
    columns: [
      { key: "titleEn", label: "Title" },
      { key: "type", label: "Type", type: "badge" },
      { key: "bankName", label: "Bank" },
      { key: "accountNumber", label: "Account number" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        width: "half",
        options: [
          { value: "BKASH", label: "bKash" },
          { value: "NAGAD", label: "Nagad" },
          { value: "ROCKET", label: "Rocket" },
          { value: "BANK", label: "Bank account" },
        ],
      },
      bt("title", "Title", { required: true, max: 80 }),
      t("accountNumber", "Account / merchant number", { required: true, max: 60, width: "half" }),
      bt("accountType", "Account type (e.g. Personal, Merchant, Current)", { max: 60 }),
      t("bankName", "Bank name (bank only)", { max: 100, width: "half" }),
      t("accountName", "Account name (bank only)", { max: 100, width: "half" }),
      t("branch", "Branch (bank only)", { max: 100, width: "half" }),
      t("routingNumber", "Routing number (bank only)", { max: 40, width: "half" }),
      bta("referenceInstruction", "Reference instruction", { max: 300 }),
      { name: "instructions", label: "Numbered steps (one per line)", type: "lines", bilingual: true, max: 10 },
      { name: "logoMediaId", label: "Logo (optional)", type: "media", mediaCategory: "LOGO" },
      { name: "qrMediaId", label: "QR image (optional, client-approved)", type: "media", mediaCategory: "PAYMENT_QR" },
      active,
      order,
    ],
  },
  navigation: {
    key: "navigation",
    title: "Navigation & Footer Links",
    singular: "Navigation link",
    description: "Header menu and footer columns. Top-level links only.",
    nameField: "labelEn",
    orderScope: ["location"],
    filters: [
      {
        name: "location",
        label: "Location",
        options: [
          { value: "HEADER", label: "Header" },
          { value: "FOOTER_COMPANY", label: "Footer · Company" },
          { value: "FOOTER_INTERNET", label: "Footer · Internet" },
          { value: "FOOTER_SUPPORT", label: "Footer · Support" },
          { value: "FOOTER_LEGAL", label: "Footer · Legal" },
        ],
      },
    ],
    columns: [
      { key: "labelEn", label: "Label" },
      { key: "location", label: "Location", type: "badge" },
      { key: "url", label: "URL" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      {
        name: "location",
        label: "Location",
        type: "select",
        required: true,
        options: [
          { value: "HEADER", label: "Header" },
          { value: "FOOTER_COMPANY", label: "Footer · Company" },
          { value: "FOOTER_INTERNET", label: "Footer · Internet" },
          { value: "FOOTER_SUPPORT", label: "Footer · Support" },
          { value: "FOOTER_LEGAL", label: "Footer · Legal" },
        ],
      },
      bt("label", "Label", { required: true, max: 60 }),
      t("url", "URL", { type: "url", allowRelative: true, required: true, placeholder: "/packages or https://..." }),
      { name: "external", label: "External link", type: "checkbox", width: "half" },
      { name: "newTab", label: "Open in new tab", type: "checkbox", width: "half" },
      active,
      order,
    ],
  },
  "social-links": {
    key: "social-links",
    title: "Social Links",
    singular: "Social link",
    description: "Icons appear in header/footer only when a URL is configured and active.",
    nameField: "platform",
    orderScope: [],
    parent: { href: "/admin/navigation", label: "Navigation & Footer" },
    columns: [
      { key: "platform", label: "Platform", type: "badge" },
      { key: "url", label: "URL" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      { name: "platform", label: "Platform", type: "select", required: true, options: SOCIAL_PLATFORMS.map((p) => ({ value: p, label: p })) },
      t("url", "URL (https)", { type: "url", required: true }),
      active,
      order,
    ],
  },
  seo: {
    key: "seo",
    title: "SEO",
    singular: "SEO entry",
    description: "Per-route titles, descriptions and share images. Blog posts keep SEO on the post itself.",
    nameField: "routeKey",
    searchFields: ["routeKey"],
    columns: [
      { key: "routeKey", label: "Route key" },
      { key: "titleEn", label: "Title (EN)" },
      { key: "indexable", label: "Indexable", type: "bool" },
      { key: "updatedAt", label: "Updated", type: "date" },
    ],
    fields: [
      t("routeKey", "Route key", { required: true, max: 120, help: "home, packages, corporate, coverage, pay-bill, blog, about, support, contact, get-connection, privacy, terms, payment-policy" }),
      bt("title", "Title", { max: 120, softMax: 70, bnOptional: true }),
      bta("description", "Description", { max: 300, softMax: 170, bnOptional: true }),
      { name: "ogMediaId", label: "Share image (optional)", type: "media", mediaCategory: "GENERAL" },
      { name: "indexable", label: "Allow search engines to index this page", type: "checkbox" },
    ],
  },
  "coverage-districts": {
    key: "coverage-districts",
    title: "Districts",
    singular: "District",
    nameField: "nameEn",
    orderScope: [],
    parent: { href: "/admin/coverage", label: "Coverage" },
    columns: [
      { key: "nameEn", label: "Name" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [bt("name", "District name", { required: true, max: 80 }), slug, active, order],
  },
  "coverage-thanas": {
    key: "coverage-thanas",
    title: "Thanas / Upazilas",
    singular: "Thana / Upazila",
    nameField: "nameEn",
    orderScope: ["districtId"],
    parent: { href: "/admin/coverage", label: "Coverage" },
    filters: [{ name: "districtId", label: "District", optionsKey: "districts" }],
    columns: [
      { key: "nameEn", label: "Name" },
      { key: "district.nameEn", label: "District" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      { name: "districtId", label: "District", type: "select", optionsKey: "districts", required: true },
      bt("name", "Thana / Upazila name", { required: true, max: 80 }),
      slug,
      active,
      order,
    ],
  },
  "coverage-areas": {
    key: "coverage-areas",
    title: "Coverage Areas",
    singular: "Area",
    nameField: "nameEn",
    orderScope: ["thanaId"],
    parent: { href: "/admin/coverage", label: "Coverage" },
    searchFields: ["nameEn", "nameBn"],
    filters: [{ name: "thanaId", label: "Thana", optionsKey: "thanas" }],
    columns: [
      { key: "nameEn", label: "Name" },
      { key: "thana.nameEn", label: "Thana" },
      { key: "active", label: "Status", type: "status-active" },
      { key: "displayOrder", label: "Order", type: "order" },
    ],
    fields: [
      { name: "thanaId", label: "Thana / Upazila", type: "select", optionsKey: "thanas", required: true },
      bt("name", "Area name", { required: true, max: 100 }),
      slug,
      bt("publicNote", "Public note (optional)", { max: 200, bnOptional: true }),
      t("internalNote", "Internal note (never shown publicly)", { type: "textarea", max: 1000 }),
      { name: "active", label: "Active coverage (available)", type: "checkbox", width: "half" },
      order,
    ],
  },
};

export function getResource(key: string): ResourceConfig | undefined {
  return Object.prototype.hasOwnProperty.call(RESOURCES, key) ? RESOURCES[key] : undefined;
}
