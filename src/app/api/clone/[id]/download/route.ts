/**
 * GET /api/clone/[id]/download
 * 返回预签名 R2 URL 或直接流式传输 zip 文件（MVP 本地模式）
 */

import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as os from 'os';
import { getTaskStatusWithOwner } from '@/lib/task-store';
import { getPresignedDownloadUrl } from '@/lib/storage/r2';
import { getAuthUserId } from '@/lib/api-auth';
import * as fs from 'fs/promises';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  const taskWithOwner = await getTaskStatusWithOwner(id);
  const status = taskWithOwner?.status;

  if (!status || status.status !== 'done') {
    return NextResponse.json(
      { error: 'Download not ready or task not found' },
      { status: 404 }
    );
  }

  // 任务属于真实用户时，必须鉴权且匹配
  if (taskWithOwner!.userId !== 'anon') {
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Sign in or use Authorization: Bearer we_xxx' },
        { status: 401 }
      );
    }
    if (taskWithOwner!.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (status.r2Key) {
    const downloadUrl = await getPresignedDownloadUrl(status.r2Key);
    return NextResponse.redirect(downloadUrl, 302);
  }

  if (status.downloadUrl) {
    return NextResponse.json({
      taskId: id,
      downloadUrl: status.downloadUrl,
      expiresIn: 3600,
    });
  }

  if (status.localZipPath) {
    try {
      // 防止路径遍历：仅允许 /tmp 下的 ch007 相关路径
      const resolved = path.resolve(status.localZipPath);
      const tmpDir = path.resolve(os.tmpdir());
      if (!resolved.startsWith(tmpDir) || !resolved.includes('ch007')) {
        throw new Error('Invalid path');
      }
      const stat = await fs.stat(resolved);
      if (!stat.isFile()) {
        throw new Error('Not a file');
      }
      const buffer = await fs.readFile(resolved);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="ch007-clone-${id}.zip"`,
          'Content-Length': String(buffer.length),
        },
      });
    } catch {
      return NextResponse.json(
        { error: 'Download file no longer available (expired). Configure R2 for persistent downloads.' },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Download not ready' },
    { status: 404 }
  );
}
