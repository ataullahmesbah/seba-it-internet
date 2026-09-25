import { Mail, MessageCircle, Phone } from "lucide-react";
import { s } from "@/features/section-utils";
import { telHref } from "@/lib/utils";
import { resolveLocale } from "@/server/page-context";
import { buildMetadata } from "@/server/seo";
import { getOffices, getPageSections, getSite } from "@/server/public-data";
import { PageHero, SectionHeading } from "@/components/public/blocks";
import { ContactForm } from "@/components/public/lead-forms";
import { OfficeCard } from "@/components/public/office-card";
import { SocialIcon } from "@/components/public/social-icons";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">) {
  const { locale, dict } = await resolveLocale(params);
  return buildMetadata({ routeKey: "contact", path: "/contact", locale, title: dict.common.contactUs });
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale, dict } = await resolveLocale(params);
  const [{ sections, media }, offices, site] = await Promise.all([getPageSections("contact"), getOffices(), getSite()]);
  const quick = [
    site.hotline && { icon: <Phone className="h-5 w-5" aria-hidden />, label: dict.support.call, value: site.hotline, href: telHref(site.hotline) },
    site.whatsappUrl && { icon: <SocialIcon platform="whatsapp" className="h-5 w-5" />, label: dict.support.whatsapp, value: dict.support.whatsappDesc, href: site.whatsappUrl },
    site.messengerUrl && { icon: <MessageCircle className="h-5 w-5" aria-hidden />, label: dict.support.messenger, value: dict.support.messengerDesc, href: site.messengerUrl },
    site.supportEmail && { icon: <Mail className="h-5 w-5" aria-hidden />, label: dict.support.email, value: site.supportEmail, href: `mailto:${site.supportEmail}` },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string; value: string; href: string }>;

  return (
    <>
      <PageHero data={sections.hero} media={media} locale={locale} />
      <section className="relative z-10 -mt-8 pb-12 sm:-mt-12 sm:pb-16">
        <div className="container-x">
          {quick.length > 0 && (
            <ul className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quick.map((q) => (
                <li key={q.label}>
                  <a href={q.href} {...(q.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="card flex items-center gap-3 p-4 hover:shadow-[var(--shadow-lift)]">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">{q.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{q.label}</span>
                      <span className="block truncate text-xs text-muted">{q.value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-ink">{s(sections.form, "title", locale) || dict.forms.contactFormTitle}</h2>
            {s(sections.form, "subtitle", locale) && <p className="mt-1 text-sm text-muted">{s(sections.form, "subtitle", locale)}</p>}
            <div className="mt-6">
              <ContactForm locale={locale} dict={dict} />
            </div>
          </div>
        </div>
      </section>
      {offices.length > 0 && (
        <section id="offices" className="scroll-mt-24 pb-16" aria-labelledby="ct-offices">
          <div className="container-x">
            <SectionHeading id="ct-offices" title={s(sections.offices, "title", locale) || dict.contact.offices} subtitle={s(sections.offices, "subtitle", locale)} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {offices.map((o) => (
                <OfficeCard key={o.id} office={o} locale={locale} dict={dict} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
