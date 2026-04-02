/**
 * 组件代码生成 - 调用 Claude API
 */

import { getClaudeClient } from '@/lib/claude/client';
import { PROMPTS } from '@/lib/claude/prompts';
import type { PageBlock } from '@/types/analyzer';

export async function generateComponent(
  block: PageBlock,
  colorTheme: { primary?: string; background?: string; text?: string },
  targetLanguage: 'original' | 'zh' | 'en' = 'original'
): Promise<string> {
  const client = getClaudeClient();
  const langHint =
    targetLanguage === 'zh'
      ? 'All UI text must be in Chinese (中文).'
      : targetLanguage === 'en'
        ? 'All UI text must be in English.'
        : 'Keep UI text in the original language of the source.';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${PROMPTS.componentGeneration}

Block to generate:
- Type: ${block.type}
- Title: ${block.title}
- Description: ${block.description}

Design tokens to use:
- Primary color: ${colorTheme.primary ?? '#4F7EFF'}
- Background: ${colorTheme.background ?? '#ffffff'}
- Text: ${colorTheme.text ?? '#1a1a1a'}

Language: ${langHint}

Generate a single React component file. Export as default. Use 'use client' if interactivity needed.`,
      },
    ],
  });

  const text =
    response.content?.[0]?.type === 'text'
      ? (response.content[0] as { type: 'text'; text: string }).text
      : '';

  // Extract code block if wrapped in ```
  const codeMatch = text.match(/```(?:tsx?|jsx?)?\s*([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : text.trim();

  if (!code.includes('export')) {
    return `'use client';\n\nexport default function ${block.type.replace(/\s/g, '')}() {\n  return (\n    <section className="py-12 px-4">\n      <h2 className="text-2xl font-bold">${block.title}</h2>\n      <p className="text-gray-600 mt-2">${block.description}</p>\n    </section>\n  );\n}\n`;
  }

  return code;
}
