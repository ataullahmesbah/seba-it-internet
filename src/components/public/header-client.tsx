"use client";

import Link from "@/components/public/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X, Phone, Mail, MessageCircle, ArrowRight, FileText, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { localizedHref, stripLocale, type AppLocale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "./language-switcher";

export interface NavLink {
  label: string;
  href: string;
  external: boolean;
  newTab: boolean;
}

export function HeaderClient({
  logo,
  links,
  locale,
  cta,
  labels,
  contacts,
  utilityBar,
  tariff,
  dashboardLabel,
}: {
  logo: React.ReactNode;
  links: NavLink[];
  locale: AppLocale;
  cta: { label: string; href: string };
  labels: { openMenu: string; closeMenu: string; supportChannels: string; chat: string };
  contacts: { hotline: string | null; email: string | null; whatsapp: string | null };
  utilityBar: boolean;
  tariff: { label: string; href: string } | null;
  /** Set only when a staff member is signed in. */
  dashboardLabel: string | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // The drawer is bound to the path it was opened on, so navigating closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const current = stripLocale(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Focus trap + Escape while drawer is open.
  useEffect(() => {
    if (!open) return;
    const el = drawerRef.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>("a,button,select,input") ?? []);
    focusables()[0]?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenAt(null);
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => {
    const h = stripLocale(href);
    return h === "/" ? current === "/" : current === h || current.startsWith(h + "/");
  };

  const openChat = () => {
    setOpen(false);
    window.dispatchEvent(new Event("open-chat"));
  };

  return (
    <div className={cn("border-b bg-white/95 backdrop-blur transition-shadow", scrolled ? "border-line shadow-sm" : "border-transparent")}>
      <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <Link href={localizedHref("/", locale)} className="shrink-0" aria-label="Home">
          {logo}
        </Link>
        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {links.map((l) => (
              <li key={l.href + l.label}>
                <Link
                  href={l.external ? l.href : localizedHref(l.href, locale)}
                  target={l.newTab ? "_blank" : undefined}
                  rel={l.external ? "noopener noreferrer" : undefined}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:text-primary xl:px-3 xl:text-sm",
                    isActive(l.href) && "text-primary after:absolute after:inset-x-3 after:-bottom-[15px] after:h-0.5 after:rounded after:bg-primary",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          {dashboardLabel && (
            <Link href="/admin" className="btn-secondary hidden !min-h-10 sm:inline-flex">
              <LayoutDashboard className="h-4 w-4" aria-hidden /> {dashboardLabel}
            </Link>
          )}
          <Link href={localizedHref(cta.href, locale)} className="btn-primary hidden !min-h-10 sm:inline-flex">
            {cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <div className={utilityBar ? "md:hidden" : undefined}>
            <LanguageSwitcher locale={locale} compact />
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-navy hover:bg-slate-100 xl:hidden"
            aria-label={labels.openMenu}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Portal: the header's backdrop-filter would otherwise trap this fixed overlay inside the header box. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-navy/60" aria-label={labels.closeMenu} tabIndex={-1} onClick={() => setOpen(false)} />
          <div ref={drawerRef} id="mobile-drawer" className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              {logo}
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100" aria-label={labels.closeMenu} onClick={() => setOpen(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 px-3 py-3">
              <ul className="space-y-0.5">
                {links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.external ? l.href : localizedHref(l.href, locale)}
                      target={l.newTab ? "_blank" : undefined}
                      className={cn("flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium text-slate-800 hover:bg-primary-soft", isActive(l.href) && "bg-primary-soft text-primary")}
                      aria-current={isActive(l.href) ? "page" : undefined}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {tariff && (
                <Link href={localizedHref(tariff.href, locale)} className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-[15px] font-semibold text-primary">
                  <FileText className="h-4 w-4" aria-hidden /> {tariff.label}
                </Link>
              )}
              {dashboardLabel && (
                <Link href="/admin" className="btn-secondary mt-4 w-full">
                  <LayoutDashboard className="h-4 w-4" aria-hidden /> {dashboardLabel}
                </Link>
              )}
              <Link href={localizedHref(cta.href, locale)} className="btn-primary mt-4 w-full">
                {cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </nav>
            <div className="border-t border-line p-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{labels.supportChannels}</p>
              <div className="grid gap-2">
                <button type="button" onClick={openChat} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-medium">
                  <MessageCircle className="h-4 w-4 text-primary" /> {labels.chat}
                </button>
                {contacts.hotline && (
                  <a href={`tel:${contacts.hotline.replace(/[^\d+]/g, "")}`} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-medium">
                    <Phone className="h-4 w-4 text-primary" /> {contacts.hotline}
                  </a>
                )}
                {contacts.email && (
                  <a href={`mailto:${contacts.email}`} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-medium">
                    <Mail className="h-4 w-4 text-primary" /> {contacts.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}