import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id (algorithm 2) with OWASP-recommended parameters.
const OPTIONS = { algorithm: 2 as const, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}

const COMMON = new Set([
  "password1234", "123456789012", "qwertyuiopas", "adminadmin12", "password123!", "iloveyou1234",
  "welcome12345", "letmein12345", "passwordpassword", "111111111111", "000000000000", "abc123456789",
]);

/** PRD 18.1: 12-128 chars, reject common values. Returns error message or null. */
export function passwordPolicyError(pw: string): string | null {
  if (pw.length < 12) return "Password must be at least 12 characters.";
  if (pw.length > 128) return "Password must be at most 128 characters.";
  if (COMMON.has(pw.toLowerCase())) return "This password is too common.";
  if (/^(.)\1+$/.test(pw)) return "Password cannot be a single repeated character.";
  return null;
}
