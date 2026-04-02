/**
 * 根据构建错误修复生成的项目代码
 * 调用 AI API 分析错误并产出修复后的文件内容
 * 支持多模型：Claude, OpenAI, Gemini, Groq
 * 使用 Edit Intent 分析选择最佳修复策略
 * 支持 Morph 风格的 XML 格式编辑
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getAIClient, getDefaultProvider, type AIChatMessage } from '@/lib/ai/provider-manager';
import { analyzeEditIntent, getFixStrategyForIntent, type EditType } from '@/lib/ai/edit-intent-analyzer';
import { parseMorphEdits, applyMorphEdits, type MorphEditBlock } from '@/lib/ai/morph-edit';
import { PROMPTS } from '@/lib/claude/prompts';

export interface FixResult {
  fixed: boolean;
  filesModified: string[];
  error?: string;
  intent?: {
    type: EditType;
    confidence: number;
    reasoning: string;
  };
}

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
    } catch {}
  };

  await collectDir(appDir, 'app');
  await collectDir(componentsDir, 'components');
  return files;
}

function parseFixResponse(text: string): Array<{ path: string; content: string }> {
  const morphEdits = parseMorphEdits(text);
  if (morphEdits.length > 0) {
    return morphEdits.map(e => ({
      path: e.targetFile,
      content: e.update,
    }));
  }

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

export async function fixCodeFromBuildError(
  projectPath: string,
  buildError: string
): Promise<FixResult> {
  const sourceFiles = await collectSourceFiles(projectPath);
  if (sourceFiles.length === 0) {
    return { fixed: false, filesModified: [], error: 'No source files found' };
  }

  const errorType = detectErrorType(buildError);
  const intent = await analyzeEditIntent(buildError, errorType);
  const provider = getDefaultProvider();
  const client = getAIClient(provider);

  console.log(`[code-fixer] Detected intent: ${intent.type} (${intent.confidence})`);

  const fixStrategy = getFixStrategyForIntent(intent);

  const filesContext = sourceFiles
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');

  const errorSlice = buildError.slice(0, 4000);
  const contextSlice = filesContext.slice(0, 30000);

  let prompt: string;
  let messages: AIChatMessage[];

  if (provider === 'anthropic') {
    messages = [
      {
        role: 'user',
        content: `${fixStrategy}

构建错误：
\`\`\`
${errorSlice}
\`\`\`

当前项目文件：
${contextSlice}

请使用以下格式之一输出修复内容：

格式1 - JSON数组：
[{"path":"app/page.tsx","content":"...完整内容..."}]

格式2 - Morph XML格式：
<edit target_file="app/page.tsx">
// 精确的代码修改
</edit>

请输出需要修复的文件。`,
      },
    ];
  } else {
    prompt = `${fixStrategy}

构建错误：
\`\`\`
${errorSlice}
\`\`\`

当前项目文件：
${contextSlice}

请使用以下格式之一输出修复内容：

格式1 - JSON数组：
[{"path":"app/page.tsx","content":"...完整内容..."}]

格式2 - Morph XML格式：
<edit target_file="app/page.tsx">
// 精确的代码修改
</edit>

请输出需要修复的文件。`;
    messages = [{ role: 'user', content: prompt }];
  }

  try {
    const response = await client.chat(messages, {
      model: provider === 'anthropic' ? 'claude-sonnet-4-20250514' : undefined,
      temperature: 0.3,
      maxTokens: 8192,
    });

    const fixes = parseFixResponse(response);
    if (fixes.length === 0) {
      return {
        fixed: false,
        filesModified: [],
        error: 'AI did not return valid file fixes',
        intent: { type: intent.type, confidence: intent.confidence, reasoning: intent.reasoning },
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
      intent: { type: intent.type, confidence: intent.confidence, reasoning: intent.reasoning },
    };
  } catch (err) {
    return {
      fixed: false,
      filesModified: [],
      error: err instanceof Error ? err.message : String(err),
      intent: { type: intent.type, confidence: intent.confidence, reasoning: intent.reasoning },
    };
  }
}

function detectErrorType(error: string): 'build' | 'typescript' | 'runtime' | 'other' {
  const msg = error.toLowerCase();

  if (msg.includes('typescript') || msg.includes('ts-') || msg.includes('type error')) {
    return 'typescript';
  }
  if (msg.includes('syntaxerror') || msg.includes('parseerror') || msg.includes('cannot find module')) {
    return 'build';
  }
  if (msg.includes('referenceerror') || msg.includes('undefined is not') || msg.includes('cannot read property')) {
    return 'runtime';
  }
  return 'other';
}
