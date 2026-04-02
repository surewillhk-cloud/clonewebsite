/**
 * GET /api/browser/[sessionId]/screenshot
 * MVP 轮询模式 - 获取当前页面截图 (base64 JPEG)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  touchSession,
  captureScreenshot,
  detectLoginStatus,
} from '@/lib/browser-session';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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

    touchSession(sessionId);
    const screenshot = await captureScreenshot(session.page);

    const loginStatus =
      session.purpose === 'login'
        ? await detectLoginStatus(session.page, session.targetUrl)
        : null;

    return NextResponse.json({
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      currentUrl: session.page.url(),
      loginStatus: loginStatus
        ? {
            isLoggedIn: loginStatus.isLoggedIn,
            confidence: loginStatus.confidence,
          }
        : null,
    });
  } catch (err) {
    console.error('[api/browser/screenshot]', err);
    return NextResponse.json(
      { error: 'Failed to get screenshot' },
      { status: 500 }
    );
  }
}
