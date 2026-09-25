import "server-only";
import { unstable_cache } from "next/cache";
import type { NavLocation } from "@prisma/client";
import { db } from "@/lib/db";
import { asStringArray } from "@/lib/utils";

/**
 * Cached public read layer. Everything returned here is plain JSON (dates as ISO strings,
 * money as strings) because unstable_cache serializes results. Admin mutations revalidate
 * these tags (see server/revalidate.ts).
 */

export interface MediaDTO {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  altEn: string | null;
  altBn: string | null;
}

type MediaRow = { id: string; secureUrl: string; width: number | null; height: number | null; altEn: string | null; altBn: string | null } | null;
export function mediaDTO(m: MediaRow): MediaDTO | null {
  return m ? { id: m.id, url: m.secureUrl, width: m.width, height: m.height, altEn: m.altEn, altBn: m.altBn } : null;
}

const mediaSelect = { id: true, secureUrl: true, width: true, height: true, altEn: true, altBn: true } as const;

// ───────────── Brand / site ─────────────

export const getSite = unstable_cache(
  async () => {
    const brand = await db.brandSetting.findUnique({
      where: { id: "singleton" },
      include: {
        logoLight: { select: mediaSelect },
        logoDark: { select: mediaSelect },
        favicon: { select: mediaSelect },
        defaultOg: { select: mediaSelect },
      },
    });
    const social = await db.socialLink.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } });
    return {
      companyName: brand?.companyName ?? "Internet Service Provider",
      shortName: brand?.shortName ?? brand?.companyName ?? "ISP",
      taglineEn: brand?.taglineEn ?? "",
      taglineBn: brand?.taglineBn ?? "",
      descriptionEn: brand?.descriptionEn ?? "",
      descriptionBn: brand?.descriptionBn ?? "",
      primaryColor: brand?.primaryColor ?? "#0A66FF",
      secondaryColor: brand?.secondaryColor ?? "#071A2E",
      accentColor: brand?.accentColor ?? "#00BCEB",
      hotline: brand?.hotline ?? null,
      salesPhone: brand?.salesPhone ?? null,
      supportEmail: brand?.supportEmail ?? null,
      salesEmail: brand?.salesEmail ?? null,
      whatsappUrl: brand?.whatsappUrl ?? null,
      messengerUrl: brand?.messengerUrl ?? null,
      logoLight: mediaDTO(brand?.logoLight ?? null),
      logoDark: mediaDTO(brand?.logoDark ?? null),
      favicon: mediaDTO(brand?.favicon ?? null),
      defaultOg: mediaDTO(brand?.defaultOg ?? null),
      social: social.map((s) => ({ platform: s.platform, url: s.url })),
    };
  },
  ["public-site"],
  { tags: ["brand"] },
);
export type SiteDTO = Awaited<ReturnType<typeof getSite>>;

export const getNavigation = unstable_cache(
  async () => {
    const items = await db.navigationItem.findMany({ where: { active: true }, orderBy: [{ location: "asc" }, { displayOrder: "asc" }] });
    const by: Record<NavLocation, Array<{ labelEn: string; labelBn: string; url: string; external: boolean; newTab: boolean }>> = {
      HEADER: [],
      FOOTER_COMPANY: [],
      FOOTER_INTERNET: [],
      FOOTER_SUPPORT: [],
      FOOTER_LEGAL: [],
    };
    for (const i of items) by[i.location].push({ labelEn: i.labelEn, labelBn: i.labelBn, url: i.url, external: i.external, newTab: i.newTab });
    return by;
  },
  ["public-nav"],
  { tags: ["navigation"] },
);

// ───────────── Pages / sections ─────────────

export type SectionData = Record<string, unknown>;

export const getPageSections = unstable_cache(
  async (pageKey: string) => {
    const page = await db.page.findUnique({
      where: { key: pageKey },
      include: { sections: { where: { enabled: true }, orderBy: { displayOrder: "asc" } } },
    });
    if (!page) return { order: [] as string[], sections: {} as Record<string, SectionData>, media: {} as Record<string, MediaDTO> };
    const sections: Record<string, SectionData> = {};
    const mediaIds = new Set<string>();
    for (const s of page.sections) {
      const data = (s.data ?? {}) as SectionData;
      sections[s.type] = data;
      for (const [k, v] of Object.entries(data)) if (/mediaId$/i.test(k) && typeof v === "string" && v) mediaIds.add(v);
    }
    const mediaRows = mediaIds.size ? await db.media.findMany({ where: { id: { in: [...mediaIds] } }, select: mediaSelect }) : [];
    const media: Record<string, MediaDTO> = {};
    for (const m of mediaRows) media[m.id] = mediaDTO(m)!;
    return { order: page.sections.map((s) => s.type), sections, media };
  },
  ["public-page-sections"],
  { tags: ["pages"] },
);

export const getLegalPage = unstable_cache(
  async (key: string) => {
    const p = await db.page.findUnique({ where: { key } });
    if (!p || p.status !== "PUBLISHED") return null;
    return { titleEn: p.titleEn, titleBn: p.titleBn, contentEn: p.contentEn ?? "", contentBn: p.contentBn ?? "", updatedAt: p.updatedAt.toISOString() };
  },
  ["public-legal-page"],
  { tags: ["pages"] },
);

export const getSeoEntry = unstable_cache(
  async (routeKey: string) => {
    const s = await db.seoEntry.findUnique({ where: { routeKey }, include: { ogMedia: { select: mediaSelect } } });
    if (!s) return null;
    return {
      titleEn: s.titleEn,
      titleBn: s.titleBn,
      descriptionEn: s.descriptionEn,
      descriptionBn: s.descriptionBn,
      indexable: s.indexable,
      og: mediaDTO(s.ogMedia),
    };
  },
  ["public-seo"],
  { tags: ["seo"] },
);

// ───────────── Packages / services ─────────────

export const getPackages = unstable_cache(
  async () => {
    const rows = await db.package.findMany({
      where: { active: true, archivedAt: null },
      orderBy: [{ displayOrder: "asc" }, { speedMbps: "asc" }],
      include: { features: { orderBy: { displayOrder: "asc" } } },
    });
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameEn: p.nameEn,
      nameBn: p.nameBn,
      taglineEn: p.taglineEn,
      taglineBn: p.taglineBn,
      speedMbps: p.speedMbps,
      price: p.price.toString(),
      oldPrice: p.oldPrice?.toString() ?? null,
      billingPeriod: p.billingPeriod,
      installationNoteEn: p.installationNoteEn,
      installationNoteBn: p.installationNoteBn,
      vatNoteEn: p.vatNoteEn,
      vatNoteBn: p.vatNoteBn,
      popular: p.popular,
      featured: p.featured,
      offerBadgeEn: p.offerBadgeEn,
      offerBadgeBn: p.offerBadgeBn,
      iconKey: p.iconKey,
      features: p.features.map((f) => ({ labelEn: f.labelEn, labelBn: f.labelBn })),
    }));
  },
  ["public-packages"],
  { tags: ["packages"] },
);
export type PackageDTO = Awaited<ReturnType<typeof getPackages>>[number];

/** Up to 4 featured packages; fill from active order when fewer are featured (PRD 5.1 §3). */
export async function getFeaturedPackages(limit = 4): Promise<PackageDTO[]> {
  const all = await getPackages();
  const featured = all.filter((p) => p.featured);
  const rest = all.filter((p) => !p.featured);
  return [...featured, ...rest].slice(0, limit);
}

export const getCorporateServices = unstable_cache(
  async () => {
    const rows = await db.corporateService.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      include: { media: { select: mediaSelect } },
    });
    return rows.map((s) => ({
      id: s.id,
      slug: s.slug,
      titleEn: s.titleEn,
      titleBn: s.titleBn,
      descriptionEn: s.descriptionEn,
      descriptionBn: s.descriptionBn,
      iconKey: s.iconKey,
      media: mediaDTO(s.media),
    }));
  },
  ["public-corporate-services"],
  { tags: ["corporate"] },
);

// ───────────── Coverage ─────────────

export const getCoverageTree = unstable_cache(
  async () => {
    const districts = await db.district.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }],
      include: {
        thanas: {
          where: { active: true },
          orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }],
          include: {
            // Public: only safe fields. internalNote is never exposed.
            areas: {
              where: { active: true },
              orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }],
              select: { id: true, nameEn: true, nameBn: true, publicNoteEn: true, publicNoteBn: true },
            },
          },
        },
      },
    });
    return districts.map((d) => ({
      id: d.id,
      nameEn: d.nameEn,
      nameBn: d.nameBn,
      thanas: d.thanas.map((t) => ({ id: t.id, nameEn: t.nameEn, nameBn: t.nameBn, areas: t.areas })),
    }));
  },
  ["public-coverage-tree"],
  { tags: ["coverage"] },
);
export type CoverageTree = Awaited<ReturnType<typeof getCoverageTree>>;

// ───────────── Payments ─────────────

export const getPaymentMethods = unstable_cache(
  async () => {
    const rows = await db.paymentMethod.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }],
      include: { qrMedia: { select: mediaSelect }, logoMedia: { select: mediaSelect } },
    });
    return rows.map((p) => ({
      id: p.id,
      type: p.type,
      titleEn: p.titleEn,
      titleBn: p.titleBn,
      accountNumber: p.accountNumber,
      accountTypeEn: p.accountTypeEn,
      accountTypeBn: p.accountTypeBn,
      bankName: p.bankName,
      accountName: p.accountName,
      branch: p.branch,
      routingNumber: p.routingNumber,
      referenceInstructionEn: p.referenceInstructionEn,
      referenceInstructionBn: p.referenceInstructionBn,
      instructionsEn: asStringArray(p.instructionsEn),
      instructionsBn: asStringArray(p.instructionsBn),
      qr: mediaDTO(p.qrMedia),
      logo: mediaDTO(p.logoMedia),
    }));
  },
  ["public-payment-methods"],
  { tags: ["payments"] },
);
export type PaymentMethodDTO = Awaited<ReturnType<typeof getPaymentMethods>>[number];

// ───────────── FAQ / reviews / offers / offices ─────────────

export const getFaqs = unstable_cache(
  async () => {
    const [cats, faqs] = await Promise.all([
      db.fAQCategory.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
      db.fAQ.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }] }),
    ]);
    return {
      categories: cats.map((c) => ({ id: c.id, slug: c.slug, nameEn: c.nameEn, nameBn: c.nameBn })),
      faqs: faqs.map((f) => ({
        id: f.id,
        categoryId: f.categoryId,
        questionEn: f.questionEn,
        questionBn: f.questionBn,
        answerEn: f.answerEn,
        answerBn: f.answerBn,
        featured: f.featured,
      })),
    };
  },
  ["public-faqs"],
  { tags: ["faq"] },
);
export type FaqDTO = Awaited<ReturnType<typeof getFaqs>>["faqs"][number];

export const getReviews = unstable_cache(
  async () => {
    const rows = await db.review.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { displayOrder: "asc" }],
      take: 12,
      include: { avatar: { select: mediaSelect } },
    });
    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      areaOrCompany: r.areaOrCompany,
      quoteEn: r.quoteEn,
      quoteBn: r.quoteBn,
      rating: r.rating,
      avatar: mediaDTO(r.avatar),
    }));
  },
  ["public-reviews"],
  { tags: ["reviews"] },
);
export type ReviewDTO = Awaited<ReturnType<typeof getReviews>>[number];

const getOffersRaw = unstable_cache(
  async () => {
    const rows = await db.offer.findMany({
      where: { active: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: { media: { select: mediaSelect } },
    });
    return rows.map((o) => ({
      id: o.id,
      titleEn: o.titleEn,
      titleBn: o.titleBn,
      descriptionEn: o.descriptionEn,
      descriptionBn: o.descriptionBn,
      ctaLabelEn: o.ctaLabelEn,
      ctaLabelBn: o.ctaLabelBn,
      ctaUrl: o.ctaUrl,
      highlightsEn: asStringArray(o.highlightsEn),
      highlightsBn: asStringArray(o.highlightsBn),
      startAt: o.startAt?.toISOString() ?? null,
      endAt: o.endAt?.toISOString() ?? null,
      media: mediaDTO(o.media),
    }));
  },
  ["public-offers"],
  { tags: ["offers"], revalidate: 300 },
);

/** Offers whose window includes "now" — expired offers stop rendering even if active=true. */
export async function getActiveOffers(now = new Date()) {
  const all = await getOffersRaw();
  const t = now.getTime();
  return all.filter((o) => (!o.startAt || new Date(o.startAt).getTime() <= t) && (!o.endAt || new Date(o.endAt).getTime() > t));
}
export type OfferDTO = Awaited<ReturnType<typeof getActiveOffers>>[number];

export const getOffices = unstable_cache(
  async () => {
    const rows = await db.office.findMany({
      where: { active: true },
      orderBy: [{ isPrimary: "desc" }, { type: "asc" }, { displayOrder: "asc" }],
    });
    return rows.map((o) => ({
      id: o.id,
      nameEn: o.nameEn,
      nameBn: o.nameBn,
      type: o.type,
      addressEn: o.addressEn,
      addressBn: o.addressBn,
      phone: o.phone,
      email: o.email,
      mapUrl: o.mapUrl,
      hoursEn: o.hoursEn,
      hoursBn: o.hoursBn,
      isPrimary: o.isPrimary,
    }));
  },
  ["public-offices"],
  { tags: ["offices"] },
);
export type OfficeDTO = Awaited<ReturnType<typeof getOffices>>[number];

// ───────────── Blog ─────────────

const postCardSelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleBn: true,
  excerptEn: true,
  excerptBn: true,
  publishedAt: true,
  readMinutes: true,
  featured: true,
  category: { select: { slug: true, nameEn: true, nameBn: true } },
  featuredMedia: { select: mediaSelect },
} as const;

type PostCardRow = {
  id: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  excerptEn: string;
  excerptBn: string;
  publishedAt: Date | null;
  readMinutes: number | null;
  featured: boolean;
  category: { slug: string; nameEn: string; nameBn: string } | null;
  featuredMedia: MediaRow;
};
function postCard(p: PostCardRow) {
  return {
    id: p.id,
    slug: p.slug,
    titleEn: p.titleEn,
    titleBn: p.titleBn,
    excerptEn: p.excerptEn,
    excerptBn: p.excerptBn,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    readMinutes: p.readMinutes,
    featured: p.featured,
    category: p.category,
    image: mediaDTO(p.featuredMedia),
  };
}
export type PostCardDTO = ReturnType<typeof postCard>;

const publishedWhere = () => ({ status: "PUBLISHED" as const, publishedAt: { lte: new Date() } });

export const getBlogCategories = unstable_cache(
  async () => {
    const rows = await db.blogCategory.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } });
    return rows.map((c) => ({ slug: c.slug, nameEn: c.nameEn, nameBn: c.nameBn }));
  },
  ["public-blog-categories"],
  { tags: ["blog"] },
);

export const getBlogList = unstable_cache(
  async (page: number, pageSize: number, category: string | null, q: string | null) => {
    const where = {
      ...publishedWhere(),
      ...(category ? { category: { slug: category } } : {}),
      ...(q
        ? {
            OR: [
              { titleEn: { contains: q, mode: "insensitive" as const } },
              { titleBn: { contains: q, mode: "insensitive" as const } },
              { excerptEn: { contains: q, mode: "insensitive" as const } },
              { excerptBn: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      db.blogPost.count({ where }),
      db.blogPost.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: postCardSelect }),
    ]);
    return { total, posts: rows.map(postCard) };
  },
  ["public-blog-list"],
  { tags: ["blog"], revalidate: 600 },
);

export const getLatestPosts = unstable_cache(
  async (take: number) => {
    const rows = await db.blogPost.findMany({ where: publishedWhere(), orderBy: { publishedAt: "desc" }, take, select: postCardSelect });
    return rows.map(postCard);
  },
  ["public-blog-latest"],
  { tags: ["blog"], revalidate: 600 },
);

export const getFeaturedPost = unstable_cache(
  async () => {
    const row = await db.blogPost.findFirst({ where: { ...publishedWhere(), featured: true }, orderBy: { publishedAt: "desc" }, select: postCardSelect });
    return row ? postCard(row) : null;
  },
  ["public-blog-featured"],
  { tags: ["blog"], revalidate: 600 },
);

export const getPostBySlug = unstable_cache(
  async (slug: string) => {
    const p = await db.blogPost.findFirst({
      where: { slug, ...publishedWhere() },
      include: {
        category: { select: { slug: true, nameEn: true, nameBn: true } },
        featuredMedia: { select: mediaSelect },
        ogMedia: { select: mediaSelect },
      },
    });
    if (!p) return null;
    return {
      ...postCard({ ...p, featuredMedia: p.featuredMedia }),
      contentEn: p.contentEn,
      contentBn: p.contentBn,
      authorDisplayName: p.authorDisplayName,
      seoTitleEn: p.seoTitleEn,
      seoTitleBn: p.seoTitleBn,
      seoDescriptionEn: p.seoDescriptionEn,
      seoDescriptionBn: p.seoDescriptionBn,
      og: mediaDTO(p.ogMedia),
      updatedAt: p.updatedAt.toISOString(),
      categoryId: p.categoryId,
    };
  },
  ["public-blog-post"],
  { tags: ["blog"], revalidate: 600 },
);

export const getRelatedPosts = unstable_cache(
  async (postId: string, categoryId: string | null) => {
    const rows = await db.blogPost.findMany({
      where: { ...publishedWhere(), id: { not: postId }, ...(categoryId ? { categoryId } : {}) },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: postCardSelect,
    });
    return rows.map(postCard);
  },
  ["public-blog-related"],
  { tags: ["blog"], revalidate: 600 },
);

// ───────────── BTRC tariff documents ─────────────

export const getTariffDocuments = unstable_cache(
  async () => {
    const rows = await db.tariffDocument.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }, { issuedAt: "desc" }] });
    return rows.map((d) => ({
      id: d.id,
      titleEn: d.titleEn,
      titleBn: d.titleBn,
      descriptionEn: d.descriptionEn,
      descriptionBn: d.descriptionBn,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      memoNumber: d.memoNumber,
      issuedAt: d.issuedAt?.toISOString() ?? null,
    }));
  },
  ["public-tariff-documents"],
  { tags: ["tariff"] },
);
export type TariffDocumentDTO = Awaited<ReturnType<typeof getTariffDocuments>>[number];
