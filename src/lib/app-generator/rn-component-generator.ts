/**
 * React Native 组件代码生成
 * 根据 APP 界面分析结果生成 RN 组件
 */

import { getClaudeClient } from '@/lib/claude/client';
import { PROMPTS } from '@/lib/claude/prompts';
import type { AppScreenBlock } from '@/types/app-analyzer';

export async function generateRNComponent(
  block: AppScreenBlock,
  colorTheme: { primary?: string; background?: string; text?: string }
): Promise<string> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${PROMPTS.rnComponentGeneration}

Block to generate:
- Type: ${block.type}
- Title: ${block.title}
- Description: ${block.description}

Design tokens:
- Primary color: ${colorTheme.primary ?? '#4F7EFF'}
- Background: ${colorTheme.background ?? '#ffffff'}
- Text color: ${colorTheme.text ?? '#1a1a1a'}

Generate a single React Native component. Export as default.`,
      },
    ],
  });

  const text =
    response.content?.[0]?.type === 'text'
      ? (response.content[0] as { type: 'text'; text: string }).text
      : '';

  const codeMatch = text.match(/```(?:tsx?|jsx?)?\s*([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : text.trim();

  if (!code.includes('export')) {
    return `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ${block.type.replace(/\s/g, '')}() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${block.title}</Text>
      <Text style={styles.desc}>${block.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  desc: { fontSize: 14, color: '#666', marginTop: 4 },
});`;
  }

  return code;
}
