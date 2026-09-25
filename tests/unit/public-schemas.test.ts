import { describe, expect, it } from "vitest";
import { connectionSchema, contactSchema, corporateSchema, coverageInterestSchema, issuesToFields } from "@/features/public-schemas";

const base = {
  name: "Test User",
  phone: "01712345678",
  districtId: "d1",
  thanaId: "t1",
  areaId: "a1",
  fullAddress: "House 1, Road 2",
  serviceType: "HOME",
  consent: true,
};

describe("Get Connection schema (PRD 5.10)", () => {
  it("accepts a valid request and normalizes phone", () => {
    const r = connectionSchema.parse({ ...base, email: " User@Example.COM " });
    expect(r.phone).toBe("+8801712345678");
    expect(r.email).toBe("user@example.com");
    expect(r.locale).toBe("en");
  });
  it("treats missing email as null", () => {
    expect(connectionSchema.parse(base).email).toBeNull();
  });
  it("requires consent", () => {
    const r = connectionSchema.safeParse({ ...base, consent: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(issuesToFields(r.error.issues).consent).toBe("consent");
  });
  it("clears the package for corporate requests", () => {
    expect(connectionSchema.parse({ ...base, serviceType: "CORPORATE", packageId: "p1" }).packageId).toBeNull();
  });
  it("returns localized error codes", () => {
    const r = connectionSchema.safeParse({ name: "x", phone: "123", email: "bad" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = issuesToFields(r.error.issues);
      expect(f.name).toBe("name");
      expect(f.phone).toBe("phone");
      expect(f.email).toBe("email");
      expect(f.districtId).toBe("location");
    }
  });
  it("enforces address and message limits", () => {
    expect(connectionSchema.safeParse({ ...base, fullAddress: "abc" }).success).toBe(false);
    expect(connectionSchema.safeParse({ ...base, message: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("other public forms", () => {
  it("contact requires subject and message", () => {
    expect(contactSchema.safeParse({ name: "Rahim", phone: "01812345678", subject: "", message: "" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Rahim", phone: "01812345678", subject: "Hi", message: "Hello" }).success).toBe(true);
  });
  it("corporate validates user count", () => {
    const ok = corporateSchema.parse({ companyName: "Acme", contactPerson: "Karim", email: "k@acme.com", phone: "01912345678", officeAddress: "Gulshan 1", numberOfUsers: "25", consent: true });
    expect(ok.numberOfUsers).toBe(25);
    expect(corporateSchema.safeParse({ companyName: "Acme", contactPerson: "Karim", email: "k@acme.com", phone: "01912345678", officeAddress: "Gulshan 1", numberOfUsers: "-3", consent: true }).success).toBe(false);
  });
  it("coverage interest only needs a phone", () => {
    const r = coverageInterestSchema.parse({ phone: "01512345678" });
    expect(r.name).toBeNull();
    expect(r.email).toBeNull();
  });
  it("honeypot must be empty", () => {
    expect(contactSchema.safeParse({ name: "Rahim", phone: "01812345678", subject: "Hi", message: "Hello", website: "spam" }).success).toBe(false);
  });
});
