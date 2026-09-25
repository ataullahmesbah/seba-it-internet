/**
 * Serializable field definitions shared by the admin form renderer (client) and the
 * server-side schema builder. One definition drives both UI and validation.
 */
export type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "email"
  | "url"
  | "color"
  | "datetime"
  | "checkbox"
  | "select"
  | "media"
  | "lines"
  | "repeater"
  | "icon"
  | "password"
  /** PDF document: https URL, with an optional Cloudinary upload button. */
  | "pdf";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  /** Expands to `${name}En` and `${name}Bn`. */
  bilingual?: boolean;
  required?: boolean;
  /** For bilingual fields: allow Bangla to be empty (optional in one locale). */
  bnOptional?: boolean;
  min?: number;
  max?: number;
  help?: string;
  placeholder?: string;
  options?: SelectOption[];
  /** Key into server-provided dynamic option lists (e.g. "blogCategories"). */
  optionsKey?: string;
  mediaCategory?: string;
  /** Repeater sub-fields (no nested repeaters). */
  fields?: FieldDef[];
  maxItems?: number;
  /** Grid width in the form: full (default) or half. */
  width?: "full" | "half";
  /** Allow relative internal URLs (/packages) for url fields. */
  allowRelative?: boolean;
  /** Warn (not block) above this length (SEO fields). */
  softMax?: number;
}

export const ICON_KEYS = [
  "zap", "wifi", "headphones", "shield-check", "gauge", "clock", "rocket", "house", "building", "server",
  "network", "globe", "cloud", "lock", "users", "map-pin", "phone", "mail", "message-circle", "router",
  "cable", "star", "award", "tv", "gamepad", "crown", "laptop", "smartphone", "handshake", "badge-check",
  "activity", "signal", "layers", "settings", "wrench", "credit-card", "receipt", "file-text", "help",
  "timer", "trending-up", "chart", "sparkles", "gift", "shield", "calendar", "target", "briefcase",
  "graduation-cap", "monitor", "satellite", "flame", "landmark",
] as const;
export type IconKey = (typeof ICON_KEYS)[number];

export const ICON_OPTIONS: SelectOption[] = ICON_KEYS.map((k) => ({ value: k, label: k }));

/** Expand bilingual definitions into concrete storage keys. */
export function fieldKeys(f: FieldDef): string[] {
  return f.bilingual ? [f.name + "En", f.name + "Bn"] : [f.name];
}

export const t = (name: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ name, label, type: "text", ...extra });
export const bt = (name: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ name, label, type: "text", bilingual: true, ...extra });
export const bta = (name: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ name, label, type: "textarea", bilingual: true, ...extra });
