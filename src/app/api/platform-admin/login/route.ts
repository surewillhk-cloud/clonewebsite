/**
 * POST /api/platform-admin/login
 * 平台管理员登录（独立于用户认证）
 * 若已启用 TOTP，返回 needsTotp + tempToken，需再调用 verify-totp 完成登录
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase/admin';
import { setAdminSession } from '@/lib/platform-admin/auth';
import { getAdminTotpSecret } from '@/lib/platform-admin/totp';

const TOTP_TEMP_EXPIRY_SEC = 180; // 3 分钟

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
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

    const supabase = createAdminClient();
    const { data: adminRow, error } = await supabase
      .from('platform_admins')
      .select('id, email, role, password_hash')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !adminRow) {
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
      const { data: tempRow } = await (supabase as any)
        .from('platform_admin_totp_temp')
        .insert({ admin_id: admin.id, expires_at: expiresAt.toISOString() })
        .select('token')
        .single();
      if (!tempRow?.token) {
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
      }
      return NextResponse.json({
        needsTotp: true,
        tempToken: tempRow.token,
        email: admin.email,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('platform_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

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
