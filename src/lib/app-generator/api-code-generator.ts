/**
 * API 代码生成 - 根据流量抓包端点生成 TypeScript 调用层
 * 用于 APP 克隆流量模式
 */

import { getClaudeClient } from '@/lib/claude/client';
import { PROMPTS } from '@/lib/claude/prompts';
import type { ApiEndpoint } from '@/types/app-analyzer';

export interface ApiCodeResult {
  servicesCode: string;
  typesCode: string;
}

export async function generateApiCode(endpoints: ApiEndpoint[]): Promise<ApiCodeResult> {
  if (endpoints.length === 0) {
    return {
      servicesCode: getDefaultServicesCode(),
      typesCode: getDefaultTypesCode(),
    };
  }

  const summary = endpoints
    .slice(0, 15)
    .map(
      (e) =>
        `${e.method} ${e.path}${e.inferredName ? ` (${e.inferredName})` : ''} -> ${(e.responseBody ?? '').slice(0, 300)}`
    )
    .join('\n\n');

  const client = getClaudeClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${PROMPTS.trafficApiCodeGeneration}

API 端点摘要：
${summary}

请分两个代码块输出：
1. 第一个 \`\`\`ts 块：services/api.ts 完整内容，每个端点一个 async 函数
2. 第二个 \`\`\`ts 块：types/api.ts 完整内容，根据响应推断类型`,
      },
    ],
  });

  const text =
    response.content?.[0]?.type === 'text'
      ? (response.content[0] as { type: 'text'; text: string }).text
      : '';

  let servicesCode = getDefaultServicesCode();
  let typesCode = getDefaultTypesCode();

  const codeBlocks = text.match(/```(?:ts|typescript)?\s*([\s\S]*?)```/g);
  if (codeBlocks) {
    const blocks = codeBlocks.map((b) =>
      b.replace(/```(?:ts|typescript)?\s*/, '').replace(/```$/, '').trim()
    );
    if (blocks.length >= 1) servicesCode = blocks[0];
    if (blocks.length >= 2) typesCode = blocks[1];
  }

  return { servicesCode, typesCode };
}

function getDefaultServicesCode(): string {
  return `/**
 * API 服务层 - 由 WebEcho AI 根据流量抓包生成
 */

const BASE_URL = '';

export async function getBaseUrl(): Promise<string> {
  return BASE_URL;
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : \`\${BASE_URL}\${path}\`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(\`API error \${res.status}\`);
  return res.json();
}
`;
}

function getDefaultTypesCode(): string {
  return `/**
 * API 类型定义
 */

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
`;
}
