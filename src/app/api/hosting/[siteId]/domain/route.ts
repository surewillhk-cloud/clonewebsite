/**
 * POST /api/hosting/[siteId]/domain
 * 绑定自定义域名（占位实现，返回 CNAME 指引）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

const schema = z.object({
  domain: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
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

    const admin = createAdminClient();
    const { data: site, error } = await admin
      .from('hosted_sites')
      .select('railway_deployment_url')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (error || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const row = site as { railway_deployment_url?: string | null };
    const cnameTarget = row.railway_deployment_url
      ? new URL(row.railway_deployment_url).hostname
      : 'xxx.up.railway.app';

    // @ts-expect-error Supabase table types may not match generated schema
    await admin.from('hosted_sites').update({
      custom_domain: parsed.data.domain,
      domain_verified: false,
    }).eq('id', siteId);

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
