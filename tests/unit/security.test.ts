import { describe, expect, it } from "vitest";
import { decrypt, encrypt, hashToken, randomToken, referenceCode } from "@/lib/security/crypto";
import { sanitizeRichText, sanitizeBasic } from "@/lib/sanitize";
import { isAllowedUrl, parseDhakaDateTime, parseFields } from "@/lib/validation/form-schema";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/auth/totp";
import { passwordPolicyError } from "@/lib/auth/password";

describe("crypto helpers", () => {
  it("encrypts and decrypts (AES-GCM) and detects tampering", () => {
    const c = encrypt("JBSWY3DPEHPK3PXP");
    expect(c).not.toContain("JBSWY3");
    expect(decrypt(c)).toBe("JBSWY3DPEHPK3PXP");
    const [iv, tag, data] = c.split(".");
    expect(() => decrypt([iv, tag, data.slice(0, -2) + "AA"].join("."))).toThrow();
  });
  it("produces >=256-bit tokens and stable keyed hashes", () => {
    expect(Buffer.from(randomToken(), "base64url").length).toBe(32);
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
  it("creates readable reference codes", () => {
    expect(referenceCode("CON")).toMatch(/^CON-[A-Z2-9]{7}$/);
  });
  it("recovery codes hash case-insensitively", () => {
    const { plain, hashed } = generateRecoveryCodes(2);
    expect(hashRecoveryCode(plain[0].toLowerCase())).toBe(hashed[0]);
  });
});

describe("rich text sanitization (XSS)", () => {
  it("removes scripts, event handlers, iframes and javascript: URLs", () => {
    const dirty = `<p onclick="alert(1)">Hi<script>alert(1)</script></p><iframe src="https://x"></iframe><a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">`;
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|iframe|javascript:/i);
    expect(clean).toContain("<p>Hi</p>");
  });
  it("marks external links noopener", () => {
    expect(sanitizeRichText(`<a href="https://example.com">x</a>`)).toContain('rel="noopener noreferrer nofollow"');
  });
  it("basic sanitizer keeps only simple formatting", () => {
    expect(sanitizeBasic("<h2>T</h2><strong>b</strong><style>x</style>")).toBe("T<strong>b</strong>");
  });
});

describe("admin form validation", () => {
  it("URL policy allows https and internal paths only where allowed", () => {
    expect(isAllowedUrl("https://ok.com", false)).toBe(true);
    expect(isAllowedUrl("/packages", true)).toBe(true);
    expect(isAllowedUrl("/packages", false)).toBe(false);
    expect(isAllowedUrl("//evil.com", true)).toBe(false);
    expect(isAllowedUrl("javascript:alert(1)", true)).toBe(false);
  });
  it("parses datetime-local as Asia/Dhaka", () => {
    expect(parseDhakaDateTime("2026-01-01T06:00")?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
  it("validates bilingual required fields and ignores unknown keys", () => {
    const fd = new FormData();
    fd.set("titleEn", "Hello");
    fd.set("titleBn", "");
    fd.set("isAdmin", "true");
    fd.set("color", "red");
    const { data, errors } = parseFields(
      [
        { name: "title", label: "Title", type: "text", bilingual: true, required: true },
        { name: "color", label: "Color", type: "color" },
      ],
      fd,
    );
    expect(errors.titleBn).toBeTruthy();
    expect(errors.color).toBeTruthy();
    expect(data).not.toHaveProperty("isAdmin");
  });
  it("parses lines, numbers and checkboxes", () => {
    const fd = new FormData();
    fd.set("items", "a\n\n b \n");
    fd.set("n", "42");
    fd.set("on", "on");
    const { data, errors } = parseFields(
      [
        { name: "items", label: "Items", type: "lines" },
        { name: "n", label: "N", type: "number", min: 0, max: 100 },
        { name: "on", label: "On", type: "checkbox" },
        { name: "off", label: "Off", type: "checkbox" },
      ],
      fd,
    );
    expect(errors).toEqual({});
    expect(data).toMatchObject({ items: ["a", "b"], n: 42, on: true, off: false });
  });
});

describe("password policy", () => {
  it("enforces 12-128 characters and rejects common values", () => {
    expect(passwordPolicyError("short")).toBeTruthy();
    expect(passwordPolicyError("password1234")).toBeTruthy();
    expect(passwordPolicyError("x".repeat(129))).toBeTruthy();
    expect(passwordPolicyError("Correct-Horse-Battery-9")).toBeNull();
  });
});
