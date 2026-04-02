/**
 * 企业版 API Key 管理
 */

import { createHash, randomBytes } from 'crypto';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

const PREFIX = 'we_';
const KEY_BYTES = 32;
const HASH_ALGO = 'sha256';

function hashKey(key: string): string {
  return createHash(HASH_ALGO).update(key).digest('hex');
}

function generateKey(): string {
  const raw = randomBytes(KEY_BYTES).toString('base64url');
  return `${PREFIX}${raw}`;
}

/**
 * 创建新 API Key，返回完整 key（仅此一次可获取）
 */
export async function createApiKey(userId: string, name?: string): Promise<{ id: string; key: string; prefix: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const key = generateKey();
  const keyHash = hashKey(key);
  const prefix = `${key.slice(0, PREFIX.length + 8)}...`;

  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('api_keys') as any)
      .insert({
        user_id: userId,
        key_prefix: prefix,
        key_hash: keyHash,
        name: name ?? 'API Key',
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id, key, prefix };
  } catch {
    return null;
  }
}

/**
 * 根据完整 key 验证并返回 userId
 */
export async function validateApiKey(key: string): Promise<{ userId: string } | null> {
  if (!isSupabaseConfigured() || !key?.startsWith(PREFIX)) return null;
  const keyHash = hashKey(key);

  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('api_keys') as any)
      .select('user_id')
      .eq('key_hash', keyHash)
      .single();

    if (error || !data) return null;

    await (supabase.from('api_keys') as any)
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHash);

    return { userId: data.user_id };
  } catch {
    return null;
  }
}

/**
 * 列出用户的所有 API Key（不含完整 key）
 */
export async function listApiKeys(userId: string): Promise<Array<{ id: string; prefix: string; name: string; createdAt: string; lastUsedAt: string | null }>> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('api_keys') as any)
      .select('id, key_prefix, name, created_at, last_used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []).map((r: any) => ({
      id: r.id,
      prefix: r.key_prefix,
      name: r.name,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
    }));
  } catch {
    return [];
  }
}

/**
 * 撤销 API Key
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = createAdminClient();
    const { error } = await (supabase.from('api_keys') as any)
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}
