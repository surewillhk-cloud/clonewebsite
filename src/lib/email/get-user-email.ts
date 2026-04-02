/**
 * 根据 userId 获取用户邮箱（用于邮件通知）
 */

import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

export async function getUserEmail(userId: string): Promise<string | null> {
  if (userId === 'anon' || !isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}
