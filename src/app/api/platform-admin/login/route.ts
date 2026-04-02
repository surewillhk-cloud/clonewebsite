/**
 * POST /api/platform-admin/login
 * 平台管理员登录（独立于用户认证）
 * 若已启用 TOTP，返回 needsTotp + tempToken，需再调用 verify-totp 完成登录
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, isDbConfigured } from '@/lib/db';
import { setAdminSession } from '@/lib/platform-admin/auth';
import { getAdminTotpSecret } from '@/lib/platform-admin/totp';

const TOTP_TEMP_EXPIRY_SEC = 180; // 3 分钟

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Platform admin not configured' },
      { status: 503 }
    );
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const result = await query(
      'SELECT id, email, role, password_hash FROM platform_admins WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const adminRow = result.rows[0];

    if (!adminRow) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const admin = adminRow as { id: string; email: string; role: string; password_hash: string };
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const totpSecret = await getAdminTotpSecret(admin.id);
    if (totpSecret) {
      const expiresAt = new Date(Date.now() + TOTP_TEMP_EXPIRY_SEC * 1000);
      const tempResult = await query(
        'INSERT INTO platform_admin_totp_temp (admin_id, expires_at) VALUES ($1, $2) RETURNING token',
        [admin.id, expiresAt.toISOString()]
      );
      const tempRow = tempResult.rows[0];
      if (!tempRow?.token) {
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
      }
      return NextResponse.json({
        needsTotp: true,
        tempToken: tempRow.token,
        email: admin.email,
      });
    }

    await query(
      'UPDATE platform_admins SET last_login_at = $1 WHERE id = $2',
      [new Date().toISOString(), admin.id]
    );

    await setAdminSession({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return NextResponse.json({ ok: true, email: admin.email });
  } catch (e) {
    console.error('[Platform Admin Login]', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
