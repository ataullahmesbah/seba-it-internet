import { z } from "zod";
import { normalizeBdPhone } from "@/lib/validation/phone";

/**
 * Public form schemas (PRD 5.10 / 12). Error messages are dictionary keys under `validation.*`
 * so the same schema produces localized messages on the client and stable codes on the server.
 */
const trimmed = (min: number, max: number, code: string) => z.string({ error: code }).trim().min(min, code).max(max, code);
const optionalEmail = z
  .string({ error: "email" })
  .optional()
  .transform((v, ctx) => {
    const e = (v ?? "").trim().toLowerCase();
    if (e === "") return null;
    if (e.length > 254 || !z.email().safeParse(e).success) {
      ctx.addIssue({ code: "custom", message: "email" });
      return z.NEVER;
    }
    return e;
  });
const requiredEmail = z.string({ error: "email" }).trim().toLowerCase().max(254, "email").pipe(z.email("email"));
const bdPhone = z
  .string({ error: "phone" })
  .trim()
  .transform((v, ctx) => {
    const n = normalizeBdPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return n;
  });
const optionalBdPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = normalizeBdPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return n;
  });
const id = z.string({ error: "location" }).trim().min(1, "location").max(40, "location");
const locale = z.enum(["en", "bn"]).default("en");
const antiBot = { website: z.string().max(0).optional().default(""), turnstileToken: z.string().max(4096).optional() };

export const connectionSchema = z
  .object({
    name: trimmed(2, 100, "name"),
    email: optionalEmail,
    phone: bdPhone,
    districtId: id,
    thanaId: id,
    areaId: id,
    fullAddress: trimmed(5, 500, "address"),
    serviceType: z.enum(["HOME", "CORPORATE"], { error: "required" }),
    packageId: z.string().trim().max(40).optional().transform((v) => (v ? v : null)),
    message: z.string().trim().max(2000, "message").optional().transform((v) => (v ? v : null)),
    consent: z.literal(true, { error: "consent" }),
    locale,
    utm: z.record(z.string(), z.string().max(100)).optional(),
    ...antiBot,
  })
  .transform((v) => ({ ...v, packageId: v.serviceType === "CORPORATE" ? null : v.packageId }));
export type ConnectionInput = z.input<typeof connectionSchema>;

export const corporateSchema = z.object({
  companyName: trimmed(2, 150, "company"),
  contactPerson: trimmed(2, 100, "name"),
  email: requiredEmail,
  phone: bdPhone,
  districtId: z.string().trim().max(40).optional().transform((v) => (v ? v : null)),
  thanaId: z.string().trim().max(40).optional().transform((v) => (v ? v : null)),
  officeAddress: trimmed(5, 500, "address"),
  requiredBandwidth: z.string().trim().max(100).optional().transform((v) => (v ? v : null)),
  numberOfUsers: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
        ctx.addIssue({ code: "custom", message: "number" });
        return z.NEVER;
      }
      return n;
    }),
  message: z.string().trim().max(2000, "message").optional().transform((v) => (v ? v : null)),
  consent: z.literal(true, { error: "consent" }),
  locale,
  ...antiBot,
});

export const contactSchema = z.object({
  name: trimmed(2, 100, "name"),
  email: optionalEmail,
  phone: bdPhone, // phone required by default for Bangladesh deployments
  subject: trimmed(2, 150, "subject"),
  message: trimmed(1, 2000, "message"),
  locale,
  ...antiBot,
});

export const coverageInterestSchema = z.object({
  name: z.string().trim().max(100, "name").optional().transform((v) => (v ? v : null)),
  phone: bdPhone,
  email: optionalEmail,
  districtId: z.string().trim().max(40).optional().transform((v) => (v ? v : null)),
  thanaId: z.string().trim().max(40).optional().transform((v) => (v ? v : null)),
  areaId: z.string().trim().max(40).optional().transform((v) => (v ? v : null)),
  freeTextArea: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
  locale,
  ...antiBot,
});

export const chatMessageSchema = z.object({ body: z.string().trim().min(1, "message").max(2000, "message") });
export const chatSessionSchema = z.object({
  name: z.string().trim().max(100).optional().transform((v) => (v ? v : null)),
  phone: optionalBdPhone.optional().transform((v) => v ?? null),
  locale,
});

/** Flatten zod issues into { field: code }. */
export function issuesToFields(issues: z.core.$ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "_form");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}
