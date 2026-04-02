/**
 * 企业版 API Key 管理
 */

import { createHash, randomBytes } from 'crypto';
import { query, isDbConfigured } from '@/lib/db';

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

export async function createApiKey(userId: string, name?: string): Promise<{ id: string; key: string; prefix: string } | null> {
  if (!isDbConfigured()) return null;

  const key = generateKey();
  const keyHash = hashKey(key);
  const prefix = `${key.slice(0, PREFIX.length + 8)}...`;

  try {
    const result = await query(
      `INSERT INTO api_keys (user_id, key_prefix, key_hash, name, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [userId, prefix, keyHash, name ?? 'API Key']
    );

    if (result.rows.length === 0) return null;
    return { id: result.rows[0].id as string, key, prefix };
  } catch {
    return null;
  }
}

export async function validateApiKey(key: string): Promise<{ userId: string } | null> {
  if (!isDbConfigured() || !key?.startsWith(PREFIX)) return null;

  const keyHash = hashKey(key);

  try {
    const result = await query(
      'SELECT user_id FROM api_keys WHERE key_hash = $1',
      [keyHash]
    );

    if (result.rows.length === 0) return null;

    const userId = result.rows[0].user_id as string;

    await query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1',
      [keyHash]
    );

    return { userId };
  } catch {
    return null;
  }
}

export async function listApiKeys(userId: string): Promise<Array<{ id: string; prefix: string; name: string; createdAt: string; lastUsedAt: string | null }>> {
  if (!isDbConfigured()) return [];

  try {
    const result = await query(
      `SELECT id, key_prefix, name, created_at, last_used_at 
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      prefix: r.key_prefix as string,
      name: r.name as string,
      createdAt: r.created_at as string,
      lastUsedAt: r.last_used_at as string | null,
    }));
  } catch {
    return [];
  }
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  if (!isDbConfigured()) return false;

  try {
    const result = await query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2',
      [keyId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}
