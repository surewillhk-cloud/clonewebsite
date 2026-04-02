/**
 * POST /api/browser/[sessionId]/extract
 * 提取当前 Session 的 Cookie（用于登录辅助后的克隆）
 * 提取后 Session 可关闭，Cookie 仅在内存中传递给 clone/create
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  destroySession,
  extractSessionCookies,
} from '@/lib/browser-session';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const extracted = await extractSessionCookies(session.page);

    // 立即销毁 Session，释放资源
    await destroySession(sessionId);

    return NextResponse.json({
      cookieString: extracted.cookieString,
      domain: extracted.domain,
      extractedAt: extracted.extractedAt.toISOString(),
    });
  } catch (err) {
    console.error('[api/browser/extract]', err);
    return NextResponse.json(
      { error: 'Failed to extract cookies' },
      { status: 500 }
    );
  }
}
