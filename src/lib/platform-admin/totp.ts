/**
 * 平台管理员 TOTP 双因素认证
 */

import { generateSecret, generateURI, verify } from 'otplib';
import { query, isDbConfigured } from '@/lib/db';

const ISSUER = 'WebEcho AI';

export function createTotpSecret(email: string): { secret: string; uri: string } {
  const secret = generateSecret();
  const uri = generateURI({
    secret,
    label: email,
    issuer: ISSUER,
  });
  return { secret, uri };
}

export async function verifyTotpCode(
  secret: string,
  token: string
): Promise<boolean> {
  const result = await verify({ secret, token });
  return result.valid;
}

export async function getAdminTotpSecret(adminId: string): Promise<string | null> {
  if (!isDbConfigured()) return null;

  const result = await query(
    'SELECT totp_secret FROM platform_admins WHERE id = $1',
    [adminId]
  );
  return result.rows[0]?.totp_secret ?? null;
}

export async function saveAdminTotpSecret(
  adminId: string,
  secret: string
): Promise<void> {
  if (!isDbConfigured()) return;

  await query(
    'UPDATE platform_admins SET totp_secret = $1 WHERE id = $2',
    [secret, adminId]
  );
}

export async function clearAdminTotpSecret(adminId: string): Promise<void> {
  if (!isDbConfigured()) return;

  await query(
    'UPDATE platform_admins SET totp_secret = NULL WHERE id = $1',
    [adminId]
  );
}
