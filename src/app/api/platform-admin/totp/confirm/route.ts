/**
 * POST /api/platform-admin/totp/confirm
 * 验证 TOTP 码并完成启用
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { verifyTotpCode, saveAdminTotpSecret } from '@/lib/platform-admin/totp';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { totpCode } = await req.json();
    if (!totpCode || typeof totpCode !== 'string') {
      return NextResponse.json({ error: 'totpCode required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: pending } = await (supabase as any)
      .from('platform_admin_totp_pending')
      .select('secret')
      .eq('admin_id', admin.id)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!pending?.secret) {
      return NextResponse.json({ error: 'Setup expired or not started' }, { status: 400 });
    }

    const valid = await verifyTotpCode(pending.secret, totpCode.trim());
    if (!valid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    await saveAdminTotpSecret(admin.id, pending.secret);
    await (supabase as any)
      .from('platform_admin_totp_pending')
      .delete()
      .eq('admin_id', admin.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[TOTP Confirm]', e);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}
