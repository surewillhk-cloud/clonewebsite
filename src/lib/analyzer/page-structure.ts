/**
 * 页面结构分析 - 调用 Claude API
 */

import { getClaudeClient } from '@/lib/claude/client';
import { PROMPTS } from '@/lib/claude/prompts';
import type { ScrapeResult } from '@/types/scrape';
import type { PageStructureResult } from '@/types/analyzer';

export async function analyzePageStructure(
  scrapeResult: ScrapeResult
): Promise<PageStructureResult> {
  const client = getClaudeClient();
  const { html, markdown, url, partial } = scrapeResult;

  // 层3 降级：仅有 URL，使用推断专用 prompt
  const useInferPrompt = partial && (!html || html.length < 200) && url;

  const input = html || markdown || 'No content available';
  const truncated = input.length > 50000 ? input.slice(0, 50000) + '\n...[truncated]' : input;

  const prompt = useInferPrompt
    ? `${PROMPTS.pageStructureInferFromUrl}\n\n---\n\nURL: ${url}\n${input}`
    : `${PROMPTS.pageStructureAnalysis}\n\n---\n\nContent to analyze:\n\n${truncated}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const text =
    response.content?.[0]?.type === 'text'
      ? (response.content[0] as { type: 'text'; text: string }).text
      : '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON for page structure');
  }

  const parsed = JSON.parse(jsonMatch[0]) as PageStructureResult;

  if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
    parsed.blocks = [];
  }
  if (!parsed.colorTheme || typeof parsed.colorTheme !== 'object') {
    parsed.colorTheme = { primary: '#4F7EFF', background: '#ffffff', text: '#1a1a1a' };
  }
  if (!parsed.fontFamily) {
    parsed.fontFamily = 'Inter';
  }
  if (!parsed.detectedServices || !Array.isArray(parsed.detectedServices)) {
    parsed.detectedServices = [];
  }
  if (
    !['static_single', 'static_multi', 'dynamic_basic', 'dynamic_complex'].includes(
      parsed.complexity
    )
  ) {
    parsed.complexity = 'static_single';
  }

  return parsed;
}
