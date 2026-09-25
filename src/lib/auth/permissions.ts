/**
 * System-defined permission constants (PRD Section 9).
 * Roles are collections of these keys; the dashboard can never create arbitrary permission strings.
 */
export const PERMISSIONS = {
  "dashboard.read": "View dashboard overview",
  "brand.update": "Edit brand settings, contacts and social links",
  "home.update": "Edit home page and page content sections",
  "packages.read": "View packages",
  "packages.manage": "Create, edit, archive and reorder packages",
  "corporate.manage": "Manage corporate services",
  "coverage.read": "View coverage hierarchy",
  "coverage.manage": "Manage districts, thanas and areas",
  "offers.manage": "Manage offers",
  "connections.manage": "View and process connection requests and coverage interest",
  "corporate_inquiries.manage": "View and process corporate inquiries",
  "contacts.manage": "View and process contact messages",
  "chat.read": "View live chat conversations",
  "chat.reply": "Reply to, assign and resolve chats",
  "notifications.read": "Read own notifications",
  "payments.read": "View payment methods",
  "payments.manage": "Manage payment methods and bank accounts",
  "faq.read": "View FAQs",
  "faq.manage": "Manage FAQs and FAQ categories",
  "reviews.manage": "Manage reviews",
  "blog.manage": "Manage blog posts and categories",
  "offices.manage": "Manage offices",
  "media.read": "Browse media library and upload",
  "media.manage": "Upload, edit and delete media",
  "navigation.manage": "Manage navigation and footer",
  "seo.manage": "Manage SEO entries",
  "users.manage": "Manage staff users",
  "roles.manage": "Manage roles and permission mappings",
  "audit.read": "Read audit logs",
  "settings.manage": "Manage general site settings",
  "settings.security.manage": "Manage security settings (2FA policy etc.)",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

export function isPermissionKey(k: string): k is PermissionKey {
  return k in PERMISSIONS;
}

/** Least-privilege default role mapping (seeded). */
export const DEFAULT_ROLES: Record<string, { label: string; description: string; permissions: PermissionKey[] }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Full access including roles and security settings",
    permissions: ALL_PERMISSIONS,
  },
  ADMIN: {
    label: "Admin",
    description: "Manages content, leads and staff (cannot manage roles/security)",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "roles.manage" && p !== "settings.security.manage"),
  },
  MODERATOR: {
    label: "Moderator",
    description: "Manages public content; no access to private lead/chat data",
    permissions: [
      "dashboard.read", "home.update", "packages.read", "corporate.manage", "offers.manage",
      "notifications.read", "faq.read", "faq.manage", "reviews.manage", "blog.manage",
      "media.read", "media.manage", "navigation.manage", "seo.manage",
    ],
  },
  SUPPORT_ADMIN: {
    label: "Support Admin",
    description: "Handles leads, contacts and live chat",
    permissions: [
      "dashboard.read", "coverage.read", "connections.manage", "corporate_inquiries.manage",
      "contacts.manage", "chat.read", "chat.reply", "notifications.read", "faq.read", "media.read",
    ],
  },
};
