/**
 * 根据构建错误修复生成的项目代码
 * 调用 Claude API 分析错误并产出修复后的文件内容
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getClaudeClient } from '@/lib/claude/client';
import { PROMPTS } from '@/lib/claude/prompts';

export interface FixResult {
  fixed: boolean;
  filesModified: string[];
  error?: string;
}

/** 收集项目中所有源码文件的路径和内容 */
async function collectSourceFiles(
  projectPath: string
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];
  const appDir = path.join(projectPath, 'app');
  const componentsDir = path.join(projectPath, 'components');

  const collectDir = async (dir: string, prefix: string) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const relPath = `${prefix}/${e.name}`;
        if (e.isFile() && /\.(tsx?|jsx?)$/.test(e.name)) {
          const content = await fs.readFile(path.join(dir, e.name), 'utf-8');
          files.push({ path: relPath.replace(/^\//, ''), content });
        } else if (e.isDirectory()) {
          await collectDir(path.join(dir, e.name), relPath);
        }
      }
    } catch {
      // Dir may not exist
    }
  };

  await collectDir(appDir, 'app');
  await collectDir(componentsDir, 'components');
  return files;
}

/** 从 Claude 响应中解析 JSON 数组 */
function parseFixResponse(text: string): Array<{ path: string; content: string }> {
  const trimmed = text.trim();
  let jsonStr = trimmed;

  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    jsonStr = codeMatch[1].trim();
  } else if (trimmed.startsWith('[')) {
    const end = trimmed.lastIndexOf(']');
    if (end >= 0) jsonStr = trimmed.slice(0, end + 1);
  }

  try {
    const arr = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.path === 'string' && typeof x.content === 'string')
      .map((x) => ({ path: String(x.path).replace(/^\.\//, ''), content: String(x.content) }));
  } catch {
    return [];
  }
}

/**
 * 根据构建错误修复项目中的代码
 * @param projectPath 项目目录
 * @param buildError 构建错误输出（stderr + stdout）
 */
export async function fixCodeFromBuildError(
  projectPath: string,
  buildError: string
): Promise<FixResult> {
  const sourceFiles = await collectSourceFiles(projectPath);
  if (sourceFiles.length === 0) {
    return { fixed: false, filesModified: [], error: 'No source files found' };
  }

  const client = getClaudeClient();
  const filesContext = sourceFiles
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `${PROMPTS.buildFix}

构建错误：
\`\`\`
${buildError.slice(0, 4000)}
\`\`\`

当前项目文件：
${filesContext.slice(0, 30000)}

请输出需要修复的文件，格式为 JSON 数组：[{"path":"app/page.tsx","content":"...完整内容..."}]`,
      },
    ],
  });

  const text =
    response.content?.[0]?.type === 'text'
      ? (response.content[0] as { type: 'text'; text: string }).text
      : '';

  const fixes = parseFixResponse(text);
  if (fixes.length === 0) {
    return {
      fixed: false,
      filesModified: [],
      error: 'Claude did not return valid file fixes',
    };
  }

  const validPaths = new Set(
    sourceFiles.map((f) => f.path.replace(/\\/g, '/'))
  );
  const filesModified: string[] = [];

  for (const fix of fixes) {
    const normalizedPath = fix.path.replace(/\\/g, '/').replace(/\.\./g, '');
    const fullPath = path.resolve(projectPath, normalizedPath);

    if (!fullPath.startsWith(path.resolve(projectPath))) {
      console.warn('[code-fixer] Path traversal attempt blocked:', normalizedPath);
      continue;
    }

    if (!validPaths.has(normalizedPath)) {
      const allowed = [...validPaths].some(
        (p) => normalizedPath === p || normalizedPath.startsWith(p + '/')
      );
      if (!allowed) {
        console.warn('[code-fixer] Path not in valid paths:', normalizedPath);
        continue;
      }
    }

    try {
      const parentDir = path.dirname(fullPath);
      await fs.mkdir(parentDir, { recursive: true });
      await fs.writeFile(fullPath, fix.content, 'utf-8');
      filesModified.push(normalizedPath);
    } catch (err) {
      console.error('[code-fixer] Failed to write', normalizedPath, err);
    }
  }

  return {
    fixed: filesModified.length > 0,
    filesModified,
  };
}
