/**
 * POST /api/generate/stream
 * AI 代码流式生成 — 对话式生成 React 应用
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { getAIClient, getDefaultProvider } from '@/lib/ai/provider-manager';
import type { AIChatMessage } from '@/lib/ai/provider-manager';

const SYSTEM_PROMPT = `You are an expert React developer. Generate complete, working React applications based on user requests.

RULES:
1. Output each file wrapped in <file path="path/to/file.ext">...</file> tags
2. Use functional components with hooks
3. Use Tailwind CSS for styling (assume Tailwind is configured)
4. Make the app visually polished and production-ready
5. Include all necessary imports
6. For the main component, use App.jsx or App.tsx
7. Keep code concise but complete

FILE STRUCTURE EXAMPLE:
<file path="App.tsx">
import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <h1 className="text-3xl font-bold text-center py-8">Hello World</h1>
    </div>
  );
}
</file>

<file path="index.css">
@import "tailwindcss";
</file>

Respond with a brief explanation first, then the file blocks.`;

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { message, files } = body as { message: string; files?: { path: string; content: string }[] };

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    const provider = getDefaultProvider();
    const client = getAIClient(provider);

    if (!client.chatStream) {
      return NextResponse.json({ error: 'Streaming not supported for this provider' }, { status: 500 });
    }

    // Build conversation context
    const messages: AIChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add existing files as context
    if (files && files.length > 0) {
      const fileContext = files.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
      messages.push({
        role: 'system',
        content: `Current project files:\n\n${fileContext}\n\nModify or add files as needed. Only output files that need to be created or changed.`,
      });
    }

    messages.push({ role: 'user', content: message });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let fullContent = '';
          let inFileTag = false;
          let currentFilePath = '';
          let currentFileContent = '';
          let hasFiles = false;

          for await (const chunk of client.chatStream!(messages, {
            temperature: 0.7,
            maxTokens: 8192,
          })) {
            fullContent += chunk;

            // Stream conversational text
            send({ type: 'content', content: chunk });

            // Parse file tags in real-time
            const fileStartMatch = fullContent.match(/<file\s+path="([^"]+)">\s*$/);
            if (fileStartMatch && !inFileTag) {
              currentFilePath = fileStartMatch[1];
              inFileTag = true;
              currentFileContent = '';
              continue;
            }

            if (inFileTag) {
              const fileEndMatch = chunk.match(/<\/file>/);
              if (fileEndMatch) {
                const beforeEnd = chunk.slice(0, fileEndMatch.index);
                currentFileContent += beforeEnd;
                send({ type: 'file', path: currentFilePath, content: currentFileContent.trim() });
                hasFiles = true;
                inFileTag = false;
                currentFilePath = '';
                currentFileContent = '';
              } else {
                currentFileContent += chunk;
              }
            }
          }

          // If we have files, send completion event
          if (hasFiles || currentFilePath) {
            // Parse any remaining file tags from full content
            const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
            let match;
            const parsedFiles: { path: string; content: string }[] = [];
            while ((match = fileRegex.exec(fullContent)) !== null) {
              parsedFiles.push({ path: match[1], content: match[2].trim() });
            }

            if (parsedFiles.length > 0) {
              send({ type: 'files_complete', files: parsedFiles });
            } else {
              send({ type: 'files_complete', files: [] });
            }
          } else {
            send({ type: 'files_complete', files: [] });
          }

          controller.close();
        } catch (err) {
          send({
            type: 'error',
            message: err instanceof Error ? err.message : 'Generation failed',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[api/generate/stream]', err);
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    );
  }
}
