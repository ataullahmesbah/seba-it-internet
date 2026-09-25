import { describe, expect, it } from "vitest";
import { localizedHref, pick, pickList, stripLocale, isLocale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { bn } from "@/lib/i18n/bn";
import { fmt } from "@/lib/i18n/index-client";

describe("locale routing helpers", () => {
  it("keeps English unprefixed and Bangla under /bn", () => {
    expect(localizedHref("/packages", "en")).toBe("/packages");
    expect(localizedHref("/packages", "bn")).toBe("/bn/packages");
    expect(localizedHref("/", "bn")).toBe("/bn");
    expect(localizedHref("/bn/blog/x", "en")).toBe("/blog/x");
  });
  it("never localizes admin, api or external URLs", () => {
    expect(localizedHref("/admin", "bn")).toBe("/admin");
    expect(localizedHref("/api/v1/public/site", "bn")).toBe("/api/v1/public/site");
    expect(localizedHref("https://example.com", "bn")).toBe("https://example.com");
    expect(localizedHref("//evil.com", "bn")).toBe("//evil.com");
  });
  it("strips locale prefixes", () => {
    expect(stripLocale("/bn")).toBe("/");
    expect(stripLocale("/bn/support")).toBe("/support");
    expect(stripLocale("/support")).toBe("/support");
  });
  it("validates locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
  it("picks bilingual fields", () => {
    const o = { titleEn: "Hi", titleBn: "হাই", listEn: ["a", ""], listBn: ["ক"] };
    expect(pick(o, "title", "bn")).toBe("হাই");
    expect(pickList(o, "list", "en")).toEqual(["a"]);
  });
  it("interpolates", () => {
    expect(fmt("Ref {code}", { code: "CON-1" })).toBe("Ref CON-1");
  });
});

describe("dictionaries", () => {
  const keys = (o: object, p = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [p + k] : keys(v as object, p + k + ".")));
  it("Bangla dictionary covers every English key with non-empty text", () => {
    const e = keys(en).sort();
    expect(keys(bn).sort()).toEqual(e);
    const flat = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : flat(v as object)));
    expect(flat(bn).every((s) => s.trim().length > 0)).toBe(true);
  });
});
