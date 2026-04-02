/**
 * POST /api/platform-admin/signatures/reset
 * 恢复为代码内置的默认特征库
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { saveSignatures, getSignaturesForEdit } from '@/lib/platform-admin/signatures-config';
import { SIGNATURES } from '@/constants/third-party-signatures';

function toSerialized(
  sigs: typeof SIGNATURES
): Record<string, { domains?: string[]; scriptPatterns?: string[]; classNames?: string[]; htmlPatterns?: string[] }> {
  const out: Record<string, { domains?: string[]; scriptPatterns?: string[]; classNames?: string[]; htmlPatterns?: string[] }> = {};
  for (const [name, s] of Object.entries(sigs)) {
    out[name] = {
      domains: s.domains,
      scriptPatterns: s.scriptPatterns?.map((r) => (r.flags ? `/${r.source}/${r.flags}` : `/${r.source}/`)),
      classNames: s.classNames,
      htmlPatterns: s.htmlPatterns?.map((r) => (r.flags ? `/${r.source}/${r.flags}` : `/${r.source}/`)),
    };
  }
  return out;
}

export async function POST() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const defaultSigs = toSerialized(SIGNATURES);
    await saveSignatures(defaultSigs, admin.email);
    const updated = await getSignaturesForEdit();
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[Platform Admin Signatures Reset]', e);
    return NextResponse.json(
      { error: 'Failed to reset signatures' },
      { status: 500 }
    );
  }
}
