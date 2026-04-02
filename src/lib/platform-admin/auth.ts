/**
 * 平台管理后台鉴权（与用户 auth 完全隔离）
 * 使用 platform_admins 表，session 存于 cookie
 * Token 使用 HMAC-SHA256 签名，防止伪造
 */

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_SESSION_COOKIE = 'webecho_platform_admin';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export interface PlatformAdmin {
  id: string;
  email: string;
  role: string;
}

function getSessionSecret(): string {
  const secret =
    process.env.PLATFORM_ADMIN_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('PLATFORM_ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY required (min 16 chars)');
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

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('platform_admins')
      .select('id, email, role')
      .eq('email', payload.email)
      .single();
    if (!data) return null;
    return data as PlatformAdmin;
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
