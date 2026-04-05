/**
 * GET /api/clone/[id]/files
 * 返回克隆任务生成的项目文件列表，供 /generate 页面加载
 */

import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { getTaskStatusWithOwner } from '@/lib/task-store';
import { getAuthUserId } from '@/lib/api-auth';

async function readDirRecursive(dir: string, base: string): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  const skipDirs = new Set(['node_modules', '.next', '.git', '__pycache__']);

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const relPath = path.relative(base, fullPath);
        // Only include source files
        const ext = path.extname(entry.name).toLowerCase();
        if (['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.html', '.mjs', '.env.example'].includes(ext)
            || entry.name === 'package.json'
            || entry.name === 'tsconfig.json'
            || entry.name === 'next.config.ts'
            || entry.name === 'next.config.js'
            || entry.name === 'tailwind.config.ts'
            || entry.name === 'tailwind.config.js'
            || entry.name === 'postcss.config.mjs') {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            files.push({ path: relPath, content });
          } catch {
            // skip unreadable files
          }
        }
      }
    }
  }

  await walk(dir);
  return files;
}

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
      { error: 'Clone task not found or not completed' },
      { status: 404 }
    );
  }

  // 鉴权：真实用户必须登录且匹配
  if (taskWithOwner!.userId !== 'anon') {
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (taskWithOwner!.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // 尝试从本地项目目录读取文件
  const projectDir = path.join(os.tmpdir(), `ch007ai-clone-${id}`);

  try {
    const stat = await fs.stat(projectDir);
    if (stat.isDirectory()) {
      const files = await readDirRecursive(projectDir, projectDir);
      if (files.length > 0) {
        return NextResponse.json({
          taskId: id,
          source: 'local',
          files,
        });
      }
    }
  } catch {
    // 本地目录不存在，继续尝试从 ZIP 读取
  }

  // 如果本地文件不可用，返回提示让用户通过下载获取
  return NextResponse.json({
    taskId: id,
    source: 'unavailable',
    files: [],
    message: 'Project files no longer available in memory. The code may only be available as a ZIP download.',
  });
}
