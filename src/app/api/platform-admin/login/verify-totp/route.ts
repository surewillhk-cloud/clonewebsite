/**
 * POST /api/platform-admin/login/verify-totp
 * TOTP 第二步验证，完成登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { setAdminSession } from '@/lib/platform-admin/auth';
import { getAdminTotpSecret, verifyTotpCode } from '@/lib/platform-admin/totp';

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Platform admin not configured' },
      { status: 503 }
    );
  }

  try {
    const { tempToken, totpCode } = await req.json();
    if (!tempToken || !totpCode || typeof tempToken !== 'string' || typeof totpCode !== 'string') {
      return NextResponse.json({ error: 'tempToken and totpCode required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: tempRow } = await (supabase as any)
      .from('platform_admin_totp_temp')
      .select('admin_id')
      .eq('token', tempToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!tempRow?.admin_id) {
      return NextResponse.json({ error: 'Invalid or expired temp token' }, { status: 401 });
    }

    const totpSecret = await getAdminTotpSecret(tempRow.admin_id);
    if (!totpSecret) {
      return NextResponse.json({ error: 'TOTP not configured' }, { status: 401 });
    }

    const valid = await verifyTotpCode(totpSecret, totpCode.trim());
    if (!valid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }

    await (supabase as any)
      .from('platform_admin_totp_temp')
      .delete()
      .eq('token', tempToken);

    const { data: adminRow } = await (supabase as any)
      .from('platform_admins')
      .select('id, email, role')
      .eq('id', tempRow.admin_id)
      .single();

    if (!adminRow) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    await (supabase as any)
      .from('platform_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminRow.id);

    await setAdminSession({
      id: adminRow.id,
      email: adminRow.email,
      role: adminRow.role,
    });

    return NextResponse.json({ ok: true, email: adminRow.email });
  } catch (e) {
    console.error('[Platform Admin Verify TOTP]', e);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
