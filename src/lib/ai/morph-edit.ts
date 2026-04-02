/**
 * Morph-style Exact Edit - 精确代码修改
 * 基于 Open Lovable 的 morph-fast-apply.ts 模式
 * 使用 XML 格式 <edit target_file="...">...</edit> 进行手术刀式代码修改
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface MorphEditBlock {
  targetFile: string;
  instructions: string;
  update: string;
  originalCode?: string;
}

const EDIT_BLOCK_REGEX = /<edit\s+target_file="([^"]+)"[^>]*>([\s\S]*?)<\/edit>/g;
const SIMPLE_FILE_REGEX = /<file\s+path="([^"]+)"[^>]*>([\s\S]*?)<\/file>/g;

export function parseMorphEdits(text: string): MorphEditBlock[] {
  const edits: MorphEditBlock[] = [];
  let match;

  EDIT_BLOCK_REGEX.lastIndex = 0;
  while ((match = EDIT_BLOCK_REGEX.exec(text)) !== null) {
    const targetFile = match[1];
    const content = match[2].trim();

    edits.push({
      targetFile,
      instructions: '',
      update: content,
    });
  }

  return edits;
}

export function parseFileBlocks(text: string): MorphEditBlock[] {
  const blocks: MorphEditBlock[] = [];
  let match;

  SIMPLE_FILE_REGEX.lastIndex = 0;
  while ((match = SIMPLE_FILE_REGEX.exec(text)) !== null) {
    const targetFile = match[1];
    const content = match[2];

    blocks.push({
      targetFile,
      instructions: '',
      update: content,
    });
  }

  return blocks;
}

export interface ApplyEditsOptions {
  projectPath: string;
  edits: MorphEditBlock[];
  dryRun?: boolean;
}

export interface ApplyEditsResult {
  success: boolean;
  filesModified: string[];
  errors: Array<{ file: string; error: string }>;
}

const VALID_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.json',
  '.css', '.scss', '.html',
];

const CONFIG_FILES = [
  'package.json', 'tsconfig.json', 'next.config.ts',
  'tailwind.config.ts', 'vite.config.ts', '.env',
];

export async function applyMorphEdits(
  options: ApplyEditsOptions
): Promise<ApplyEditsResult> {
  const { projectPath, edits, dryRun = false } = options;

  const filesModified: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const edit of edits) {
    let filePath = edit.targetFile;

    if (!path.isAbsolute(filePath)) {
      if (!filePath.startsWith('src/') && !filePath.startsWith('public/')) {
        filePath = 'src/' + filePath;
      }
      filePath = path.join(projectPath, filePath);
    }

    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.resolve(projectPath))) {
      errors.push({
        file: edit.targetFile,
        error: 'Path traversal attempt blocked',
      });
      continue;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const fileName = path.basename(normalizedPath);
    const isConfigFile = CONFIG_FILES.includes(fileName);

    if (!VALID_EXTENSIONS.includes(ext) && !isConfigFile) {
      errors.push({
        file: edit.targetFile,
        error: `Invalid file extension: ${ext}`,
      });
      continue;
    }

    try {
      const parentDir = path.dirname(normalizedPath);
      await fs.mkdir(parentDir, { recursive: true });

      let finalContent = edit.update;

      if (!dryRun) {
        const existingContent = await fs.readFile(normalizedPath, 'utf-8').catch(() => '');

        if (edit.instructions && !edit.update) {
          finalContent = await applyInstructionBasedEdit(
            existingContent,
            edit.instructions
          );
        }

        await fs.writeFile(normalizedPath, finalContent, 'utf-8');
      }

      const relativePath = path.relative(projectPath, normalizedPath);
      filesModified.push(relativePath);
    } catch (err) {
      errors.push({
        file: edit.targetFile,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    success: errors.length === 0,
    filesModified,
    errors,
  };
}

async function applyInstructionBasedEdit(
  originalCode: string,
  instructions: string
): Promise<string> {
  return originalCode;
}

export function generateMorphEditPrompt(
  filePath: string,
  errorContext: string,
  intent: string
): string {
  return `You are an expert Next.js developer. Fix the error in the specified file.

Target File: ${filePath}

Error Context:
${errorContext}

Intent: ${intent}

Generate a precise edit for this file. Use the following XML format:
<edit target_file="${filePath}">
// Exact code to replace or add
</edit>

Guidelines:
- Only output the XML edit block, nothing else
- Make minimal, surgical changes
- Preserve existing code structure
- Follow Next.js and React best practices
- Use Tailwind CSS for styling`;
}

export interface StreamingMorphOptions {
  projectPath: string;
  onProgress?: (progress: { file: string; status: 'editing' | 'done' | 'error'; error?: string }) => void;
}

export async function applyStreamingMorphEdits(
  aiOutput: AsyncGenerator<string, void, unknown>,
  options: StreamingMorphOptions
): Promise<ApplyEditsResult> {
  const { projectPath, onProgress } = options;

  const allEdits: MorphEditBlock[] = [];
  let buffer = '';

  for await (const chunk of aiOutput) {
    buffer += chunk;

    const edits = parseMorphEdits(buffer);
    for (const edit of edits) {
      const existing = allEdits.find(e => e.targetFile === edit.targetFile);
      if (!existing) {
        allEdits.push(edit);
        onProgress?.({ file: edit.targetFile, status: 'editing' });
      }
    }
  }

  return applyMorphEdits({ projectPath, edits: allEdits });
}

export function extractTargetFiles(text: string): string[] {
  const files = new Set<string>();

  let match;
  const regex = /<edit\s+target_file="([^"]+)"|<file\s+path="([^"]+)"/g;

  while ((match = regex.exec(text)) !== null) {
    files.add(match[1] || match[2]);
  }

  return Array.from(files);
}
