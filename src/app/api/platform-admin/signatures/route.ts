/**
 * GET/PUT /api/platform-admin/signatures
 * 第三方服务特征库（在线编辑，无需部署）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import {
  getSignaturesForEdit,
  saveSignatures,
} from '@/lib/platform-admin/signatures-config';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const signatures = await getSignaturesForEdit();
    return NextResponse.json(signatures);
  } catch (e) {
    console.error('[Platform Admin Signatures GET]', e);
    return NextResponse.json(
      { error: 'Failed to load signatures' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Invalid request: must be object' },
        { status: 400 }
      );
    }

    // 简单校验：键为字符串，值为对象含可选 domains/scriptPatterns/classNames/htmlPatterns
    for (const [key, val] of Object.entries(body)) {
      if (typeof key !== 'string' || key.trim() === '') {
        return NextResponse.json(
          { error: `Invalid service key: ${key}` },
          { status: 400 }
        );
      }
      if (val !== null && typeof val !== 'object') {
        return NextResponse.json(
          { error: `Invalid signature for ${key}: must be object` },
          { status: 400 }
        );
      }
      if (val) {
        const v = val as Record<string, unknown>;
        if (v.domains !== undefined && !Array.isArray(v.domains)) {
          return NextResponse.json(
            { error: `${key}.domains must be array` },
            { status: 400 }
          );
        }
        if (v.scriptPatterns !== undefined && !Array.isArray(v.scriptPatterns)) {
          return NextResponse.json(
            { error: `${key}.scriptPatterns must be array` },
            { status: 400 }
          );
        }
        if (v.classNames !== undefined && !Array.isArray(v.classNames)) {
          return NextResponse.json(
            { error: `${key}.classNames must be array` },
            { status: 400 }
          );
        }
        if (v.htmlPatterns !== undefined && !Array.isArray(v.htmlPatterns)) {
          return NextResponse.json(
            { error: `${key}.htmlPatterns must be array` },
            { status: 400 }
          );
        }
      }
    }

    const sigs = body as Record<string, { domains?: string[]; scriptPatterns?: string[]; classNames?: string[]; htmlPatterns?: string[] }>;
    await saveSignatures(sigs, admin.email);
    const updated = await getSignaturesForEdit();
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[Platform Admin Signatures PUT]', e);
    return NextResponse.json(
      { error: 'Failed to save signatures' },
      { status: 500 }
    );
  }
}
