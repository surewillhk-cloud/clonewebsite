/**
 * Supabase Admin 客户端 - 使用 service_role 绕过 RLS
 * 用于 clone-worker、task-store 等服务端后台操作
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  adminClient = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
