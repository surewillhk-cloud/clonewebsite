/**
 * GET /api/clone/[id]/stream
 * SSE 流式推送克隆任务进度
 */

import { NextRequest } from 'next/server';
import { createCloneEventStream } from '@/lib/events/emitter';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  if (!taskId) {
    return new Response('Missing task ID', { status: 400 });
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
