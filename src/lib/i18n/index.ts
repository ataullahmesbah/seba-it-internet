import { en, type Dictionary } from "./en";
import { bn } from "./bn";
import type { AppLocale } from "./config";

export type { Dictionary };
export * from "./config";

export function getDictionary(locale: AppLocale): Dictionary {
  return locale === "bn" ? bn : en;
}

export { fmt } from "./index-client";
