/**
 * POST /api/clone/[id]/preview-session
 * 创建克隆预览的内嵌浏览器 Session
 * 优先使用已部署的 URL，否则启动本地预览服务器
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { createSession } from '@/lib/browser-session';
import { startPreviewServer } from '@/lib/preview-server';
import { getTaskStatusWithOwner } from '@/lib/task-store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskWithOwner = await getTaskStatusWithOwner(taskId);
    if (!taskWithOwner || taskWithOwner.status.status !== 'done') {
      return NextResponse.json(
        { error: 'Task not ready for preview' },
        { status: 400 }
      );
    }
    if (taskWithOwner.userId !== 'anon' && taskWithOwner.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let targetUrl: string;

    // 优先使用已部署的站点 URL
    if (isSupabaseConfigured()) {
      const admin = createAdminClient();
      const { data: hosted } = await (admin.from('hosted_sites') as any)
        .select('railway_deployment_url, status')
        .eq('clone_task_id', taskId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      const deploymentUrl = hosted?.railway_deployment_url as string | undefined;
      if (deploymentUrl) {
        targetUrl = deploymentUrl;
      } else {
        targetUrl = await startPreviewServer(taskId);
      }
    } else {
      targetUrl = await startPreviewServer(taskId);
    }

    const session = await createSession(user.id, targetUrl, 'preview', {
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
