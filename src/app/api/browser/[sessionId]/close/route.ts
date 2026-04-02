/**
 * POST /api/browser/[sessionId]/close
 * 关闭并销毁 Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/browser-session';
import { getAuthUserId } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await destroySession(sessionId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/browser/close]', err);
    return NextResponse.json(
      { error: 'Failed to close session' },
      { status: 500 }
    );
  }
}
