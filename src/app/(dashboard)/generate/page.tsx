'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { FileTree } from '@/components/generate/FileTree';
import { CodeViewer } from '@/components/generate/CodeViewer';
import { PreviewFrame } from '@/components/generate/PreviewFrame';
import { ChatPanel } from '@/components/generate/ChatPanel';
import { CodePreviewToggle } from '@/components/generate/CodePreviewToggle';

interface FileNode {
  name: string;
  path: string;
  content: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: { path: string; content: string }[];
}

export default function GeneratePage() {
  const t = useTranslation();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(420);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          files: files.map((f) => ({ path: f.path, content: f.content })),
          selectedFile,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, {
          id: `msg-${Date.now()}`,
          role: 'system',
          content: 'Failed to generate. Please try again.',
          timestamp: Date.now(),
        }]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let currentFiles: { path: string; content: string }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'content') {
              assistantContent += event.content;
              setStreamingContent(assistantContent);
            } else if (event.type === 'file') {
              currentFiles.push({ path: event.path, content: event.content });
              setStreamingContent(assistantContent + `\n\n📄 ${event.path}`);
            } else if (event.type === 'files_complete') {
              const newFiles: FileNode[] = currentFiles.map((f) => ({
                name: f.path.split('/').pop() || f.path,
                path: f.path,
                content: f.content,
                type: 'file',
              }));

              setFiles((prev) => {
                const existing = new Map(prev.map((f) => [f.path, f]));
                for (const nf of newFiles) existing.set(nf.path, nf);
                return Array.from(existing.values());
              });

              if (newFiles.length > 0 && !selectedFile) {
                setSelectedFile(newFiles[0].path);
              }

              setMessages((prev) => [...prev, {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: assistantContent,
                timestamp: Date.now(),
                files: currentFiles,
              }]);

              setStreamingContent('');
              setIsStreaming(false);
              currentFiles = [];
              assistantContent = '';
            } else if (event.type === 'preview') {
              setPreviewUrl(event.url);
            } else if (event.type === 'error') {
              setMessages((prev) => [...prev, {
                id: `msg-${Date.now()}`,
                role: 'system',
                content: event.message,
                timestamp: Date.now(),
              }]);
              setIsStreaming(false);
              setStreamingContent('');
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'system',
        content: 'Connection error. Please try again.',
        timestamp: Date.now(),
      }]);
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [files, selectedFile]);

  const selectedFileContent = files.find((f) => f.path === selectedFile)?.content ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Left: File Tree */}
      <div
        className="flex-shrink-0 border-r border-[var(--border-faint)] bg-[var(--surface)] overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        <FileTree
          files={files}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
        />
      </div>

      {/* Center: Code / Preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle bar */}
        <div className="flex items-center justify-between border-b border-[var(--border-faint)] bg-[var(--surface)] px-4 py-2">
          <div className="flex items-center gap-2">
            {selectedFile && (
              <span className="text-[12px] text-[var(--muted)] font-mono">{selectedFile}</span>
            )}
          </div>
          <CodePreviewToggle mode={viewMode} onToggle={setViewMode} />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'code' ? (
            <CodeViewer
              filePath={selectedFile}
              content={selectedFileContent}
            />
          ) : (
            <PreviewFrame url={previewUrl} />
          )}
        </div>
      </div>

      {/* Right: Chat Panel */}
      <div
        className="flex-shrink-0 border-l border-[var(--border-faint)] bg-[var(--surface)] flex flex-col"
        style={{ width: chatWidth }}
      >
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
