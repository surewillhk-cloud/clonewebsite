/**
 * 平台管理后台鉴权
 */

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { query, isDbConfigured } from '@/lib/db';

const ADMIN_SESSION_COOKIE = 'webecho_platform_admin';
const SESSION_MAX_AGE = 60 * 60 * 8;

export interface PlatformAdmin {
  id: string;
  email: string;
  role: string;
}

function getSessionSecret(): string {
  const secret = process.env.PLATFORM_ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('PLATFORM_ADMIN_SESSION_SECRET required (min 32 chars)');
  }
  return secret;
}

function signPayload(payload: string): string {
  const secret = getSessionSecret();
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function verifySignature(payload: string, signature: string): boolean {
  try {
    const expected = signPayload(payload);
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<PlatformAdmin | null> {
  if (!isDbConfigured()) return null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token || !token.startsWith('session.')) return null;

    const parts = token.slice(8).split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    if (!verifySignature(payloadStr, signature)) return null;

    const payload = JSON.parse(payloadStr) as { email: string; role: string; exp: number };
    if (payload.exp * 1000 < Date.now()) return null;

    const result = await query(
      'SELECT id, email, role FROM platform_admins WHERE email = $1',
      [payload.email]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as PlatformAdmin;
  } catch {
    return null;
  }
}

export async function setAdminSession(admin: PlatformAdmin): Promise<void> {
  const cookieStore = await cookies();
  const payload = {
    email: admin.email,
    role: admin.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');
  const signature = signPayload(payloadStr);
  const token = `session.${payloadB64}.${signature}`;
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export function requireAdminSession(): Promise<PlatformAdmin> {
  return getAdminSession().then((admin) => {
    if (!admin) throw new Error('UNAUTHORIZED');
    return admin;
  });
}
