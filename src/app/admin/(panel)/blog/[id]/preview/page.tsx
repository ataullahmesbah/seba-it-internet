import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitize";
import { formatDate } from "@/lib/utils";
import { Badge, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Preview", robots: { index: false } };

/** Authorized preview of unpublished posts (never publicly reachable). */
export default async function BlogPreviewPage({ params, searchParams }: PageProps<"/admin/blog/[id]/preview">) {
  await requireAdminPage("blog.manage");
  const { id } = await params;
  const sp = await searchParams;
  const locale = sp.lang === "bn" ? "bn" : "en";
  const post = await db.blogPost.findUnique({ where: { id }, include: { featuredMedia: true, category: true } });
  if (!post) notFound();
  const title = locale === "bn" ? post.titleBn : post.titleEn;
  return (
    <div>
      <PageHeader
        title="Post preview"
        back={{ href: `/admin/blog/${id}`, label: "Back to editor" }}
        actions={
          <>
            <a href={`?lang=en`} className={locale === "en" ? "btn-primary !min-h-9" : "btn-outline !min-h-9"}>English</a>
            <a href={`?lang=bn`} className={locale === "bn" ? "btn-primary !min-h-9" : "btn-outline !min-h-9"}>বাংলা</a>
          </>
        }
      />
      <article lang={locale} className="card mx-auto max-w-3xl p-6 sm:p-10">
        <p className="flex gap-2"><Badge>{post.status}</Badge>{post.category && <Badge tone="blue">{post.category.nameEn}</Badge>}</p>
        <h1 className="mt-4 text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-muted">{post.authorDisplayName} · {formatDate(post.publishedAt ?? post.updatedAt, locale)}</p>
        {post.featuredMedia && (
          // eslint-disable-next-line @next/next/no-img-element -- preview only; next/image not needed here
          <img src={post.featuredMedia.secureUrl} alt="" className="mt-6 w-full rounded-xl" />
        )}
        <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: sanitizeRichText(locale === "bn" ? post.contentBn : post.contentEn) }} />
      </article>
    </div>
  );
}
