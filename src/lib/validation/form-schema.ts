import "server-only";
import { z } from "zod";
import type { FieldDef } from "@/features/fields";
import { ICON_KEYS } from "@/features/fields";
import { sanitizeRichText } from "@/lib/sanitize";

export type FieldErrors = Record<string, string>;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** URLs must be https:// (http allowed outside production), mailto/tel, or relative internal routes where allowed. */
export function isAllowedUrl(v: string, allowRelative: boolean): boolean {
  if (allowRelative && v.startsWith("/") && !v.startsWith("//")) return true;
  if (/^(mailto:|tel:)/i.test(v)) return true;
  try {
    const u = new URL(v);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

/** Parse a datetime-local value as Asia/Dhaka time (UTC+6, no DST). */
export function parseDhakaDateTime(v: string): Date | null {
  if (!v) return null;
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(v) ? v : `${v}:00+06:00`.replace(/:00:00\+/, ":00+"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function scalarSchema(f: FieldDef, required: boolean): z.ZodTypeAny {
  const label = f.label;
  switch (f.type) {
    case "checkbox":
      return z.boolean();
    case "number": {
      let s = z.number({ error: `${label} must be a number` });
      if (f.min !== undefined) s = s.min(f.min, `${label} must be ≥ ${f.min}`);
      if (f.max !== undefined) s = s.max(f.max, `${label} must be ≤ ${f.max}`);
      return required ? s : s.nullable();
    }
    case "datetime":
      return required ? z.date({ error: `${label} is required` }) : z.date().nullable();
    case "lines": {
      let s = z.array(z.string().max(300));
      if (f.max) s = s.max(f.max, `${label}: at most ${f.max} items`);
      return required ? s.min(1, `${label} is required`) : s;
    }
    case "repeater":
      return z.array(z.record(z.string(), z.string())).max(f.maxItems ?? 20, `${label}: at most ${f.maxItems} items`);
    default: {
      let s = z.string();
      const max = f.max ?? (f.type === "richtext" ? 100_000 : f.type === "textarea" ? 5000 : 300);
      s = s.max(max, `${label} must be at most ${max} characters`);
      if (f.type === "email") s = s.refine((v) => v === "" || z.email().safeParse(v).success, `${label} must be a valid email`) as unknown as z.ZodString;
      if (f.type === "pdf") s = s.refine((v) => v === "" || isAllowedUrl(v, false), `${label} must be an https:// link to a PDF`) as unknown as z.ZodString;
      if (f.type === "url") s = s.refine((v) => v === "" || isAllowedUrl(v, Boolean(f.allowRelative)), `${label} must be a valid https:// URL${f.allowRelative ? " or /internal-path" : ""}`) as unknown as z.ZodString;
      if (f.type === "color") s = s.refine((v) => v === "" || HEX.test(v), `${label} must be a hex color like #0A66FF`) as unknown as z.ZodString;
      if (f.type === "icon") s = s.refine((v) => v === "" || (ICON_KEYS as readonly string[]).includes(v), `Unknown icon`) as unknown as z.ZodString;
      if (f.type === "select" && f.options) {
        const allowed = f.options.map((o) => o.value);
        s = s.refine((v) => v === "" || allowed.includes(v), `${label}: invalid option`) as unknown as z.ZodString;
      }
      if (required) return s.min(f.min ?? 1, f.min ? `${label} must be at least ${f.min} characters` : `${label} is required`);
      return s;
    }
  }
}

function readRaw(f: FieldDef, key: string, fd: FormData): unknown {
  const raw = fd.get(key);
  const str = typeof raw === "string" ? raw : "";
  switch (f.type) {
    case "checkbox":
      return raw === "on" || raw === "true";
    case "number":
      return str.trim() === "" ? null : Number(str);
    case "datetime":
      return parseDhakaDateTime(str.trim());
    case "lines":
      return str
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    case "repeater": {
      try {
        const arr = JSON.parse(str || "[]");
        if (!Array.isArray(arr)) return [];
        return arr.map((row) => {
          const out: Record<string, string> = {};
          for (const sf of f.fields ?? []) {
            for (const k of sf.bilingual ? [sf.name + "En", sf.name + "Bn"] : [sf.name]) {
              out[k] = typeof row?.[k] === "string" ? String(row[k]).trim().slice(0, 500) : "";
            }
          }
          return out;
        });
      } catch {
        return [];
      }
    }
    case "richtext":
      return sanitizeRichText(str);
    default:
      return str.trim();
  }
}

/**
 * Validate and normalize a FormData payload against field definitions.
 * Unknown form keys are ignored (mass-assignment safe).
 */
export function parseFields(fields: FieldDef[], fd: FormData): { data: Record<string, unknown>; errors: FieldErrors } {
  const data: Record<string, unknown> = {};
  const errors: FieldErrors = {};
  for (const f of fields) {
    const keys = f.bilingual ? [f.name + "En", f.name + "Bn"] : [f.name];
    keys.forEach((key, i) => {
      const required = Boolean(f.required) && !(f.bilingual && i === 1 && f.bnOptional);
      const value = readRaw(f, key, fd);
      const res = scalarSchema(f, required).safeParse(value);
      if (!res.success) {
        errors[key] = (f.bilingual ? (i === 0 ? "[EN] " : "[BN] ") : "") + res.error.issues[0].message;
        return;
      }
      // Repeater: validate required sub-fields.
      if (f.type === "repeater") {
        const rows = res.data as Record<string, string>[];
        rows.forEach((row, ri) => {
          for (const sf of f.fields ?? []) {
            if (!sf.required) continue;
            const sks = sf.bilingual ? [sf.name + "En", sf.name + "Bn"] : [sf.name];
            for (const sk of sks) if (!row[sk]) errors[key] = `${f.label}: row ${ri + 1} — ${sf.label} is required`;
          }
          for (const sf of f.fields ?? []) {
            if (sf.type === "url" && row[sf.name] && !isAllowedUrl(row[sf.name], true)) errors[key] = `${f.label}: row ${ri + 1} — invalid URL`;
          }
        });
      }
      const v = res.data;
      data[key] = typeof v === "string" && v === "" && f.type !== "richtext" && !required ? null : v;
      if (f.type === "richtext" && v === "" && !required) data[key] = null;
    });
  }
  return { data, errors };
}
