/**
 * Docker 测试 - 在容器中验证生成的项目能成功构建
 * MVP：仅验证 npm install + npm run build 通过
 */

import { spawn } from 'child_process';
import * as path from 'path';

export interface DockerTestResult {
  passed: boolean;
  durationMs: number;
  output: string;
  error?: string;
}

/** 检查 Docker 是否可用 */
export async function isDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('docker', ['info'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
    proc.stderr?.on('data', () => {});
  });
}

/**
 * 在 Docker 中构建生成的项目
 * @param projectPath 生成的项目目录（含 package.json、app、components 等）
 * @param taskId 任务 ID，用于镜像标签
 */
export async function runDockerBuild(
  projectPath: string,
  taskId: string
): Promise<DockerTestResult> {
  const start = Date.now();
  const dockerfilePath = path.join(
    process.cwd(),
    'docker',
    'Dockerfile.test'
  );

  return new Promise((resolve) => {
    const args = [
      'build',
      '-f',
      dockerfilePath,
      '-t',
      `ch007-test-${taskId}`,
      '--no-cache',
      projectPath,
    ];

    const proc = spawn('docker', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (chunk) => {
      const s = chunk.toString();
      stdout += s;
    });
    proc.stderr?.on('data', (chunk) => {
      const s = chunk.toString();
      stderr += s;
    });

    proc.on('close', (code, signal) => {
      const durationMs = Date.now() - start;
      const passed = code === 0;
      resolve({
        passed,
        durationMs,
        output: stdout + stderr,
        error: passed ? undefined : stderr || stdout,
      });
    });

    proc.on('error', (err) => {
      resolve({
        passed: false,
        durationMs: Date.now() - start,
        output: '',
        error: err.message,
      });
    });
  });
}
