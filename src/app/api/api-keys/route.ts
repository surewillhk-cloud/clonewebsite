/**
 * GET /api/api-keys - 列出当前用户的 API Key
 * POST /api/api-keys - 创建新 API Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createApiKey, listApiKeys } from '@/lib/api-keys';
import { z } from 'zod';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await listApiKeys(user.id);
  return NextResponse.json({ keys });
}

const createSchema = z.object({
  name: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    // 空 body 允许
  }
  const parsed = createSchema.safeParse(body);
  const name = parsed.success ? parsed.data.name : undefined;

  const result = await createApiKey(user.id, name);
  if (!result) {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }

  return NextResponse.json({
    id: result.id,
    key: result.key,
    prefix: result.prefix,
    message: 'Save this key securely. It will not be shown again.',
  });
}
