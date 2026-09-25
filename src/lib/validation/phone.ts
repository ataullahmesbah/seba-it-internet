/**
 * Bangladesh mobile normalization (PRD 12.1).
 * Accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX (spaces/dashes ignored) and
 * stores a single E.164 representation: +8801XXXXXXXXX.
 */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  let m = digits.match(/^\+?8801([3-9]\d{8})$/);
  if (m) return `+8801${m[1]}`;
  m = digits.match(/^01([3-9]\d{8})$/);
  if (m) return `+8801${m[1]}`;
  return null;
}

export function displayBdPhone(e164: string): string {
  const m = e164.match(/^\+880(1\d{9})$/);
  return m ? `0${m[1]}` : e164;
}
