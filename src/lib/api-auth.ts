/**
 * 统一 API 鉴权：Session（Cookie）或 Bearer API Key
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateApiKey } from '@/lib/api-keys';

/**
 * 从请求中获取当前用户 ID
 * 优先 Authorization: Bearer we_xxx，其次 Session
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (bearerKey) {
    const validated = await validateApiKey(bearerKey);
    if (validated) return validated.userId;
  }

  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
