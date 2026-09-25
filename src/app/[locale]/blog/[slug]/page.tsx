import Link from "@/components/public/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, Calendar, Clock3, UserRound } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { localizedHref, pick } from "@/lib/i18n";
import { env } from "@/lib/env";
import { sanitizeRichText } from "@/lib/sanitize";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getPostBySlug, getRelatedPosts, getSite } from "@/server/public-data";
import { BlogCard } from "@/components/public/blocks";
import { MediaImage } from "@/components/public/media-image";
import { SocialIcon } from "@/components/public/social-icons";
import { JsonLd } from "@/components/public/json-ld";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale } = await resolveLocale(params);
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "404", robots: { index: false } };
  const meta = await buildMetadata({
    routeKey: `blog:${slug}`,
    path: `/blog/${slug}`,
    locale,
    title: pick(post, "seoTitle", locale) || pick(post, "title", locale),
    description: pick(post, "seoDescription", locale) || pick(post, "excerpt", locale),
    image: post.og?.url ?? post.image?.url,
    type: "article",
  });
  return meta;
}

export default async function BlogPostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, dict } = await resolveLocale(params);
  const { slug } = await params;
  // Draft/archived posts return a real 404 (never 200).
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const [related, site] = await Promise.all([getRelatedPosts(post.id, post.categoryId), getSite()]);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const url = env.appUrl + localizedHref(`/blog/${slug}`, locale);
  const content = sanitizeRichText(locale === "bn" ? post.contentBn : post.contentEn);
  const title = pick(post, "title", locale);
  const share = [
    ["facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
    ["linkedin", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
    ["x", `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`],
    ["whatsapp", `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`],
  ] as const;

  return (
    <article>
      <JsonLd
        nonce={nonce}
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description: pick(post, "excerpt", locale),
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          inLanguage: locale === "bn" ? "bn-BD" : "en-BD",
          image: post.image?.url,
          author: { "@type": "Organization", name: post.authorDisplayName || site.companyName },
          publisher: { "@type": "Organization", name: site.companyName, logo: site.logoLight?.url },
          mainEntityOfPage: url,
        }}
      />
      <JsonLd
        nonce={nonce}
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.common.home, item: env.appUrl + localizedHref("/", locale) },
            { "@type": "ListItem", position: 2, name: "Blog", item: env.appUrl + localizedHref("/blog", locale) },
            { "@type": "ListItem", position: 3, name: title, item: url },
          ],
        }}
      />
      <header className="hero-bg py-12 text-white sm:py-16">
        <div className="container-x max-w-4xl">
          <Link href={localizedHref("/blog", locale)} className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {dict.blog.backToBlog}
          </Link>
          {post.category && (
            <p className="mt-5">
              <Link href={localizedHref(`/blog?category=${post.category.slug}`, locale)} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold">
                {pick(post.category, "name", locale)}
              </Link>
            </p>
          )}
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/75">
            {post.authorDisplayName && (
              <span className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4" aria-hidden /> {dict.blog.by} {post.authorDisplayName}
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden /> <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
              </span>
            )}
            {post.readMinutes && (
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden /> {post.readMinutes} {dict.common.minRead}
              </span>
            )}
          </p>
        </div>
      </header>
      <div className="container-x max-w-4xl py-10">
        {post.image && (
          <div className="relative mb-8 aspect-[16/8] overflow-hidden rounded-2xl">
            <MediaImage media={post.image} locale={locale} priority className="object-cover" sizes="(min-width:1024px) 896px, 100vw" />
          </div>
        )}
        <div className="card p-6 sm:p-10">
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: content }} />
          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <span className="text-sm font-semibold text-ink">{dict.blog.share}:</span>
            {share.map(([p, u]) => (
              <a key={p} href={u} target="_blank" rel="noopener noreferrer" aria-label={`${dict.blog.share} — ${p}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary hover:bg-primary hover:text-white">
                <SocialIcon platform={p} />
              </a>
            ))}
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="pb-16" aria-labelledby="related">
          <div className="container-x">
            <h2 id="related" className="h2 mb-6">
              {dict.blog.related}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.id} post={p} locale={locale} dict={dict} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
