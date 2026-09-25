import Link from "@/components/public/link";
import { ArrowRight, Calendar, Check, CircleCheck, Clock3, Quote, Star } from "lucide-react";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { fmt, localizedHref, pick, type AppLocale, type Dictionary } from "@/lib/i18n";
import { lines, raw, rows, rs, s, type Data } from "@/features/section-utils";
import type { MediaDTO, OfferDTO, PackageDTO, PostCardDTO, ReviewDTO } from "@/server/public-data";
import { Icon } from "@/components/ui/icon";
import { GiftArt, HeroNetworkArt, NetworkDots } from "./art";
import { MediaImage } from "./media-image";

export function SectionHeading({
  title,
  subtitle,
  action,
  center,
  className,
  id,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  center?: boolean;
  className?: string;
  id?: string;
}) {
  if (!title) return null;
  return (
    <div className={cn("mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", center && "items-center text-center sm:flex-col sm:items-center", className)}>
      <div className={cn(center && "mx-auto max-w-2xl")}>
        <h2 id={id} className="h2">
          {title}
        </h2>
        {subtitle && <p className="lead">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ViewAllLink({ href, label, locale }: { href: string; label: string; locale: AppLocale }) {
  return (
    <Link href={localizedHref(href, locale)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
      {label} <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function CtaLink({ href, label, locale, variant }: { href: string; label: string; locale: AppLocale; variant: "primary" | "ghost" | "outline" }) {
  if (!href || !label) return null;
  const external = /^https?:\/\//.test(href);
  const cls = variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost-light" : "btn-outline";
  return (
    <Link href={external ? href : localizedHref(href, locale)} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {label} {variant === "primary" && <ArrowRight className="h-4 w-4" aria-hidden />}
    </Link>
  );
}

/** Hero used on every public page, driven by the page's `hero` section. */
export function PageHero({
  data,
  media,
  locale,
  size = "md",
  children,
}: {
  data: Data;
  media: Record<string, MediaDTO>;
  locale: AppLocale;
  size?: "lg" | "md";
  children?: React.ReactNode;
}) {
  if (!data) return null;
  const bg = media[raw(data, "mediaId")];
  const chips = rows(data, "chips").slice(0, 4);
  const eyebrow = s(data, "eyebrow", locale);
  const script = s(data, "script", locale);
  return (
    <section className={cn("hero-bg relative isolate overflow-hidden text-white", size === "lg" ? "pt-14 pb-16 sm:pt-20 sm:pb-24" : "pt-12 pb-14 sm:pt-16 sm:pb-20")}>
      {bg ? (
        <>
          <MediaImage media={bg} locale={locale} priority decorative className="-z-20 object-cover" sizes="100vw" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/85 to-navy/30" aria-hidden />
        </>
      ) : (
        <HeroNetworkArt className="absolute inset-x-0 bottom-0 -z-10 h-[70%] w-full opacity-70 sm:left-1/3 sm:h-full sm:w-2/3" />
      )}
      <div className="container-x relative">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className={cn("font-extrabold tracking-tight", size === "lg" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl lg:text-5xl")}>
            <span className="block">{s(data, "headline", locale)}</span>
            {s(data, "highlight", locale) && <span className="block text-accent">{s(data, "highlight", locale)}</span>}
          </h1>
          {s(data, "subheadline", locale) && <p className="mt-4 max-w-xl text-base leading-7 text-white/80 sm:text-lg">{s(data, "subheadline", locale)}</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <CtaLink href={raw(data, "primaryCtaUrl")} label={s(data, "primaryCtaLabel", locale)} locale={locale} variant="primary" />
            <CtaLink href={raw(data, "secondaryCtaUrl")} label={s(data, "secondaryCtaLabel", locale)} locale={locale} variant="ghost" />
          </div>
          {children}
        </div>
        {script && (
          <p className="script pointer-events-none absolute top-0 right-6 hidden max-w-[16rem] -rotate-6 text-right text-3xl leading-tight text-white/90 lg:block xl:text-4xl" aria-hidden>
            {script}
          </p>
        )}
        {chips.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/85">
            {chips.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <Icon name={c.icon} className="h-4 w-4 text-accent" />
                </span>
                {rs(c, "label", locale)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Package card (PRD 5.1 §3 / 5.2). */
export function PackageCard({ pkg, locale, dict, highlight }: { pkg: PackageDTO; locale: AppLocale; dict: Dictionary; highlight?: boolean }) {
  const dark = highlight ?? pkg.popular;
  const badge = pick(pkg, "offerBadge", locale);
  const features = pkg.features.slice(0, 5);
  const install = pick(pkg, "installationNote", locale);
  const vat = pick(pkg, "vatNote", locale);
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border p-5 transition-shadow sm:p-6",
        dark ? "border-primary bg-navy text-white shadow-[var(--shadow-lift)]" : "border-line bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]",
      )}
    >
      {(pkg.popular || badge) && (
        <span className={cn("absolute -top-3 left-5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase", pkg.popular ? "bg-primary text-white" : "bg-accent text-navy")}>
          {pkg.popular ? dict.common.popular : badge}
        </span>
      )}
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", dark ? "bg-white/10 text-accent" : "bg-primary-soft text-primary")}>
          <Icon name={pkg.iconKey} fallback={pkg.popular ? "crown" : "house"} className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-lg font-bold">{pick(pkg, "name", locale)}</h3>
          {pick(pkg, "tagline", locale) && <p className={cn("text-xs", dark ? "text-white/70" : "text-muted")}>{pick(pkg, "tagline", locale)}</p>}
        </div>
      </div>
      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold tracking-tight">{pkg.speedMbps}</span>
        <span className={cn("text-lg font-semibold", dark ? "text-accent" : "text-primary")}>{dict.common.mbps}</span>
      </p>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <CircleCheck className={cn("mt-0.5 h-4 w-4 shrink-0", dark ? "text-accent" : "text-success")} aria-hidden />
            <span className={dark ? "text-white/85" : "text-slate-700"}>{pick(f, "label", locale)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {pkg.oldPrice && <p className={cn("text-sm line-through", dark ? "text-white/50" : "text-slate-400")}>৳ {formatMoney(pkg.oldPrice, locale)}</p>}
        <p className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold">৳ {formatMoney(pkg.price, locale)}</span>
          <span className={cn("text-sm", dark ? "text-white/70" : "text-muted")}>{dict.common.perMonth}</span>
        </p>
        {(vat || install) && <p className={cn("mt-1 text-xs leading-5", dark ? "text-white/65" : "text-muted")}>{[vat, install].filter(Boolean).join(" · ")}</p>}
      </div>
      <Link
        href={localizedHref(`/get-connection?package=${pkg.id}`, locale)}
        className={cn("mt-5 w-full", dark ? "btn-primary" : "btn-outline")}
        aria-label={`${dict.packages.getThisPlan}: ${pick(pkg, "name", locale)} ${pkg.speedMbps} Mbps`}
      >
        {dict.packages.getThisPlan} {dark && <ArrowRight className="h-4 w-4" aria-hidden />}
      </Link>
    </article>
  );
}

export function PackageGrid({ packages, locale, dict, cols = 4 }: { packages: PackageDTO[]; locale: AppLocale; dict: Dictionary; cols?: 3 | 4 }) {
  if (!packages.length) return <p className="card p-8 text-center text-muted">{dict.packages.none}</p>;
  return (
    <div className={cn("grid gap-6 pt-3 sm:grid-cols-2", cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {packages.map((p) => (
        <PackageCard key={p.id} pkg={p} locale={locale} dict={dict} />
      ))}
    </div>
  );
}

/** Wide navy CTA banner with gift art (final CTA / offer). */
export function CtaBanner({ data, locale }: { data: Data; locale: AppLocale }) {
  if (!data || !s(data, "headline", locale)) return null;
  const points = lines(data, "points", locale);
  const script = s(data, "script", locale);
  return (
    <section className="section">
      <div className="container-x">
        <div className="hero-bg relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10">
          <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
            <GiftArt className="hidden h-32 w-36 lg:block" />
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">{s(data, "headline", locale)}</h2>
              {s(data, "message", locale) && <p className="mt-2 text-white/80">{s(data, "message", locale)}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <CtaLink href={raw(data, "primaryCtaUrl")} label={s(data, "primaryCtaLabel", locale)} locale={locale} variant="primary" />
                <CtaLink href={raw(data, "secondaryCtaUrl")} label={s(data, "secondaryCtaLabel", locale)} locale={locale} variant="ghost" />
              </div>
            </div>
            <div className="flex items-center gap-8">
              {points.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {points.map((p, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/40">
                        <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              {script && (
                <p className="script hidden max-w-[10rem] -rotate-6 text-2xl leading-tight text-white/90 xl:block" aria-hidden>
                  {script}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Current offer banner — only rendered when an active offer exists (PRD 5.1 §6). */
export function OfferBanner({ offer, data, locale }: { offer: OfferDTO | null; data: Data; locale: AppLocale }) {
  if (!offer) return null;
  const highlights = locale === "bn" ? offer.highlightsBn : offer.highlightsEn;
  const cta = pick(offer, "ctaLabel", locale);
  const script = s(data, "script", locale);
  return (
    <section className="py-6 sm:py-8" aria-label={pick(offer, "title", locale)}>
      <div className="container-x">
        <div className="hero-bg relative overflow-hidden rounded-3xl px-6 py-8 text-white sm:px-10">
          {offer.media && <MediaImage media={offer.media} locale={locale} decorative className="object-cover opacity-25" sizes="100vw" />}
          <div className="relative grid items-center gap-6 lg:grid-cols-[auto_1fr_auto]">
            <GiftArt className="hidden h-28 w-32 lg:block" />
            <div>
              {s(data, "eyebrow", locale) && <p className="text-sm font-semibold text-accent">{s(data, "eyebrow", locale)}</p>}
              <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">{pick(offer, "title", locale)}</h2>
              <p className="mt-2 text-white/80">{pick(offer, "description", locale)}</p>
              {cta && offer.ctaUrl && (
                <div className="mt-5">
                  <CtaLink href={offer.ctaUrl} label={cta} locale={locale} variant="primary" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-8">
              {highlights.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/40">
                        <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              {script && (
                <p className="script hidden max-w-[10rem] -rotate-6 text-2xl leading-tight xl:block" aria-hidden>
                  {script}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Icon feature grid (Why choose us, benefits, highlights). */
export function FeatureGrid({ items, locale, variant = "plain" }: { items: ReturnType<typeof rows>; locale: AppLocale; variant?: "plain" | "card" }) {
  if (!items.length) return null;
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", items.length >= 6 ? "lg:grid-cols-6" : items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {items.map((it, i) => (
        <div key={i} className={cn("text-center", variant === "card" && "card p-6")}>
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon name={it.icon} className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-sm font-bold text-ink">{rs(it, "title", locale)}</h3>
          {rs(it, "desc", locale) && <p className="mt-1.5 text-xs leading-5 text-muted">{rs(it, "desc", locale)}</p>}
        </div>
      ))}
    </div>
  );
}

/** Numbered steps (Get connected in 4 steps). */
export function Steps({ items, locale }: { items: ReturnType<typeof rows>; locale: AppLocale }) {
  if (!items.length) return null;
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it, i) => (
        <li key={i} className="relative text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-primary shadow-[var(--shadow-card)] ring-1 ring-line">
            <Icon name={it.icon} className="h-7 w-7" />
          </span>
          <span className="mx-auto -mt-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-4 ring-page">{i + 1}</span>
          <h3 className="mt-2 text-sm font-bold">{rs(it, "title", locale)}</h3>
          {rs(it, "desc", locale) && <p className="mt-1 text-xs leading-5 text-muted">{rs(it, "desc", locale)}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Stats strip — only client-approved numbers entered in the dashboard. */
export function StatsBand({ data, locale, withArt = true }: { data: Data; locale: AppLocale; withArt?: boolean }) {
  const items = rows(data, "items");
  if (!data || !items.length) return null;
  const script = s(data, "script", locale);
  return (
    <section className="section">
      <div className="container-x">
        <div className="card relative overflow-hidden p-6 sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              {s(data, "title", locale) && <h2 className="h2">{s(data, "title", locale)}</h2>}
              {s(data, "subtitle", locale) && <p className="lead">{s(data, "subtitle", locale)}</p>}
              <dl className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon name={it.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <dt className="sr-only">{rs(it, "label", locale)}</dt>
                      <dd className="text-2xl font-extrabold text-ink">{it.value}</dd>
                      <dd className="text-xs text-muted" aria-hidden>
                        {rs(it, "label", locale)}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
            {withArt && (
              <div className="relative hidden lg:block">
                <NetworkDots className="h-40 w-64" />
                {script && <p className="script absolute -right-2 bottom-0 max-w-[9rem] text-right text-xl leading-tight text-navy">{script}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("h-4 w-4", n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} aria-hidden />
      ))}
    </span>
  );
}

export function ReviewCard({ review, locale }: { review: ReviewDTO; locale: AppLocale }) {
  return (
    <figure className="card flex h-full flex-col p-6">
      <Quote className="h-7 w-7 text-accent" aria-hidden />
      <blockquote className="mt-3 flex-1 text-sm leading-6 text-slate-700">“{pick(review, "quote", locale)}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">
          {review.avatar ? <MediaImage media={review.avatar} locale={locale} decorative className="object-cover" sizes="44px" /> : review.displayName.slice(0, 1)}
        </span>
        <span>
          <span className="block text-sm font-semibold text-ink">{review.displayName}</span>
          {review.areaOrCompany && <span className="block text-xs text-muted">{review.areaOrCompany}</span>}
        </span>
        <span className="ml-auto">
          <Stars rating={review.rating} />
        </span>
      </figcaption>
    </figure>
  );
}

export function BlogCard({ post, locale, dict }: { post: PostCardDTO; locale: AppLocale; dict: Dictionary }) {
  const href = localizedHref(`/blog/${post.slug}`, locale);
  return (
    <article className="card group flex h-full flex-col overflow-hidden">
      <Link href={href} className="relative block aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary-soft to-accent-soft" tabIndex={-1} aria-hidden>
        {post.image ? (
          <MediaImage media={post.image} locale={locale} decorative className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(min-width:1024px) 33vw, 100vw" />
        ) : (
          <NetworkDots className="absolute inset-0 m-auto h-3/4 w-3/4 opacity-80" />
        )}
        {post.category && (
          <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">{pick(post.category, "name", locale)}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base leading-snug font-bold text-ink">
          <Link href={href} className="hover:text-primary">
            {pick(post, "title", locale)}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted">{pick(post, "excerpt", locale)}</p>
        <p className="mt-4 flex items-center gap-3 text-xs text-muted">
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden /> {formatDate(post.publishedAt, locale)}
            </span>
          )}
          {post.readMinutes && (
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden /> {post.readMinutes} {dict.common.minRead}
            </span>
          )}
        </p>
        <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {dict.common.readMore} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export { fmt };
