import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { PermissionKey } from "@/lib/auth/permissions";
import type { AdminContext } from "@/lib/auth/session";
import type { CacheTag } from "@/server/revalidate";
import type { SelectOption } from "@/features/fields";

/**
 * Server-side behavior for config-driven CRUD resources. Every mutation goes through
 * server/admin/resource-actions.ts (authenticate → authorize → rate limit → validate → save → audit → revalidate).
 */

// Prisma delegates are selected dynamically by name; this minimal structural type keeps
// the generic CRUD layer typed without importing every delegate type.
interface Delegate {
  findMany(args: object): Promise<Record<string, unknown>[]>;
  findUnique(args: object): Promise<Record<string, unknown> | null>;
  findFirst(args: object): Promise<Record<string, unknown> | null>;
  count(args: object): Promise<number>;
  create(args: object): Promise<Record<string, unknown>>;
  update(args: object): Promise<Record<string, unknown>>;
  delete(args: object): Promise<Record<string, unknown>>;
}

export function delegate(model: string, client: Prisma.TransactionClient | typeof db = db): Delegate {
  return (client as unknown as Record<string, Delegate>)[model];
}

export class FieldError extends Error {
  constructor(public fields: Record<string, string>) {
    super("VALIDATION_ERROR");
  }
}

export interface SaveCtx {
  id: string | null;
  admin: AdminContext;
  before: Record<string, unknown> | null;
}

export interface ServerResource {
  model: string;
  entity: string;
  read: PermissionKey[];
  write: PermissionKey;
  tags: CacheTag[];
  include?: Record<string, unknown>;
  hasDisplayOrder?: boolean;
  defaultOrderBy?: Record<string, "asc" | "desc">[];
  /** Transform validated form data into Prisma data (may throw FieldError). */
  beforeSave?: (data: Record<string, unknown>, ctx: SaveCtx) => Promise<Record<string, unknown>>;
  /** Side effects inside the same transaction after create/update. */
  afterSave?: (tx: Prisma.TransactionClient, id: string, form: Record<string, unknown>, ctx: SaveCtx) => Promise<void>;
  /** Map a DB row to initial form values. */
  toForm?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Custom delete behavior; returns a message on archive or throws FieldError to block. */
  remove?: (id: string, admin: AdminContext) => Promise<{ archived?: boolean }>;
  /** Keys produced by the form that are not DB columns. */
  virtual?: string[];
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function ensureSlug(
  model: string,
  data: Record<string, unknown>,
  id: string | null,
  sourceKey: string,
  scope: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  let slug = (data.slug as string | null) || slugify(String(data[sourceKey] ?? ""));
  if (!slug) slug = `item-${Date.now().toString(36)}`;
  if (!SLUG_RE.test(slug)) throw new FieldError({ slug: "Slug must be lowercase ASCII kebab-case (a-z, 0-9, hyphen)." });
  const clash = await delegate(model).findFirst({ where: { slug, ...scope, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (clash) throw new FieldError({ slug: "This slug is already used. Choose another." });
  return { ...data, slug };
}

function pairLines(en: unknown, bn: unknown, label: string): Array<{ labelEn: string; labelBn: string }> {
  const a = Array.isArray(en) ? (en as string[]) : [];
  const b = Array.isArray(bn) ? (bn as string[]) : [];
  if (a.length !== b.length) throw new FieldError({ featuresBn: `${label}: English and Bangla must have the same number of lines (${a.length} vs ${b.length}).` });
  return a.map((labelEn, i) => ({ labelEn, labelBn: b[i] }));
}

async function blockIfChildren(count: number, what: string) {
  if (count > 0) throw new FieldError({ _form: `Cannot delete: it still has ${count} ${what}. Deactivate it instead, or remove the children first.` });
}

const toStr = (v: unknown) => (v === null || v === undefined ? v : String(v));

export const SERVER_RESOURCES: Record<string, ServerResource> = {
  packages: {
    model: "package",
    entity: "Package",
    read: ["packages.read", "packages.manage"],
    write: "packages.manage",
    tags: ["packages"],
    hasDisplayOrder: true,
    include: { features: { orderBy: { displayOrder: "asc" } } },
    virtual: ["featuresEn", "featuresBn"],
    async beforeSave(data, ctx) {
      pairLines(data.featuresEn, data.featuresBn, "Feature bullets");
      if (data.oldPrice !== null && data.oldPrice !== undefined && Number(data.oldPrice) <= Number(data.price)) {
        throw new FieldError({ oldPrice: "Old price should be higher than the current price (or empty)." });
      }
      const out = await ensureSlug("package", data, ctx.id, "nameEn");
      if (out.active === true) out.archivedAt = null;
      return out;
    },
    async afterSave(tx, id, form) {
      const pairs = pairLines(form.featuresEn, form.featuresBn, "Feature bullets");
      await tx.packageFeature.deleteMany({ where: { packageId: id } });
      if (pairs.length) await tx.packageFeature.createMany({ data: pairs.map((p, i) => ({ ...p, packageId: id, displayOrder: i })) });
    },
    toForm(row) {
      const features = (row.features as Array<{ labelEn: string; labelBn: string }>) ?? [];
      return { ...row, price: toStr(row.price), oldPrice: toStr(row.oldPrice), featuresEn: features.map((f) => f.labelEn), featuresBn: features.map((f) => f.labelBn) };
    },
    async remove(id) {
      // Packages referenced by historical leads are archived, never permanently deleted.
      const refs = await db.connectionRequest.count({ where: { packageId: id } });
      if (refs > 0) {
        await db.package.update({ where: { id }, data: { archivedAt: new Date(), active: false, featured: false, popular: false } });
        return { archived: true };
      }
      await db.package.delete({ where: { id } });
      return {};
    },
  },
  tariffs: {
    model: "tariffDocument",
    entity: "TariffDocument",
    read: ["packages.read", "packages.manage"],
    write: "packages.manage",
    tags: ["tariff"],
    hasDisplayOrder: true,
  },
  corporate: {
    model: "corporateService",
    entity: "CorporateService",
    read: ["corporate.manage"],
    write: "corporate.manage",
    tags: ["corporate"],
    hasDisplayOrder: true,
    beforeSave: (d, c) => ensureSlug("corporateService", d, c.id, "titleEn"),
  },
  offers: {
    model: "offer",
    entity: "Offer",
    read: ["offers.manage"],
    write: "offers.manage",
    tags: ["offers"],
    defaultOrderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    async beforeSave(d) {
      if (d.startAt && d.endAt && (d.endAt as Date) <= (d.startAt as Date)) throw new FieldError({ endAt: "End must be after start." });
      return d;
    },
  },
  faqs: {
    model: "fAQ",
    entity: "FAQ",
    read: ["faq.read", "faq.manage"],
    write: "faq.manage",
    tags: ["faq"],
    hasDisplayOrder: true,
    include: { category: { select: { nameEn: true } } },
    async beforeSave(d) {
      if (d.categoryId && !(await db.fAQCategory.findUnique({ where: { id: d.categoryId as string } }))) throw new FieldError({ categoryId: "Unknown category." });
      return d;
    },
  },
  "faq-categories": {
    model: "fAQCategory",
    entity: "FAQCategory",
    read: ["faq.read", "faq.manage"],
    write: "faq.manage",
    tags: ["faq"],
    hasDisplayOrder: true,
    beforeSave: (d, c) => ensureSlug("fAQCategory", d, c.id, "nameEn"),
  },
  reviews: {
    model: "review",
    entity: "Review",
    read: ["reviews.manage"],
    write: "reviews.manage",
    tags: ["reviews"],
    hasDisplayOrder: true,
  },
  blog: {
    model: "blogPost",
    entity: "BlogPost",
    read: ["blog.manage"],
    write: "blog.manage",
    tags: ["blog"],
    defaultOrderBy: [{ updatedAt: "desc" }],
    include: { category: { select: { nameEn: true } } },
    async beforeSave(d, ctx) {
      const out = await ensureSlug("blogPost", d, ctx.id, "titleEn");
      if (out.categoryId && !(await db.blogCategory.findUnique({ where: { id: out.categoryId as string } }))) throw new FieldError({ categoryId: "Unknown category." });
      if (out.status === "PUBLISHED" && !out.publishedAt) out.publishedAt = new Date();
      if (!ctx.id) out.authorId = ctx.admin.userId;
      if (!out.authorDisplayName) out.authorDisplayName = ctx.admin.displayName;
      return out;
    },
    async remove(id) {
      // Posts are archived first (recoverable); an archived post can then be permanently deleted.
      const post = await db.blogPost.findUniqueOrThrow({ where: { id } });
      if (post.status !== "ARCHIVED") {
        await db.blogPost.update({ where: { id }, data: { status: "ARCHIVED" } });
        return { archived: true };
      }
      await db.blogPost.delete({ where: { id } });
      return {};
    },
  },
  "blog-categories": {
    model: "blogCategory",
    entity: "BlogCategory",
    read: ["blog.manage"],
    write: "blog.manage",
    tags: ["blog"],
    hasDisplayOrder: true,
    beforeSave: (d, c) => ensureSlug("blogCategory", d, c.id, "nameEn"),
  },
  offices: {
    model: "office",
    entity: "Office",
    read: ["offices.manage"],
    write: "offices.manage",
    tags: ["offices"],
    hasDisplayOrder: true,
    defaultOrderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
    async beforeSave(d) {
      if (d.isPrimary && d.type !== "HEAD_OFFICE") throw new FieldError({ isPrimary: "Only a head office can be the primary office." });
      return d;
    },
    async afterSave(tx, id, form) {
      // Exactly one primary head office at a time.
      if (form.isPrimary) await tx.office.updateMany({ where: { id: { not: id }, isPrimary: true }, data: { isPrimary: false } });
    },
    toForm: (row) => ({ ...row, latitude: toStr(row.latitude), longitude: toStr(row.longitude) }),
  },
  payments: {
    model: "paymentMethod",
    entity: "PaymentMethod",
    read: ["payments.read", "payments.manage"],
    write: "payments.manage",
    tags: ["payments"],
    hasDisplayOrder: true,
    async beforeSave(d) {
      if (d.type === "BANK" && (!d.bankName || !d.accountName)) throw new FieldError({ bankName: "Bank name and account name are required for bank accounts." });
      return { ...d, instructionsEn: d.instructionsEn ?? [], instructionsBn: d.instructionsBn ?? [] };
    },
  },
  navigation: {
    model: "navigationItem",
    entity: "NavigationItem",
    read: ["navigation.manage"],
    write: "navigation.manage",
    tags: ["navigation"],
    hasDisplayOrder: true,
    defaultOrderBy: [{ location: "asc" }, { displayOrder: "asc" }],
    async beforeSave(d) {
      const url = String(d.url ?? "");
      return { ...d, external: d.external || /^https?:\/\//.test(url) };
    },
  },
  "social-links": {
    model: "socialLink",
    entity: "SocialLink",
    read: ["brand.update", "navigation.manage"],
    write: "navigation.manage",
    tags: ["brand"],
    hasDisplayOrder: true,
    async beforeSave(d) {
      if (!String(d.url ?? "").startsWith("https://")) throw new FieldError({ url: "Social links must use https://" });
      return d;
    },
  },
  seo: {
    model: "seoEntry",
    entity: "SeoEntry",
    read: ["seo.manage"],
    write: "seo.manage",
    tags: ["seo"],
    defaultOrderBy: [{ routeKey: "asc" }],
    async beforeSave(d, ctx) {
      const key = String(d.routeKey ?? "").trim();
      if (!/^[a-z0-9:-]+$/.test(key)) throw new FieldError({ routeKey: "Use lowercase letters, numbers, ':' and '-' only." });
      const clash = await db.seoEntry.findFirst({ where: { routeKey: key, ...(ctx.id ? { id: { not: ctx.id } } : {}) } });
      if (clash) throw new FieldError({ routeKey: "An entry for this route already exists." });
      const CORE = ["home", "packages", "corporate", "coverage", "pay-bill", "contact", "get-connection", "support", "about", "blog"];
      if (d.indexable === false && CORE.includes(key) && !ctx.admin.permissions.has("settings.security.manage")) {
        throw new FieldError({ indexable: "Only a Super Admin can noindex a core production page." });
      }
      return { ...d, routeKey: key };
    },
  },
  "coverage-districts": {
    model: "district",
    entity: "District",
    read: ["coverage.read", "coverage.manage"],
    write: "coverage.manage",
    tags: ["coverage"],
    hasDisplayOrder: true,
    beforeSave: (d, c) => ensureSlug("district", d, c.id, "nameEn"),
    async remove(id) {
      await blockIfChildren(await db.thana.count({ where: { districtId: id } }), "thana(s)");
      await db.district.delete({ where: { id } });
      return {};
    },
  },
  "coverage-thanas": {
    model: "thana",
    entity: "Thana",
    read: ["coverage.read", "coverage.manage"],
    write: "coverage.manage",
    tags: ["coverage"],
    hasDisplayOrder: true,
    include: { district: { select: { nameEn: true } } },
    async beforeSave(d, c) {
      if (!(await db.district.findUnique({ where: { id: d.districtId as string } }))) throw new FieldError({ districtId: "Unknown district." });
      return ensureSlug("thana", d, c.id, "nameEn", { districtId: d.districtId });
    },
    async remove(id) {
      await blockIfChildren(await db.coverageArea.count({ where: { thanaId: id } }), "area(s)");
      await db.thana.delete({ where: { id } });
      return {};
    },
  },
  "coverage-areas": {
    model: "coverageArea",
    entity: "CoverageArea",
    read: ["coverage.read", "coverage.manage"],
    write: "coverage.manage",
    tags: ["coverage"],
    hasDisplayOrder: true,
    include: { thana: { select: { nameEn: true } } },
    async beforeSave(d, c) {
      if (!(await db.thana.findUnique({ where: { id: d.thanaId as string } }))) throw new FieldError({ thanaId: "Unknown thana." });
      return ensureSlug("coverageArea", d, c.id, "nameEn", { thanaId: d.thanaId });
    },
  },
};

/** Dynamic select options used by resource forms and filters. */
export async function loadOptions(keys: string[]): Promise<Record<string, SelectOption[]>> {
  const out: Record<string, SelectOption[]> = {};
  const unique = [...new Set(keys)];
  await Promise.all(
    unique.map(async (k) => {
      if (k === "faqCategories") out[k] = (await db.fAQCategory.findMany({ orderBy: { displayOrder: "asc" } })).map((c) => ({ value: c.id, label: c.nameEn }));
      if (k === "blogCategories") out[k] = (await db.blogCategory.findMany({ orderBy: { displayOrder: "asc" } })).map((c) => ({ value: c.id, label: c.nameEn }));
      if (k === "districts") out[k] = (await db.district.findMany({ orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }] })).map((c) => ({ value: c.id, label: c.nameEn }));
      if (k === "thanas")
        out[k] = (await db.thana.findMany({ orderBy: [{ district: { displayOrder: "asc" } }, { displayOrder: "asc" }], include: { district: { select: { nameEn: true } } } })).map((c) => ({
          value: c.id,
          label: `${c.nameEn} — ${c.district.nameEn}`,
        }));
    }),
  );
  return out;
}
