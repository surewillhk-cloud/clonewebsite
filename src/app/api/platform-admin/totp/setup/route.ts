/**
 * POST /api/platform-admin/totp/setup
 * 发起 TOTP 设置，返回 QR URI（用于扫码或手动输入）
 */

import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { createTotpSecret } from '@/lib/platform-admin/totp';
import { createAdminClient } from '@/lib/supabase/admin';

const PENDING_EXPIRY_SEC = 600; // 10 分钟

export async function POST() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: existing } = await (supabase as any)
      .from('platform_admins')
      .select('totp_secret')
      .eq('id', admin.id)
      .single();
    if (existing?.totp_secret) {
      return NextResponse.json({ error: 'TOTP already enabled' }, { status: 400 });
    }

    const { secret, uri } = createTotpSecret(admin.email);
    const expiresAt = new Date(Date.now() + PENDING_EXPIRY_SEC * 1000);
    await (supabase as any)
      .from('platform_admin_totp_pending')
      .upsert(
        { admin_id: admin.id, secret, expires_at: expiresAt.toISOString() },
        { onConflict: 'admin_id' }
      );

    const qrDataUrl = await QRCode.toDataURL(uri, { width: 200, margin: 2 });
    return NextResponse.json({ secret, qrDataUrl }); // secret 用于手动输入
  } catch (e) {
    console.error('[TOTP Setup]', e);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
