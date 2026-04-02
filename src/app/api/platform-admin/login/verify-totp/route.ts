/**
 * POST /api/platform-admin/login/verify-totp
 * TOTP 第二步验证，完成登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, isDbConfigured } from '@/lib/db';
import { setAdminSession } from '@/lib/platform-admin/auth';
import { getAdminTotpSecret, verifyTotpCode } from '@/lib/platform-admin/totp';

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
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

    const tempResult = await query(
      'SELECT admin_id FROM platform_admin_totp_temp WHERE token = $1 AND expires_at > $2',
      [tempToken, new Date().toISOString()]
    );
    const tempRow = tempResult.rows[0];

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

    await query('DELETE FROM platform_admin_totp_temp WHERE token = $1', [tempToken]);

    const adminResult = await query(
      'SELECT id, email, role FROM platform_admins WHERE id = $1',
      [tempRow.admin_id]
    );
    const adminRow = adminResult.rows[0];

    if (!adminRow) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    await query(
      'UPDATE platform_admins SET last_login_at = $1 WHERE id = $2',
      [new Date().toISOString(), adminRow.id]
    );

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
