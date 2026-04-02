/**
 * POST /api/clone/[id]/preview-session
 * 创建克隆预览的内嵌浏览器 Session
 * 优先使用已部署的 URL，否则启动本地预览服务器
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { query, isDbConfigured } from '@/lib/db';
import { createSession } from '@/lib/browser-session';
import { startPreviewServer } from '@/lib/preview-server';
import { getTaskStatusWithOwner } from '@/lib/task-store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskWithOwner = await getTaskStatusWithOwner(taskId);
    if (!taskWithOwner || taskWithOwner.status.status !== 'done') {
      return NextResponse.json(
        { error: 'Task not ready for preview' },
        { status: 400 }
      );
    }
    if (taskWithOwner.userId !== 'anon' && taskWithOwner.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let targetUrl: string;

    // 优先使用已部署的站点 URL
    if (isDbConfigured()) {
      const { rows: [hosted] } = await query<{ railway_deployment_url: string | null; status: string }>(
        'SELECT railway_deployment_url, status FROM hosted_sites WHERE clone_task_id = $1 AND user_id = $2 AND status = $3 LIMIT 1',
        [taskId, userId, 'active']
      );

      const deploymentUrl = hosted?.railway_deployment_url ?? undefined;
      if (deploymentUrl) {
        targetUrl = deploymentUrl;
      } else {
        targetUrl = await startPreviewServer(taskId);
      }
    } else {
      targetUrl = await startPreviewServer(taskId);
    }

    const session = await createSession(userId, targetUrl, 'preview', {
      taskId,
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      targetUrl: session.targetUrl,
      purpose: 'preview',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/clone/preview-session]', err);
    return NextResponse.json(
      {
        error: msg.includes('No zip available')
          ? '预览需要 R2 存储或本地 zip，请先完成克隆'
          : msg,
      },
      { status: 500 }
    );
  }
}
