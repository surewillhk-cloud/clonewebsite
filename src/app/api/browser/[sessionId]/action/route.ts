/**
 * POST /api/browser/[sessionId]/action
 * 发送用户操作：click / keypress / scroll / navigate
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getSession,
  touchSession,
  handleAction,
} from '@/lib/browser-session';
import { getAuthUserId } from '@/lib/api-auth';
import { validateScrapeUrl } from '@/lib/url-validate';

const schema = z.object({
  type: z.enum(['click', 'keypress', 'scroll', 'navigate']),
  x: z.number().optional(),
  y: z.number().optional(),
  key: z.string().optional(),
  deltaY: z.number().optional(),
  url: z.string().optional(),
});

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

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid action', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.type === 'navigate' && parsed.data.url) {
      const urlCheck = validateScrapeUrl(parsed.data.url);
      if (!urlCheck.ok) {
        return NextResponse.json(
          { error: urlCheck.error ?? 'Invalid navigation URL' },
          { status: 400 }
        );
      }
    }

    touchSession(sessionId);
    await handleAction(session.page, parsed.data);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/browser/action]', err);
    return NextResponse.json(
      { error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}
