/**
 * AI Provider Manager - 多模型支持工厂
 * 基于 Open Lovable 的 provider-manager.ts 模式
 * 支持: Claude, OpenAI, Gemini, Groq
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'openrouter';

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

interface AIProviderClient {
  provider: AIProvider;
  chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string>;
  chatStream?(messages: AIChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown>;
}

class AnthropicProvider implements AIProviderClient {
  provider: AIProvider = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string> {
    const system = options?.system || '';
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

    const response = await this.client.messages.create({
      model: options?.model || 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.7,
      system: system,
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async *chatStream(messages: AIChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.messages.stream({
      model: options?.model || 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.7,
      system: options?.system,
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}

class OpenAIProvider implements AIProviderClient {
  provider: AIProvider = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 4096,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    return response.choices[0]?.message?.content || '';
  }

  async *chatStream(messages: AIChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 4096,
      stream: true,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

class GeminiProvider implements AIProviderClient {
  provider: AIProvider = 'gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${options?.model || 'gemini-2.0-flash'}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          systemInstruction: options?.system ? { parts: [{ text: options.system }] } : undefined,
          generationConfig: {
            temperature: options?.temperature || 0.7,
            maxOutputTokens: options?.maxTokens || 4096,
          },
        }),
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

class GroqProvider implements AIProviderClient {
  provider: AIProvider = 'groq';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || 'llama-3.3-70b-versatile',
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4096,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *chatStream(messages: AIChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || 'llama-3.3-70b-versatile',
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4096,
        stream: true,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {}
        }
      }
    }
  }
}

class OpenRouterProvider implements AIProviderClient {
  provider: AIProvider = 'openrouter';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://ch007.ai',
        'X-Title': 'CH007',
      },
      body: JSON.stringify({
        model: options?.model || 'anthropic/claude-3.5-sonnet',
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4096,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *chatStream(messages: AIChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://ch007.ai',
        'X-Title': 'CH007',
      },
      body: JSON.stringify({
        model: options?.model || 'anthropic/claude-3.5-sonnet',
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4096,
        stream: true,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {}
        }
      }
    }
  }
}

const clientCache = new Map<string, { client: AIProviderClient; ts: number }>();
const CLIENT_CACHE_TTL_MS = 60 * 60 * 1000;
const CLIENT_CACHE_MAX_SIZE = 20;

export function getAIClient(provider: AIProvider, apiKey?: string): AIProviderClient {
  const cacheKey = `${provider}-${apiKey || 'default'}`;
  const now = Date.now();

  const cached = clientCache.get(cacheKey);
  if (cached && now - cached.ts < CLIENT_CACHE_TTL_MS) {
    return cached.client;
  }

  // Clean expired entries
  for (const [key, entry] of clientCache.entries()) {
    if (now - entry.ts > CLIENT_CACHE_TTL_MS) clientCache.delete(key);
  }

  // Cap size
  if (clientCache.size >= CLIENT_CACHE_MAX_SIZE) {
    const oldestKey = clientCache.keys().next().value;
    if (oldestKey) clientCache.delete(oldestKey);
  }

  let client: AIProviderClient;

  switch (provider) {
    case 'anthropic':
      client = new AnthropicProvider(apiKey || process.env.ANTHROPIC_API_KEY || '');
      break;
    case 'openai':
      client = new OpenAIProvider(apiKey || process.env.OPENAI_API_KEY || '');
      break;
    case 'gemini':
      client = new GeminiProvider(apiKey || process.env.GEMINI_API_KEY || '');
      break;
    case 'groq':
      client = new GroqProvider(apiKey || process.env.GROQ_API_KEY || '');
      break;
    case 'openrouter':
      client = new OpenRouterProvider(apiKey || process.env.OPENROUTER_API_KEY || '');
      break;
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }

  clientCache.set(cacheKey, { client, ts: now });
  return client;
}

export function getDefaultProvider(): AIProvider {
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.GROQ_API_KEY) return 'groq';
  return 'openrouter';
}

export function isProviderConfigured(provider: AIProvider): boolean {
  switch (provider) {
    case 'anthropic': return !!process.env.ANTHROPIC_API_KEY;
    case 'openai': return !!process.env.OPENAI_API_KEY;
    case 'gemini': return !!process.env.GEMINI_API_KEY;
    case 'groq': return !!process.env.GROQ_API_KEY;
    case 'openrouter': return !!process.env.OPENROUTER_API_KEY;
    default: return false;
  }
}

export const AVAILABLE_MODELS: Record<AIProvider, string[]> = {
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ],
  gemini: [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768',
  ],
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
    'google/gemini-2.0-flash',
    'meta-llama/llama-3.3-70b-instruct',
  ],
};
