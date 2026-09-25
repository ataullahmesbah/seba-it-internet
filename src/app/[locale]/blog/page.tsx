import Link from "@/components/public/link";
import { ArrowRight, Calendar, Clock3, MessageSquareQuote, Search } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { localizedHref, pick } from "@/lib/i18n";
import { raw, s } from "@/features/section-utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getBlogCategories, getBlogList, getFeaturedPost, getPageSections } from "@/server/public-data";
import { BlogCard, PageHero, SectionHeading } from "@/components/public/blocks";
import { MediaImage } from "@/components/public/media-image";
import { NetworkDots } from "@/components/public/art";

const PAGE_SIZE = 9;

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/blog">) {
  const { locale } = await resolveLocale(params);
  const sp = await searchParams;
  // Filtered/search/paginated listing variants are not indexed separately.
  const noindex = Boolean(sp.q || sp.category || (sp.page && sp.page !== "1"));
  return buildMetadata({ routeKey: "blog", path: "/blog", locale, title: "Blog", noindex });
}

export default async function BlogPage({ params, searchParams }: PageProps<"/[locale]/blog">) {
  const { locale, dict } = await resolveLocale(params);
  const sp = await searchParams;
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const category = typeof sp.category === "string" ? sp.category.slice(0, 100) : null;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim().slice(0, 100) : null;
  const [{ sections, media }, cats, list, featured] = await Promise.all([
    getPageSections("blog"),
    getBlogCategories(),
    getBlogList(page, PAGE_SIZE, category, q),
    getFeaturedPost(),
  ]);
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const href = (p: { page?: number; category?: string | null; q?: string | null }) => {
    const u = new URLSearchParams();
    const c = p.category === undefined ? category : p.category;
    const qq = p.q === undefined ? q : p.q;
    if (c) u.set("category", c);
    if (qq) u.set("q", qq);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    const qs = u.toString();
    return localizedHref("/blog", locale) + (qs ? `?${qs}` : "");
  };
  const t = dict.blog;
  const story = sections.story;

  return (
    <>
      <PageHero data={sections.hero} media={media} locale={locale} />
      {featured && page === 1 && !category && !q && (
        <section className="relative z-10 -mt-8 sm:-mt-12">
          <div className="container-x">
            <article className="card grid overflow-hidden md:grid-cols-2">
              <Link href={localizedHref(`/blog/${featured.slug}`, locale)} className="relative block min-h-56 bg-gradient-to-br from-primary-soft to-accent-soft" tabIndex={-1} aria-hidden>
                {featured.image ? <MediaImage media={featured.image} locale={locale} decorative priority className="object-cover" sizes="50vw" /> : <NetworkDots className="absolute inset-0 m-auto h-3/4 w-3/4" />}
              </Link>
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <p className="flex gap-2 text-xs">
                  <span className="rounded-full bg-primary px-2.5 py-1 font-semibold text-white">{t.featured}</span>
                  {featured.category && <span className="rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary">{pick(featured.category, "name", locale)}</span>}
                </p>
                <h2 className="mt-4 text-2xl font-bold text-ink">
                  <Link href={localizedHref(`/blog/${featured.slug}`, locale)} className="hover:text-primary">
                    {pick(featured, "title", locale)}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">{pick(featured, "excerpt", locale)}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                  <span className="flex items-center gap-3">
                    {featured.publishedAt && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden /> {formatDate(featured.publishedAt, locale)}</span>}
                    {featured.readMinutes && <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden /> {featured.readMinutes} {dict.common.minRead}</span>}
                  </span>
                  <Link href={localizedHref(`/blog/${featured.slug}`, locale)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {dict.common.readMore} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}
      <section className="section">
        <div className="container-x">
          <h2 className="mb-4 text-lg font-bold text-ink">{t.categories}</h2>
          <nav aria-label={t.categories} className="-mx-4 mb-10 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href={href({ category: null, page: 1 })} aria-current={!category ? "page" : undefined} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", !category ? "border-primary bg-primary text-white" : "border-line bg-white hover:border-primary")}>
              {t.allPosts}
            </Link>
            {cats.map((c) => (
              <Link key={c.slug} href={href({ category: c.slug, page: 1 })} aria-current={category === c.slug ? "page" : undefined} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", category === c.slug ? "border-primary bg-primary text-white" : "border-line bg-white hover:border-primary")}>
                {pick(c, "name", locale)}
              </Link>
            ))}
          </nav>
          <SectionHeading
            title={t.latest}
            action={
              <form action={localizedHref("/blog", locale)} role="search" className="relative w-full sm:w-72">
                {category && <input type="hidden" name="category" value={category} />}
                <label htmlFor="blog-q" className="sr-only">{dict.common.search}</label>
                <input id="blog-q" name="q" defaultValue={q ?? ""} placeholder={t.searchPh} className="input pr-10" maxLength={100} />
                <button type="submit" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-primary" aria-label={dict.common.search}>
                  <Search className="h-4 w-4" />
                </button>
              </form>
            }
          />
          {list.posts.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.posts.map((p) => (
                <BlogCard key={p.id} post={p} locale={locale} dict={dict} />
              ))}
            </div>
          ) : (
            <p className="card p-10 text-center text-muted">{q ? dict.common.noResults : t.none}</p>
          )}
          {pages > 1 && (
            <nav aria-label={dict.common.page} className="mt-10 flex justify-center gap-2">
              {page > 1 && <Link href={href({ page: page - 1 })} className="btn-outline !min-h-10 !px-4">{dict.common.previous}</Link>}
              {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map((n) => (
                <Link key={n} href={href({ page: n })} aria-current={n === page ? "page" : undefined} className={cn("inline-flex h-10 min-w-10 items-center justify-center rounded-full text-sm font-semibold", n === page ? "bg-primary text-white" : "border border-line bg-white")}>
                  {n}
                </Link>
              ))}
              {page < pages && <Link href={href({ page: page + 1 })} className="btn-outline !min-h-10 !px-4">{dict.common.next}</Link>}
            </nav>
          )}
        </div>
      </section>
      {story && s(story, "title", locale) && (
        <section className="pb-12 sm:pb-16">
          <div className="container-x">
            <div className="card flex flex-col items-start gap-4 bg-primary-soft/60 p-6 sm:flex-row sm:items-center">
              <MessageSquareQuote className="h-10 w-10 shrink-0 text-primary" aria-hidden />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-ink">{s(story, "title", locale)}</h2>
                <p className="text-sm text-muted">{s(story, "subtitle", locale)}</p>
              </div>
              {s(story, "ctaLabel", locale) && (
                <Link href={localizedHref(raw(story, "ctaUrl") || "/contact", locale)} className="btn-outline">
                  {s(story, "ctaLabel", locale)} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

    </>
  );
}
