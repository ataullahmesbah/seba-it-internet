import Link from "@/components/public/link";
import { headers } from "next/headers";
import { getDictionary, localizedHref } from "@/lib/i18n";

/** Branded 404 with Home, Packages, Coverage and Contact actions (PRD 5.11). */
export default async function NotFound() {
  const path = (await headers()).get("x-pathname") ?? "/";
  const locale = path === "/bn" || path.startsWith("/bn/") ? "bn" : "en";
  const dict = getDictionary(locale);
  const links: Array<[string, string]> = [
    ["/", dict.common.home],
    ["/packages", dict.common.viewPackages],
    ["/coverage", dict.common.checkCoverage],
    ["/contact", dict.common.contactUs],
  ];
  return (
    <section className="section">
      <div className="container-x flex flex-col items-center py-10 text-center">
        <p className="text-7xl font-extrabold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">{dict.notFound.title}</h1>
        <p className="mt-2 max-w-md text-muted">{dict.notFound.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {links.map(([href, label], i) => (
            <Link key={href} href={localizedHref(href, locale)} className={i === 0 ? "btn-primary" : "btn-outline"}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
