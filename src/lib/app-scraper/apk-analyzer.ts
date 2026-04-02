/**
 * APK 分析模块 - 第四阶段模式二
 * 使用 apktool 反编译 APK，提取布局 XML，Claude 分析后输出界面结构
 * 需配置 APKTOOL_PATH 或系统 PATH 中有 apktool
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { getClaudeClient } from '@/lib/claude/client';
import { PROMPTS } from '@/lib/claude/prompts';
import { downloadApkFromR2 } from '@/lib/storage/r2';
import type { AppScreenAnalysis } from '@/types/app-analyzer';

const APKTOOL_PATH = process.env.APKTOOL_PATH ?? 'apktool';
const MAX_LAYOUT_SIZE = 200_000; // 单文件约 200KB，避免 token 超限

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function findLayoutXmls(dir: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'values' && e.name.startsWith('values')) {
          await walk(full);
        } else if (e.name === 'layout' || e.name.startsWith('layout')) {
          const items = await fs.readdir(full);
          for (const f of items) {
            if (f.endsWith('.xml')) files.push(path.join(full, f));
          }
        }
      }
    }
  }
  const resDir = path.join(dir, 'res');
  try {
    await fs.access(resDir);
    await walk(resDir);
  } catch {
    // res 可能不存在
  }
  return files;
}

async function readStringsXml(dir: string): Promise<string> {
  const valuesDir = path.join(dir, 'res', 'values');
  try {
    const content = await fs.readFile(path.join(valuesDir, 'strings.xml'), 'utf-8');
    return content.slice(0, 15000);
  } catch {
    return '';
  }
}

/**
 * 使用 apktool 反编译 APK
 * @returns 解压输出目录，失败时抛出
 */
async function decompileApk(apkPath: string): Promise<string> {
  const outDir = path.join(os.tmpdir(), `webecho-apk-${Date.now()}`);
  await ensureDir(outDir);

  const result = spawnSync(APKTOOL_PATH, ['d', apkPath, '-o', outDir, '-f'], {
    encoding: 'utf-8',
    timeout: 120_000,
  });

  if (result.status !== 0) {
    const err = result.stderr || result.stdout || 'apktool failed';
    throw new Error(`apktool decompile failed: ${String(err).slice(0, 500)}`);
  }
  return outDir;
}

/**
 * 从 R2 下载 APK，反编译并分析布局
 * @param r2Key - R2 中 APK 的 object key
 */
export async function analyzeApk(r2Key: string): Promise<AppScreenAnalysis> {
  const buffer = await downloadApkFromR2(r2Key);
  const apkPath = path.join(os.tmpdir(), `webecho-${Date.now()}.apk`);
  try {
    await fs.writeFile(apkPath, buffer);
    const outDir = await decompileApk(apkPath);

    try {
      const layoutFiles = await findLayoutXmls(outDir);
      const layoutContents: string[] = [];
      let totalSize = 0;
      for (const f of layoutFiles.slice(0, 15)) {
        const content = await fs.readFile(f, 'utf-8');
        if (totalSize + content.length > MAX_LAYOUT_SIZE) break;
        layoutContents.push(`\n--- ${path.basename(f)} ---\n${content}`);
        totalSize += content.length;
      }

      const stringsContent = await readStringsXml(outDir);
      const layoutBlock =
        layoutContents.length > 0
          ? layoutContents.join('\n')
          : '(未找到 layout XML，可能为纯代码布局)';
      const stringsBlock = stringsContent
        ? `\n--- strings.xml (部分) ---\n${stringsContent}`
        : '';

      const client = getClaudeClient();
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPTS.apkLayoutAnalysis },
              {
                type: 'text',
                text: `请根据以下 Android 布局 XML 分析界面结构：\n${layoutBlock}${stringsBlock}`,
              },
            ],
          },
        ],
      });

      const text =
        response.content?.[0]?.type === 'text'
          ? (response.content[0] as { type: 'text'; text: string }).text
          : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;

      const parsed = JSON.parse(jsonStr) as AppScreenAnalysis;
      if (!parsed.screens?.length) {
        parsed.screens = [{ name: 'MainScreen', blocks: [] }];
      }
      parsed.colorTheme = parsed.colorTheme ?? {
        primary: '#4F7EFF',
        background: '#ffffff',
        text: '#1a1a1a',
      };
      parsed.navigationType = parsed.navigationType ?? 'stack';
      parsed.platform = 'android';
      return parsed;
    } finally {
      await fs.rm(outDir, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(apkPath, { force: true });
  }
}
