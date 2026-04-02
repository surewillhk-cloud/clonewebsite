/**
 * APP 截图分析 - Claude Vision
 * 分析用户上传的 APP 截图，输出界面结构供 React Native 生成
 */

import { getClaudeClient } from '@/lib/claude/client';
import { PROMPTS } from '@/lib/claude/prompts';
import type { AppScreenAnalysis } from '@/types/app-analyzer';

type AllowedMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

/** 解析 data URL 或 base64 字符串为 { mediaType, data } */
function parseImageInput(input: string): { mediaType: AllowedMediaType; data: string } {
  let mediaType: AllowedMediaType = 'image/png';
  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const raw = match[1].trim().toLowerCase();
      if (raw.includes('jpeg') || raw.includes('jpg')) mediaType = 'image/jpeg';
      else if (raw.includes('gif')) mediaType = 'image/gif';
      else if (raw.includes('webp')) mediaType = 'image/webp';
      return { mediaType, data: match[2].trim() };
    }
  }
  return { mediaType: 'image/png', data: input.replace(/^data:[^;]+;base64,/, '') };
}

/**
 * 分析多张 APP 截图，返回界面结构
 * @param screenshots - base64 或 data URL 格式的图片数组
 */
export async function analyzeAppScreenshots(
  screenshots: string[]
): Promise<AppScreenAnalysis> {
  if (!screenshots?.length) {
    throw new Error('At least one screenshot is required');
  }

  const client = getClaudeClient();

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: AllowedMediaType; data: string } }
  > = [
    { type: 'text', text: PROMPTS.appScreenshotAnalysis },
    {
      type: 'text',
      text: `请分析以下 ${screenshots.length} 张 APP 截图，识别界面结构并输出 JSON。`,
    },
  ];

  for (let i = 0; i < Math.min(screenshots.length, 5); i++) {
    const { mediaType, data } = parseImageInput(screenshots[i]);
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data },
    });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
  });

  const text =
    response.content?.[0]?.type === 'text'
      ? (response.content[0] as { type: 'text'; text: string }).text
      : '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;

  try {
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
    parsed.platform = parsed.platform ?? 'android';
    return parsed;
  } catch {
    throw new Error('Failed to parse APP screenshot analysis response');
  }
}
