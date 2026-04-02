/**
 * 流量抓包模块 - APP 克隆模式三
 * 在 Android 模拟器中运行 APK，通过 mitmproxy 拦截网络请求，提取 API 端点
 * 需配置 Docker 并构建 docker/Dockerfile.android 镜像
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { downloadApkFromR2 } from '@/lib/storage/r2';
import { getClaudeClient } from '@/lib/claude/client';
import { PROMPTS } from '@/lib/claude/prompts';
import type { ApiEndpoint } from '@/types/app-analyzer';

const ANDROID_IMAGE = process.env.ANDROID_EMULATOR_IMAGE ?? 'webecho-android';
const CAPTURE_DURATION_SEC = parseInt(process.env.TRAFFIC_CAPTURE_DURATION ?? '90', 10);

export interface TrafficCaptureResult {
  endpoints: ApiEndpoint[];
  captureLog?: string;
}

/** 检查流量抓包是否可用（Docker + Android 镜像存在） */
export async function isTrafficCaptureAvailable(): Promise<boolean> {
  const hasDocker = await new Promise<boolean>((resolve) => {
    const proc = spawn('docker', ['info'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
    proc.stderr?.on('data', () => {});
  });
  if (!hasDocker) return false;
  const hasImage = await new Promise<boolean>((resolve) => {
    const proc = spawn('docker', ['image', 'inspect', ANDROID_IMAGE], {
      stdio: 'pipe',
    });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
    proc.stderr?.on('data', () => {});
  });
  return hasImage;
}

/**
 * 从 APK 抓取流量，提取 API 端点列表
 * @param r2Key R2 中 APK 的 object key
 * @param taskId 任务 ID，用于临时目录
 */
export async function captureTrafficFromApk(
  r2Key: string,
  taskId: string
): Promise<TrafficCaptureResult> {
  const available = await isTrafficCaptureAvailable();
  if (!available) {
    throw new Error(
      `APP clone (traffic mode) requires Docker with Android emulator image. ` +
        `Build: docker build -f docker/Dockerfile.android -t ${ANDROID_IMAGE} . ` +
        `Set ANDROID_EMULATOR_IMAGE if using a different image name.`
    );
  }

  const workDir = path.join(os.tmpdir(), `webecho-traffic-${taskId}`);
  const apkPath = path.join(workDir, 'app.apk');
  const outputDir = path.join(workDir, 'output');

  try {
    await fs.mkdir(outputDir, { recursive: true });

    const buffer = await downloadApkFromR2(r2Key);
    await fs.writeFile(apkPath, buffer);

    const result = await runDockerCapture(apkPath, outputDir, taskId);

    const flowsPath = path.join(outputDir, 'flows.jsonl');
    let endpoints: ApiEndpoint[] = [];
    try {
      const content = await fs.readFile(flowsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const rawFlows = lines.map((line) => {
        try {
          return JSON.parse(line) as RawFlow;
        } catch {
          return null;
        }
      }).filter(Boolean) as RawFlow[];

      endpoints = rawFlows
        .filter((f) => isLikelyApi(f))
        .map(flowToApiEndpoint)
        .slice(0, 30); // 最多 30 个 API，避免 token 超限

      if (endpoints.length > 0) {
        endpoints = await inferEndpointNames(endpoints);
      }
    } catch (e) {
      console.warn('[traffic-capture] Failed to parse flows.jsonl:', e);
    }

    return { endpoints, captureLog: result.output };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

interface RawFlow {
  url: string;
  method: string;
  path: string;
  requestBody?: string;
  responseBody?: string;
  responseStatus?: number;
}

function isLikelyApi(f: RawFlow): boolean {
  const url = f.url.toLowerCase();
  // 排除明显非 API
  if (url.includes('google.com') && !url.includes('/api/')) return false;
  if (url.includes('analytics') || url.includes('crashlytics')) return false;
  if (url.includes('firebase') && url.includes('perf')) return false;
  if (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.map')) return false;
  const status = f.responseStatus ?? 0;
  return status >= 200 && status < 500;
}

function flowToApiEndpoint(f: RawFlow): ApiEndpoint {
  const u = new URL(f.url);
  const queryParams: Record<string, string> = {};
  u.searchParams.forEach((v, k) => {
    queryParams[k] = v;
  });
  return {
    url: f.url,
    method: f.method,
    path: f.path,
    queryParams: Object.keys(queryParams).length ? queryParams : undefined,
    requestBody: f.requestBody || undefined,
    responseBody: f.responseBody || undefined,
    responseStatus: f.responseStatus,
  };
}

async function inferEndpointNames(endpoints: ApiEndpoint[]): Promise<ApiEndpoint[]> {
  const client = getClaudeClient();
  const summary = endpoints
    .slice(0, 20)
    .map((e) => `${e.method} ${e.path} -> ${(e.responseBody ?? '').slice(0, 200)}`)
    .join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${PROMPTS.trafficApiInferNames}

API 列表摘要：
${summary}

输出 JSON 数组，每项 { "path": "原始path", "inferredName": "camelCase名称" }，仅包含需要命名的项。`,
        },
      ],
    });

    const text =
      response.content?.[0]?.type === 'text'
        ? (response.content[0] as { type: 'text'; text: string }).text
        : '';
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const names = JSON.parse(jsonMatch[0]) as { path: string; inferredName: string }[];
      const map = new Map(names.map((n) => [n.path, n.inferredName]));
      return endpoints.map((e) => ({
        ...e,
        inferredName: map.get(e.path) ?? pathToName(e.path),
      }));
    }
  } catch (e) {
    console.warn('[traffic-capture] Claude infer names failed:', e);
  }
  return endpoints.map((e) => ({
    ...e,
    inferredName: pathToName(e.path),
  }));
}

function pathToName(p: string): string {
  const parts = p.split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? 'endpoint';
  return last.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_') || 'api';
}

async function runDockerCapture(
  apkPath: string,
  outputDir: string,
  taskId: string
): Promise<{ output: string; success: boolean }> {
  return new Promise((resolve) => {
    const args = [
      'run',
      '--rm',
      '-v',
      `${apkPath}:/apk/app.apk:ro`,
      '-v',
      `${outputDir}:/output`,
      '-e',
      `CAPTURE_DURATION=${CAPTURE_DURATION_SEC}`,
      ANDROID_IMAGE,
    ];

    const proc = spawn('docker', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      resolve({
        output: stdout + stderr,
        success: code === 0,
      });
    });

    proc.on('error', (err) => {
      resolve({
        output: err.message,
        success: false,
      });
    });
  });
}
