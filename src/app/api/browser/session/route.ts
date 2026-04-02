/**
 * POST /api/browser/session
 * 创建内嵌浏览器 Session（登录辅助 / 克隆预览）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession } from '@/lib/browser-session';
import { createClient } from '@/lib/supabase/server';
import { validateScrapeUrl } from '@/lib/url-validate';

const schema = z.object({
  targetUrl: z.string().url(),
  purpose: z.enum(['login', 'preview']).default('login'),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { targetUrl, purpose } = parsed.data;
    const urlCheck = validateScrapeUrl(targetUrl);
    if (!urlCheck.ok) {
      return NextResponse.json(
        { error: urlCheck.error ?? 'Invalid target URL' },
        { status: 400 }
      );
    }
    const session = await createSession(user.id, targetUrl, purpose);

    return NextResponse.json({
      sessionId: session.sessionId,
      targetUrl: session.targetUrl,
      purpose: session.purpose,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg === 'MAX_SESSIONS_PER_USER') {
      return NextResponse.json(
        { error: '每用户最多 2 个并发 Session' },
        { status: 429 }
      );
    }
    if (msg === 'MAX_TOTAL_SESSIONS') {
      return NextResponse.json(
        { error: '服务器 Session 已满，请稍后再试' },
        { status: 503 }
      );
    }
    console.error('[api/browser/session]', err);
    return NextResponse.json(
      { error: 'Failed to create browser session' },
      { status: 500 }
    );
  }
}
