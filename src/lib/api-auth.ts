/**
 * 统一 API 鉴权：Session（Cookie）或 Bearer API Key
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiKey } from '@/lib/api-keys';

/**
 * 从请求中获取当前用户 ID
 * 优先 Session，其次 Authorization: Bearer we_xxx
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (bearerKey) {
    const validated = await validateApiKey(bearerKey);
    if (validated) return validated.userId;
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
