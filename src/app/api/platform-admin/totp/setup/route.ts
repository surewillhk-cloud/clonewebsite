/**
 * POST /api/platform-admin/totp/setup
 * 发起 TOTP 设置，返回 QR URI（用于扫码或手动输入）
 */

import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { createTotpSecret } from '@/lib/platform-admin/totp';
import { query } from '@/lib/db';

const PENDING_EXPIRY_SEC = 600; // 10 分钟

export async function POST() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingResult = await query(
      'SELECT totp_secret FROM platform_admins WHERE id = $1',
      [admin.id]
    );
    const existing = existingResult.rows[0];
    if (existing?.totp_secret) {
      return NextResponse.json({ error: 'TOTP already enabled' }, { status: 400 });
    }

    const { secret, uri } = createTotpSecret(admin.email);
    const expiresAt = new Date(Date.now() + PENDING_EXPIRY_SEC * 1000);
    await query(
      `INSERT INTO platform_admin_totp_pending (admin_id, secret, expires_at) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (admin_id) DO UPDATE SET secret = $2, expires_at = $3`,
      [admin.id, secret, expiresAt.toISOString()]
    );

    const qrDataUrl = await QRCode.toDataURL(uri, { width: 200, margin: 2 });
    return NextResponse.json({ secret, qrDataUrl }); // secret 用于手动输入
  } catch (e) {
    console.error('[TOTP Setup]', e);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
