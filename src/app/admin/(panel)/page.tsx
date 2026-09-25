import Link from "next/link";
import { Building2, Inbox, Mail, MapPin, MessagesSquare, Bell, Plus } from "lucide-react";
import { requireAdminPage, can } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { getOperationalCounts } from "@/server/admin/counts";
import { Badge, Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  const ctx = await requireAdminPage("dashboard.read");
  const counts = await getOperationalCounts(ctx);
  const [connections, contacts, chats, inquiries] = await Promise.all([
    can(ctx, "connections.manage") ? db.connectionRequest.findMany({ orderBy: { createdAt: "desc" }, take: 5 }) : [],
    can(ctx, "contacts.manage") ? db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }) : [],
    can(ctx, "chat.read") ? db.chatConversation.findMany({ orderBy: { lastMessageAt: "desc" }, take: 5, include: { visitor: true } }) : [],
    can(ctx, "corporate_inquiries.manage") ? db.corporateInquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5 }) : [],
  ]);
  type Activity = { at: Date; label: string; sub: string; href: string; status: string };
  const activity: Activity[] = [
    ...connections.map((c) => ({ at: c.createdAt, label: `Connection · ${c.name}`, sub: `${c.referenceCode} · ${c.areaName}, ${c.thanaName}`, href: `/admin/connections/${c.id}`, status: c.status })),
    ...contacts.map((c) => ({ at: c.createdAt, label: `Contact · ${c.name}`, sub: c.subject, href: `/admin/contact-messages/${c.id}`, status: c.status })),
    ...inquiries.map((c) => ({ at: c.createdAt, label: `Corporate · ${c.companyName}`, sub: c.referenceCode, href: `/admin/corporate-inquiries/${c.id}`, status: c.status })),
    ...chats.map((c) => ({ at: c.lastMessageAt, label: `Chat · ${c.visitor.name ?? "Visitor"}`, sub: `${c.supportUnreadCount} unread`, href: `/admin/chat?c=${c.id}`, status: c.status })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  const cards = [
    { label: "New connection requests", value: counts.connections, href: "/admin/connections?status=NEW", icon: Inbox, perm: can(ctx, "connections.manage") },
    { label: "New corporate inquiries", value: counts.corporate, href: "/admin/corporate-inquiries?status=NEW", icon: Building2, perm: can(ctx, "corporate_inquiries.manage") },
    { label: "Unread contacts", value: counts.contacts, href: "/admin/contact-messages?status=UNREAD", icon: Mail, perm: can(ctx, "contacts.manage") },
    { label: "Waiting chats", value: counts.chat, href: "/admin/chat", icon: MessagesSquare, perm: can(ctx, "chat.read") },
    { label: "Coverage interest", value: counts.interest, href: "/admin/coverage-interest?status=NEW", icon: MapPin, perm: can(ctx, "connections.manage") },
    { label: "Unread notifications", value: counts.notifications, href: "/admin/notifications", icon: Bell, perm: true },
  ].filter((c) => c.perm);

  const quick = [
    can(ctx, "packages.manage") && { href: "/admin/packages/new", label: "Add package" },
    can(ctx, "coverage.manage") && { href: "/admin/coverage-areas/new", label: "Add coverage area" },
    can(ctx, "blog.manage") && { href: "/admin/blog/new", label: "New blog post" },
    can(ctx, "offers.manage") && { href: "/admin/offers/new", label: "New offer" },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <div>
      <PageHeader title={`Welcome, ${ctx.displayName}`} description="Operational overview — unresolved items that need attention." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <c.icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-3xl font-extrabold text-ink">{c.value}</span>
              <span className="text-sm text-muted">{c.label}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card title="Recent activity">
          {activity.length === 0 ? (
            <p className="text-sm text-muted">No recent leads, contacts or chats.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-center gap-3 py-3 hover:text-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.label}</span>
                      <span className="block truncate text-xs text-muted">{a.sub}</span>
                    </span>
                    <Badge>{a.status}</Badge>
                    <span className="hidden text-xs whitespace-nowrap text-muted sm:block">{formatDateTime(a.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {quick.length > 0 && (
          <Card title="Quick links">
            <div className="grid gap-2">
              {quick.map((q) => (
                <Link key={q.href} href={q.href} className="btn-outline justify-start !min-h-10">
                  <Plus className="h-4 w-4" /> {q.label}
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
