/**
 * POST /api/hosting/[siteId]/domain
 * 绑定自定义域名（占位实现，返回 CNAME 指引）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUserId } from '@/lib/api-auth';
import { query, isDbConfigured } from '@/lib/db';

const schema = z.object({
  domain: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;

    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: 'Hosted sites require Supabase' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid domain', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { rows: [site] } = await query<{ railway_deployment_url?: string | null }>(
      'SELECT railway_deployment_url FROM hosted_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const cnameTarget = site.railway_deployment_url
      ? new URL(site.railway_deployment_url).hostname
      : 'xxx.up.railway.app';

    await query(
      'UPDATE hosted_sites SET custom_domain = $1, domain_verified = false WHERE id = $2',
      [parsed.data.domain, siteId]
    );

    return NextResponse.json({
      cnameTarget,
      verificationStatus: 'pending',
      instructions: `将 ${parsed.data.domain} 的 CNAME 记录指向 ${cnameTarget}`,
    });
  } catch (err) {
    console.error('[api/hosting/domain]', err);
    return NextResponse.json(
      { error: 'Failed to set domain' },
      { status: 500 }
    );
  }
}
