/**
 * 平台管理员 TOTP 双因素认证
 */

import { generateSecret, generateURI, verify } from 'otplib';
import { createAdminClient } from '@/lib/supabase/admin';

const ISSUER = 'WebEcho AI';

/** 生成 TOTP 密钥并返回 otpauth URI（用于扫码） */
export function createTotpSecret(email: string): { secret: string; uri: string } {
  const secret = generateSecret();
  const uri = generateURI({
    secret,
    label: email,
    issuer: ISSUER,
  });
  return { secret, uri };
}

/** 验证 TOTP 码 */
export async function verifyTotpCode(
  secret: string,
  token: string
): Promise<boolean> {
  const result = await verify({ secret, token });
  return result.valid;
}

/** 获取管理员 TOTP 密钥（用于登录验证） */
export async function getAdminTotpSecret(adminId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from('platform_admins')
    .select('totp_secret')
    .eq('id', adminId)
    .single();
  return data?.totp_secret ?? null;
}

/** 保存管理员 TOTP 密钥（首次启用 2FA 时调用） */
export async function saveAdminTotpSecret(
  adminId: string,
  secret: string
): Promise<void> {
  const supabase = createAdminClient();
  await (supabase as any)
    .from('platform_admins')
    .update({ totp_secret: secret })
    .eq('id', adminId);
}

/** 清除管理员 TOTP 密钥（禁用 2FA） */
export async function clearAdminTotpSecret(adminId: string): Promise<void> {
  const supabase = createAdminClient();
  await (supabase as any)
    .from('platform_admins')
    .update({ totp_secret: null })
    .eq('id', adminId);
}
