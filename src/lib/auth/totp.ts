import "server-only";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { hashToken } from "@/lib/security/crypto";

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function totpFor(secretBase32: string, label: string, issuer: string) {
  return new TOTP({ issuer, label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secretBase32) });
}

export function verifyTotp(secretBase32: string, code: string): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return totpFor(secretBase32, "x", "x").validate({ token: clean, window: 1 }) !== null;
}

export async function totpQrDataUrl(secretBase32: string, label: string, issuer: string): Promise<string> {
  return QRCode.toDataURL(totpFor(secretBase32, label, issuer).toString(), { margin: 1, width: 220 });
}

export function generateRecoveryCodes(n = 8): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: n }, () => {
    const s = randomBytes(5).toString("hex").toUpperCase();
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
  return { plain, hashed: plain.map((c) => hashToken("rc:" + c)) };
}

export function hashRecoveryCode(code: string) {
  return hashToken("rc:" + code.trim().toUpperCase());
}
