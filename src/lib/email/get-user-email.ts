/**
 * 根据 userId 获取用户邮箱（用于邮件通知）
 */

import { query, isDbConfigured } from '@/lib/db';

export async function getUserEmail(userId: string): Promise<string | null> {
  if (userId === 'anon' || !isDbConfigured()) return null;

  try {
    const result = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.email ?? null;
  } catch {
    return null;
  }
}
