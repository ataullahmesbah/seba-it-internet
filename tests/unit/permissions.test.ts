import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, DEFAULT_ROLES, isPermissionKey } from "@/lib/auth/permissions";

describe("RBAC default mapping (PRD 9)", () => {
  const has = (role: string, p: string) => (DEFAULT_ROLES[role].permissions as string[]).includes(p);

  it("super admin has everything", () => {
    expect(DEFAULT_ROLES.SUPER_ADMIN.permissions.length).toBe(ALL_PERMISSIONS.length);
  });
  it("admin cannot manage roles or security settings", () => {
    expect(has("ADMIN", "roles.manage")).toBe(false);
    expect(has("ADMIN", "settings.security.manage")).toBe(false);
    expect(has("ADMIN", "payments.manage")).toBe(true);
  });
  it("moderator cannot access private lead/contact/chat data", () => {
    for (const p of ["connections.manage", "corporate_inquiries.manage", "contacts.manage", "chat.read", "chat.reply"]) expect(has("MODERATOR", p)).toBe(false);
    expect(has("MODERATOR", "packages.manage")).toBe(false);
    expect(has("MODERATOR", "packages.read")).toBe(true);
  });
  it("support admin cannot edit prices, payments, brand, SEO or security", () => {
    for (const p of ["packages.manage", "payments.manage", "brand.update", "seo.manage", "settings.security.manage", "users.manage"]) expect(has("SUPPORT_ADMIN", p)).toBe(false);
    expect(has("SUPPORT_ADMIN", "chat.reply")).toBe(true);
    expect(has("SUPPORT_ADMIN", "coverage.read")).toBe(true);
    expect(has("SUPPORT_ADMIN", "coverage.manage")).toBe(false);
  });
  it("rejects unknown permission strings", () => {
    expect(isPermissionKey("packages.manage")).toBe(true);
    expect(isPermissionKey("everything.*")).toBe(false);
  });
});
