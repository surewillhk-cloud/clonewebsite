'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const cloneId = searchParams.get('cloneId');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingClone, setLoadingClone] = useState(false);
  const [cloneInfo, setCloneInfo] = useState<{ taskId: string; source: string } | null>(null);

  // 加载克隆任务的文件
  useEffect(() => {
    if (!cloneId) return;

    let cancelled = false;
    setLoadingClone(true);

    fetch(`/api/clone/${cloneId}/files`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.files && data.files.length > 0) {
          const fileNodes: FileNode[] = data.files.map((f: { path: string; content: string }) => ({
            name: f.path.split('/').pop() || f.path,
            path: f.path,
            content: f.content,
            type: 'file' as const,
          }));
          setFiles(fileNodes);
          setSelectedFile(fileNodes[0].path);
          setCloneInfo({ taskId: data.taskId, source: data.source });
          // Add system message
          setMessages([{
            id: `msg-${Date.now()}`,
            role: 'system',
            content: `已加载克隆项目（${fileNodes.length} 个文件）。你可以通过对话修改代码，比如："把标题改成 XXX" 或 "添加一个 Pricing 区块"。`,
            timestamp: Date.now(),
          }]);
        } else {
          setMessages([{
            id: `msg-${Date.now()}`,
            role: 'system',
            content: data.message || '无法加载克隆文件，请尝试重新克隆。',
            timestamp: Date.now(),
          }]);
        }
        setLoadingClone(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([{
          id: `msg-${Date.now()}`,
          role: 'system',
          content: '加载克隆文件失败，请重试。',
          timestamp: Date.now(),
        }]);
        setLoadingClone(false);
      });

    return () => { cancelled = true; };
  }, [cloneId]);

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
    <div className="flex h-full overflow-hidden bg-[var(--bg)]">
      {/* Left: File Tree */}
      <div className="flex-shrink-0 w-[260px] border-r border-[var(--border-faint)] bg-[var(--surface)] overflow-hidden flex flex-col">
        {cloneInfo && (
          <div className="px-3 py-2 border-b border-[var(--border-faint)] bg-[rgba(0,208,132,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--green)]">
              🔗 克隆项目
            </div>
            <div className="text-[10px] text-[var(--muted)] font-mono truncate">
              {cloneInfo.taskId.slice(0, 16)}...
            </div>
          </div>
        )}
        {loadingClone ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border2)] border-t-[var(--accent)] mx-auto mb-3" />
              <div className="text-[12px] text-[var(--muted)]">加载克隆文件中...</div>
            </div>
          </div>
        ) : (
          <FileTree
            files={files}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}
      </div>

      {/* Center: Code / Preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle bar */}
        <div className="flex items-center justify-between border-b border-[var(--border-faint)] bg-[var(--surface)] px-4 py-2">
          <div className="flex items-center gap-2">
            {selectedFile && (
              <span className="text-[12px] text-[var(--muted)] font-mono">{selectedFile}</span>
            )}
            {cloneInfo && (
              <span className="text-[10px] bg-[rgba(0,208,132,0.1)] text-[var(--green)] px-2 py-0.5 rounded-full">
                克隆 · {files.length} 文件
              </span>
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
      <div className="flex-shrink-0 w-[420px] border-l border-[var(--border-faint)] bg-[var(--surface)] flex flex-col">
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
