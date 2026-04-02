/**
 * 克隆预览服务器
 * 解压 zip、启动 Next.js dev 服务器，供内嵌浏览器预览
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn, type ChildProcess } from 'child_process';
import extract from 'extract-zip';
import { getTaskStatus } from '@/lib/task-store';
import { isR2Configured, downloadZipFromR2 } from '@/lib/storage/r2';

const PREVIEW_PORT_START = 4100;
const PREVIEW_PORT_MAX = 4199;
const MAX_WAIT_MS = 120000; // 2 分钟
const POLL_MS = 500;

const activePreviews = new Map<
  string,
  { process: ChildProcess; port: number; extractDir: string }
>();

/** 获取下一个可用端口 */
function nextPort(): number {
  const used = new Set(Array.from(activePreviews.values()).map((p) => p.port));
  for (let p = PREVIEW_PORT_START; p <= PREVIEW_PORT_MAX; p++) {
    if (!used.has(p)) return p;
  }
  throw new Error('No preview ports available');
}

/** 检查端口是否已就绪 */
async function isPortReady(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

/** 等待服务器启动 */
async function waitForServer(port: number): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (await isPortReady(port)) return;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error('Preview server failed to start in time');
}

/**
 * 启动预览服务器
 * 返回可访问的 URL (http://127.0.0.1:port)
 */
export async function startPreviewServer(taskId: string): Promise<string> {
  const existing = activePreviews.get(taskId);
  if (existing) {
    return `http://127.0.0.1:${existing.port}`;
  }

  const status = await getTaskStatus(taskId);
  if (!status || status.status !== 'done') {
    throw new Error('Task not ready for preview');
  }

  let zipBuffer: Buffer;
  if (status.r2Key && isR2Configured()) {
    zipBuffer = await downloadZipFromR2(status.r2Key);
  } else if (status.localZipPath) {
    zipBuffer = await fs.readFile(status.localZipPath);
  } else {
    throw new Error('No zip available for preview. Configure R2 or ensure local zip exists.');
  }

  const extractDir = path.join(os.tmpdir(), `webecho-preview-${taskId}-${Date.now()}`);
  await fs.mkdir(extractDir, { recursive: true });

  const zipPath = path.join(extractDir, 'clone.zip');
  await fs.writeFile(zipPath, zipBuffer);

  try {
    await extract(zipPath, { dir: extractDir });
  } finally {
    await fs.unlink(zipPath).catch(() => {});
  }

  const projectDir = path.join(extractDir, 'cloned-site');
  const stat = await fs.stat(projectDir).catch(() => null);
  const workDir = stat?.isDirectory() ? projectDir : extractDir;

  const port = nextPort();

  // 先执行 npm install
  await new Promise<void>((resolve, reject) => {
    const install = spawn('npm', ['install'], {
      cwd: workDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let err = '';
    install.stderr?.on('data', (chunk: Buffer) => { err += chunk.toString(); });
    install.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install failed: ${code}\n${err.slice(-500)}`));
    });
    install.on('error', reject);
  });

  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'dev', '--', '-p', String(port), '-H', '127.0.0.1'], {
      cwd: workDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
    });

    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      cleanup();
      reject(err);
    });

    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        cleanup();
        reject(new Error(`Preview server exited: ${code}\n${stderr.slice(-500)}`));
      }
    });

    const url = `http://127.0.0.1:${port}`;
    activePreviews.set(taskId, { process: proc, port, extractDir });

    function cleanup() {
      const entry = activePreviews.get(taskId);
      if (entry) {
        activePreviews.delete(taskId);
        try {
          entry.process.kill('SIGKILL');
        } catch {}
        fs.rm(entry.extractDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    // 等待服务器就绪
    waitForServer(port)
      .then(() => resolve(url))
      .catch((err) => {
        cleanup();
        reject(err);
      });
  });
}

/** 停止预览服务器 */
export async function stopPreviewServer(taskId: string): Promise<void> {
  const entry = activePreviews.get(taskId);
  if (!entry) return;

  activePreviews.delete(taskId);
  try {
    entry.process.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 1000));
    entry.process.kill('SIGKILL');
  } catch {}
  await fs.rm(entry.extractDir, { recursive: true, force: true }).catch(() => {});
}
