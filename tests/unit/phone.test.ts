import { describe, expect, it } from "vitest";
import { displayBdPhone, normalizeBdPhone } from "@/lib/validation/phone";

describe("Bangladesh phone normalization", () => {
  it.each([
    ["01712345678", "+8801712345678"],
    ["+8801712345678", "+8801712345678"],
    ["8801712345678", "+8801712345678"],
    ["017-1234 5678", "+8801712345678"],
    ["01312345678", "+8801312345678"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });

  it.each(["0171234567", "01212345678", "12345", "+14155550100", "0171234567890", "abc"])("rejects %s", (input) => {
    expect(normalizeBdPhone(input)).toBeNull();
  });

  it("formats for display", () => {
    expect(displayBdPhone("+8801712345678")).toBe("01712345678");
  });
});
