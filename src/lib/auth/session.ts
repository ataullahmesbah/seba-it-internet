import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashIp, hashToken, randomToken } from "@/lib/security/crypto";
import { isPermissionKey, type PermissionKey } from "@/lib/auth/permissions";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-seba_admin" : "seba_admin";
const ABSOLUTE_MS = 12 * 60 * 60 * 1000; // 12h absolute lifetime
const IDLE_MS = 60 * 60 * 1000; // 60 min inactivity timeout
const TOUCH_MS = 5 * 60 * 1000; // throttle lastSeen updates
const REAUTH_MS = 10 * 60 * 1000; // sensitive re-auth window

export interface AdminContext {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: Set<PermissionKey>;
  twoFactorEnabled: boolean;
  twoFactorPassed: boolean;
  reauthAt: Date | null;
}

export async function createSession(userId: string, ip: string, userAgent: string, twoFactorPassed: boolean) {
  const token = randomToken(32);
  const now = Date.now();
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(now + ABSOLUTE_MS),
      lastSeenAt: new Date(now),
      ipHash: hashIp(ip),
      userAgent: userAgent.slice(0, 300),
      twoFactorPassed,
      reauthAt: new Date(now),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_MS / 1000,
  });
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Resolve the current admin (validates revocation, expiry, idle timeout and active user). */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          totp: { select: { enabledAt: true } },
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      },
    },
  });
  if (!session || session.revokedAt) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || now - session.lastSeenAt.getTime() > IDLE_MS) return null;
  if (!session.user.isActive) return null;

  if (now - session.lastSeenAt.getTime() > TOUCH_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } }).catch(() => {});
  }

  const permissions = new Set<PermissionKey>();
  const roles: string[] = [];
  for (const ur of session.user.roles) {
    roles.push(ur.role.name);
    for (const rp of ur.role.permissions) if (isPermissionKey(rp.permission.key)) permissions.add(rp.permission.key);
  }
  return {
    sessionId: session.id,
    userId: session.userId,
    email: session.user.email,
    displayName: session.user.displayName,
    roles,
    permissions,
    twoFactorEnabled: Boolean(session.user.totp?.enabledAt),
    twoFactorPassed: session.twoFactorPassed,
    reauthAt: session.reauthAt,
  };
});

export function hasRecentAuth(ctx: AdminContext): boolean {
  return Boolean(ctx.reauthAt && Date.now() - ctx.reauthAt.getTime() < REAUTH_MS);
}

export async function revokeSession(sessionId: string) {
  await db.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string) {
  await db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}
