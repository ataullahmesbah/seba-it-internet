"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, ExternalLink, LogOut, Menu, UserCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { connectRealtime } from "@/lib/client/realtime";
import { AdminIcon } from "./admin-icon";

export interface ShellNavGroup {
  group: string;
  items: Array<{ href: string; label: string; icon: string; badge?: string }>;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  href: string;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function AdminShell({
  nav,
  user,
  brand,
  initialCounts,
  logout,
  children,
}: {
  nav: ShellNavGroup[];
  user: { displayName: string; email: string; roles: string[] };
  brand: string;
  initialCounts: Record<string, number>;
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const drawer = drawerAt === pathname;
  const setDrawer = (v: boolean) => setDrawerAt(v ? pathname : null);
  const [counts, setCounts] = useState(initialCounts);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/v1/admin/notifications?take=8", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (res?.success) {
      setItems(res.data.items);
      setCounts(res.data.counts);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch from the notifications API (external system)
    void refresh();
    const id = setInterval(refresh, 30000);
    let close: (() => void) | undefined;
    connectRealtime("admin")
      .then((rt) => {
        if (!rt) return;
        close = () => rt.handle.close();
        const meta = rt.meta as { notifications: string; queue: string | null };
        rt.handle.subscribe(meta.notifications, () => void refresh());
        if (meta.queue) rt.handle.subscribe(meta.queue, () => void refresh());
      })
      .catch(() => {});
    return () => {
      clearInterval(id);
      close?.();
    };
  }, [refresh]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBellOpen(false);
        setMenuOpen(false);
        setDrawerAt(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function markAll() {
    await fetch("/api/v1/admin/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    await refresh();
    router.refresh();
  }

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  const sidebar = (
    <nav aria-label="Dashboard" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold">{brand.slice(0, 1)}</span>
        <span className="truncate font-semibold">{brand}</span>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {nav.map((g) => (
          <div key={g.group || "main"}>
            {g.group && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-white/40 uppercase">{g.group}</p>}
            <ul className="space-y-0.5">
              {g.items.map((i) => {
                const count = i.badge ? counts[i.badge] ?? 0 : 0;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={active(i.href) ? "page" : undefined}
                      className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-white/75 hover:bg-white/10 hover:text-white", active(i.href) && "bg-primary text-white hover:bg-primary")}
                    >
                      <AdminIcon name={i.icon} />
                      <span className="flex-1 truncate">{i.label}</span>
                      {count > 0 && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-navy">{count > 99 ? "99+" : count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-3">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-white/75 hover:bg-white/10">
          <ExternalLink className="h-4 w-4" /> View website
        </a>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy text-white lg:block">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close navigation" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy text-white shadow-2xl">
            <button type="button" onClick={() => setDrawer(false)} className="absolute top-4 right-3 rounded-lg p-1.5 hover:bg-white/10" aria-label="Close navigation">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div ref={bellRef} className="relative">
            <button
              type="button"
              onClick={() => setBellOpen((v) => !v)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100"
              aria-label={`Notifications${counts.notifications ? ` (${counts.notifications} unread)` : ""}`}
              aria-expanded={bellOpen}
            >
              <Bell className="h-5 w-5" />
              {counts.notifications > 0 && (
                <span className="absolute top-1 right-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 font-bold text-white">{counts.notifications > 99 ? "99+" : counts.notifications}</span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <button type="button" onClick={markAll} className="text-xs text-primary hover:underline">Mark all read</button>
                </div>
                <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                  {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No notifications</li>}
                  {items.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onClick={() => {
                          setBellOpen(false);
                          void fetch("/api/v1/admin/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) }).then(refresh);
                        }}
                        className={cn("block px-4 py-3 hover:bg-slate-50", !n.read && "bg-primary-soft/50")}
                      >
                        <p className="text-sm font-medium text-ink">{n.title}</p>
                        <p className="truncate text-xs text-muted">{n.message}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/admin/notifications" onClick={() => setBellOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-sm text-primary hover:bg-slate-50">
                  View all
                </Link>
              </div>
            )}
          </div>
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-slate-100" aria-expanded={menuOpen} aria-haspopup="menu">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{user.displayName.slice(0, 1).toUpperCase()}</span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm leading-tight font-medium">{user.displayName}</span>
                <span className="block text-[11px] leading-tight text-muted">{user.roles.join(", ").replace(/_/g, " ").toLowerCase()}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
                <p className="truncate border-b border-line px-4 py-2 text-xs text-muted">{user.email}</p>
                <Link role="menuitem" href="/admin/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50">
                  <UserCircle className="h-4 w-4" /> My profile & security
                </Link>
                <form action={logout}>
                  <button role="menuitem" type="submit" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-danger hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main id="main" className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
