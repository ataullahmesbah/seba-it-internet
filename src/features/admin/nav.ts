import type { PermissionKey } from "@/lib/auth/permissions";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  perm: PermissionKey | PermissionKey[];
  badge?: "connections" | "corporate" | "contacts" | "chat" | "interest";
}

export const ADMIN_NAV: Array<{ group: string; items: AdminNavItem[] }> = [
  { group: "", items: [{ href: "/admin", label: "Overview", icon: "layout-dashboard", perm: "dashboard.read" }] },
  {
    group: "Leads & Support",
    items: [
      { href: "/admin/connections", label: "Connection Requests", icon: "inbox", perm: "connections.manage", badge: "connections" },
      { href: "/admin/corporate-inquiries", label: "Corporate Inquiries", icon: "building", perm: "corporate_inquiries.manage", badge: "corporate" },
      { href: "/admin/contact-messages", label: "Contact Messages", icon: "mail", perm: "contacts.manage", badge: "contacts" },
      { href: "/admin/coverage-interest", label: "Coverage Interest", icon: "map-pin", perm: "connections.manage", badge: "interest" },
      { href: "/admin/chat", label: "Live Chat", icon: "messages", perm: "chat.read", badge: "chat" },
      { href: "/admin/notifications", label: "Notifications", icon: "bell", perm: "notifications.read" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/home", label: "Home CMS", icon: "home", perm: "home.update" },
      { href: "/admin/pages", label: "Pages", icon: "file-text", perm: "home.update" },
      { href: "/admin/packages", label: "Packages", icon: "package", perm: ["packages.manage", "packages.read"] },
      { href: "/admin/tariffs", label: "BTRC Tariff (PDF)", icon: "file-text", perm: ["packages.manage", "packages.read"] },
      { href: "/admin/corporate", label: "Corporate Services", icon: "briefcase", perm: "corporate.manage" },
      { href: "/admin/coverage", label: "Coverage", icon: "map", perm: ["coverage.manage", "coverage.read"] },
      { href: "/admin/offers", label: "Offers", icon: "tag", perm: "offers.manage" },
      { href: "/admin/payments", label: "Payment Methods", icon: "credit-card", perm: ["payments.manage", "payments.read"] },
      { href: "/admin/faqs", label: "FAQ", icon: "help", perm: ["faq.manage", "faq.read"] },
      { href: "/admin/reviews", label: "Reviews", icon: "star", perm: "reviews.manage" },
      { href: "/admin/blog", label: "Blog", icon: "newspaper", perm: "blog.manage" },
      { href: "/admin/offices", label: "Offices", icon: "landmark", perm: "offices.manage" },
      { href: "/admin/media", label: "Media Library", icon: "image", perm: ["media.manage", "media.read"] },
    ],
  },
  {
    group: "Site",
    items: [
      { href: "/admin/brand", label: "Brand Settings", icon: "palette", perm: "brand.update" },
      { href: "/admin/navigation", label: "Navigation & Footer", icon: "menu", perm: "navigation.manage" },
      { href: "/admin/seo", label: "SEO", icon: "search", perm: "seo.manage" },
      { href: "/admin/settings", label: "Settings", icon: "settings", perm: ["settings.manage", "settings.security.manage"] },
    ],
  },
  {
    group: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: "users", perm: "users.manage" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: "key", perm: "roles.manage" },
      { href: "/admin/audit", label: "Audit Logs", icon: "scroll", perm: "audit.read" },
    ],
  },
];
