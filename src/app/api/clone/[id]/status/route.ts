/**
 * GET /api/clone/[id]/status
 * 前端每 3 秒轮询任务进度
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskStatusWithOwner } from '@/lib/task-store';
import { getAuthUserId } from '@/lib/api-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  const taskWithOwner = await getTaskStatusWithOwner(id);

  if (!taskWithOwner) {
    return NextResponse.json({
      taskId: id,
      status: 'queued',
      progress: 0,
      currentStep: '任务已创建，等待处理...',
      qualityScore: null,
      downloadUrl: null,
      retryCount: 0,
    });
  }

  // 任务属于真实用户时，必须鉴权且匹配
  if (taskWithOwner.userId !== 'anon') {
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Sign in or use Authorization: Bearer we_xxx' },
        { status: 401 }
      );
    }
    if (taskWithOwner.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({
    taskId: id,
    ...taskWithOwner.status,
  });
}
