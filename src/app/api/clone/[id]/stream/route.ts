/**
 * GET /api/clone/[id]/stream
 * SSE 流式推送克隆任务进度
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCloneEventStream } from '@/lib/events/emitter';
import { getAuthUserId } from '@/lib/api-auth';
import { getTaskOwner } from '@/lib/task-store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  if (!taskId) {
    return new Response('Missing task ID', { status: 400 });
  }

  const userId = await getAuthUserId(req);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const owner = await getTaskOwner(taskId);
  if (!owner || owner !== userId) {
    return new Response('Forbidden', { status: 403 });
  }

  const stream = createCloneEventStream(taskId);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
