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

interface CloneProgress {
  taskId: string;
  status: string;
  progress: number;
  currentStep: string;
}

function isUrl(text: string): boolean {
  const trimmed = text.trim();
  // Match URLs with or without protocol
  return /^(https?:\/\/)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(\/\S*)?$/.test(trimmed);
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
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

  // Landing page state
  const [heroInput, setHeroInput] = useState('');
  const [heroPhase, setHeroPhase] = useState<'idle' | 'detecting' | 'cloning' | 'generating'>('idle');
  const [cloneProgress, setCloneProgress] = useState<CloneProgress | null>(null);
  const heroInputRef = useRef<HTMLTextAreaElement>(null);

  const hasFiles = files.length > 0;

  // ─── Load clone files when cloneId is in URL ───
  useEffect(() => {
    if (!cloneId) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tryLoadFiles = async () => {
      try {
        const res = await fetch(`/api/clone/${cloneId}/files`);
        const data = await res.json();
        if (cancelled) return;

        if (data.files?.length > 0) {
          loadFilesIntoEditor(data.files, data.taskId, data.source);
          setLoadingClone(false);
          if (interval) clearInterval(interval);
          return true; // done
        }

        // Check task status if files not ready
        const statusRes = await fetch(`/api/clone/${cloneId}/status`);
        const statusData = await statusRes.json();
        if (cancelled) return;

        if (statusData.status === 'done' && data.source === 'unavailable') {
          addSystemMessage('克隆完成但项目文件已过期，请重新克隆。');
          setLoadingClone(false);
          if (interval) clearInterval(interval);
          return true;
        }

        if (statusData.status === 'failed') {
          addSystemMessage(`克隆失败：${statusData.currentStep || '未知错误'}`);
          setLoadingClone(false);
          if (interval) clearInterval(interval);
          return true;
        }

        // Still processing — show progress
        setCloneProgress({
          taskId: cloneId,
          status: statusData.status,
          progress: statusData.progress ?? 0,
          currentStep: statusData.currentStep ?? '处理中...',
        });
        setHeroPhase('cloning');
        return false;
      } catch {
        if (!cancelled) {
          addSystemMessage('加载失败，请重试。');
          setLoadingClone(false);
        }
        if (interval) clearInterval(interval);
        return true;
      }
    };

    setLoadingClone(true);
    tryLoadFiles().then((done) => {
      if (!done && !cancelled) {
        interval = setInterval(async () => {
          const finished = await tryLoadFiles();
          if (finished && interval) clearInterval(interval);
        }, 3000);
      }
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [cloneId]);

  // ─── Helpers ───
  function addSystemMessage(content: string) {
    setMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      role: 'system',
      content,
      timestamp: Date.now(),
    }]);
  }

  function loadFilesIntoEditor(rawFiles: { path: string; content: string }[], taskId: string, source: string) {
    const fileNodes: FileNode[] = rawFiles.map((f) => ({
      name: f.path.split('/').pop() || f.path,
      path: f.path,
      content: f.content,
      type: 'file' as const,
    }));
    setFiles(fileNodes);
    setSelectedFile(fileNodes[0].path);
    setCloneInfo({ taskId, source });
    addSystemMessage(`✅ 项目已加载（${fileNodes.length} 个文件）。你可以通过对话修改代码。`);
  }

  // ─── Poll clone status ───
  const pollCloneStatus = useCallback(async (taskId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/clone/${taskId}/status`);
        const data = await res.json();
        setCloneProgress({
          taskId,
          status: data.status,
          progress: data.progress ?? 0,
          currentStep: data.currentStep ?? '',
        });

        if (data.status === 'done') {
          // Load files
          const filesRes = await fetch(`/api/clone/${taskId}/files`);
          const filesData = await filesRes.json();
          if (filesData.files?.length > 0) {
            loadFilesIntoEditor(filesData.files, taskId, filesData.source);
            setHeroPhase('idle');
            setCloneProgress(null);
          } else {
            addSystemMessage('克隆完成但无法加载文件，请到控制台查看。');
            setHeroPhase('idle');
            setCloneProgress(null);
          }
          return true; // done
        }

        if (data.status === 'failed') {
          addSystemMessage(`❌ 克隆失败：${data.currentStep || '未知错误'}`);
          setHeroPhase('idle');
          setCloneProgress(null);
          return true; // done
        }

        return false; // keep polling
      } catch {
        return false;
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(interval);
    }, 3000);

    // First poll immediately
    const done = await poll();
    if (done) clearInterval(interval);

    return () => clearInterval(interval);
  }, []);

  // ─── Start clone from URL ───
  const startClone = useCallback(async (url: string) => {
    setHeroPhase('detecting');
    setCloneProgress({ taskId: '', status: 'detecting', progress: 0, currentStep: '检测网站复杂度...' });

    try {
      // Step 1: Detect complexity
      const detectRes = await fetch('/api/clone/detect-complexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const detectData = await detectRes.json();

      if (!detectRes.ok) {
        addSystemMessage(`❌ 检测失败：${detectData.error || '无法分析该网站'}`);
        setHeroPhase('idle');
        setCloneProgress(null);
        return;
      }

      const creditsRequired = detectData.creditsRequired ?? 1;

      // Add user message to chat
      setMessages([{
        id: `msg-${Date.now()}`,
        role: 'user',
        content: `🔗 克隆 ${url}`,
        timestamp: Date.now(),
      }]);

      addSystemMessage(`🔍 网站分析完成：复杂度 ${detectData.complexity}，需要 ${creditsRequired} 额度。正在开始克隆...`);

      // Step 2: Create clone task
      setHeroPhase('cloning');
      const createRes = await fetch('/api/clone/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          cloneType: 'web',
          complexity: detectData.complexity,
          deliveryMode: 'download',
          targetLanguage: 'original',
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        addSystemMessage(`❌ 创建任务失败：${createData.error || '请重试'}`);
        setHeroPhase('idle');
        setCloneProgress(null);
        return;
      }

      addSystemMessage(`🚀 克隆任务已创建，正在处理中...`);
      pollCloneStatus(createData.taskId);
    } catch {
      addSystemMessage('❌ 网络错误，请重试。');
      setHeroPhase('idle');
      setCloneProgress(null);
    }
  }, [pollCloneStatus]);

  // ─── Start AI generation from text ───
  const startGeneration = useCallback(async (prompt: string) => {
    setHeroPhase('generating');

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
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
          message: prompt,
          files: files.map((f) => ({ path: f.path, content: f.content })),
          selectedFile,
        }),
      });

      if (!res.ok || !res.body) {
        addSystemMessage('生成失败，请重试。');
        setIsStreaming(false);
        setHeroPhase('idle');
        return;
      }

      await processStreamResponse(res);
    } catch {
      addSystemMessage('连接错误，请重试。');
      setIsStreaming(false);
      setHeroPhase('idle');
    }
  }, [files, selectedFile]);

  // ─── Handle hero submit ───
  const handleHeroSubmit = () => {
    const input = heroInput.trim();
    if (!input || heroPhase !== 'idle') return;
    setHeroInput('');

    if (isUrl(input)) {
      startClone(normalizeUrl(input));
    } else {
      startGeneration(input);
    }
  };

  const handleHeroKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleHeroSubmit();
    }
  };

  // ─── Chat send (when files are loaded) ───
  const handleSendMessage = useCallback(async (content: string) => {
    // If URL is sent in chat while files exist, offer to clone
    if (isUrl(content) && files.length === 0) {
      startClone(normalizeUrl(content));
      return;
    }

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
        addSystemMessage('Failed to generate. Please try again.');
        setIsStreaming(false);
        return;
      }

      await processStreamResponse(res);
    } catch {
      addSystemMessage('Connection error. Please try again.');
      setIsStreaming(false);
    }
  }, [files, selectedFile]);

  // ─── Process SSE stream ───
  const processStreamResponse = async (res: Response) => {
    const reader = res.body!.getReader();
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

            if (newFiles.length > 0) {
              setSelectedFile((prev) => prev ?? newFiles[0].path);
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
            setHeroPhase('idle');
            currentFiles = [];
            assistantContent = '';
          } else if (event.type === 'preview') {
            setPreviewUrl(event.url);
          } else if (event.type === 'error') {
            addSystemMessage(event.message);
            setIsStreaming(false);
            setStreamingContent('');
            setHeroPhase('idle');
          }
        } catch {
          // skip malformed
        }
      }
    }
  };

  const selectedFileContent = files.find((f) => f.path === selectedFile)?.content ?? '';

  // ─── Loading state ───
  if (loadingClone && !hasFiles) {
    return (
      <div className="flex h-full overflow-hidden bg-[var(--bg)]">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border2)] border-t-[var(--accent)] mb-4" />
          <div className="text-[14px] text-[var(--muted)]">加载克隆项目中...</div>
          {cloneProgress && (
            <div className="mt-4 w-[300px]">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--border2)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] transition-all duration-500"
                  style={{ width: `${cloneProgress.progress}%` }}
                />
              </div>
              <div className="text-[12px] text-[var(--muted)] text-center mt-2">
                {cloneProgress.currentStep} ({cloneProgress.progress}%)
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Landing / Hero state ───
  if (!hasFiles) {
    return (
      <div className="flex h-full overflow-hidden bg-[var(--bg)]">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-full max-w-[720px]">
            {/* Logo & Title */}
            <div className="text-center mb-10">
              <div className="text-5xl mb-4">✨</div>
              <h1 className="font-heading text-3xl font-extrabold tracking-[-1px] mb-3">
                WebEcho AI
              </h1>
              <p className="text-[15px] text-[var(--muted)] max-w-[480px] mx-auto leading-relaxed">
                输入网址一键克隆，或描述你的想法让 AI 生成。<br />
                所有修改通过对话完成。
              </p>
            </div>

            {/* Main Input */}
            <div className="relative mb-6">
              <textarea
                ref={heroInputRef}
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                onKeyDown={handleHeroKeyDown}
                placeholder="输入网址克隆网站，或描述你想构建的页面..."
                rows={2}
                className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-6 py-5 pr-14 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--muted-dark)] resize-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_30px_rgba(79,126,255,0.12)]"
                disabled={heroPhase !== 'idle'}
                autoFocus
              />
              <button
                onClick={handleHeroSubmit}
                disabled={!heroInput.trim() || heroPhase !== 'idle'}
                className={`absolute right-4 bottom-4 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                  heroInput.trim() && heroPhase === 'idle'
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-lg hover:shadow-[0_0_20px_rgba(79,126,255,0.4)] hover:scale-105'
                    : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>

            {/* Clone Progress */}
            {cloneProgress && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-[var(--text)]">
                    {cloneProgress.currentStep || '处理中...'}
                  </span>
                  <span className="text-[13px] font-heading font-bold text-[var(--accent)]">
                    {cloneProgress.progress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--border2)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] transition-all duration-500"
                    style={{ width: `${cloneProgress.progress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center gap-3 text-[12px] text-[var(--muted)]">
                  {['检测', '抓取', '分析', '生成', '测试'].map((step, i) => {
                    const stepThresholds = [0, 10, 30, 50, 80];
                    const active = cloneProgress.progress >= stepThresholds[i];
                    const current = cloneProgress.progress >= stepThresholds[i] && (i === 4 || cloneProgress.progress < stepThresholds[i + 1]);
                    return (
                      <span key={step} className={`flex items-center gap-1 ${current ? 'text-[var(--accent)] font-medium' : active ? 'text-[var(--green)]' : ''}`}>
                        {active ? '✓' : '○'} {step}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat messages (for errors / system msgs during clone) */}
            {messages.length > 0 && (
              <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl px-4 py-3 text-[13px] leading-[1.6] ${
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-white ml-auto max-w-[80%]'
                        : msg.role === 'system'
                        ? msg.content.startsWith('❌')
                          ? 'bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red)]/20'
                          : msg.content.startsWith('✅')
                          ? 'bg-[rgba(0,208,132,0.08)] text-[var(--green)] border border-[rgba(0,208,132,0.2)]'
                          : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border-faint)]'
                        : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border-faint)]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick examples */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: '🔗 克隆 stripe.com', url: 'https://stripe.com' },
                { label: '🔗 克隆 linear.app', url: 'https://linear.app' },
                { label: '✨ 生成 SaaS 落地页', prompt: 'Create a modern SaaS landing page with hero, features, pricing, and footer sections' },
                { label: '✨ 生成个人作品集', prompt: 'Build a portfolio website for a designer with dark theme and smooth animations' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.url) {
                      setHeroInput(item.url);
                      startClone(item.url);
                    } else if (item.prompt) {
                      setHeroInput(item.prompt);
                      startGeneration(item.prompt);
                    }
                  }}
                  disabled={heroPhase !== 'idle'}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[12px] text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[rgba(79,126,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Editor state (files loaded) ───
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
        <FileTree
          files={files}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
        />
      </div>

      {/* Center: Code / Preview */}
      <div className="flex-1 flex flex-col min-w-0">
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

        <div className="flex-1 overflow-hidden">
          {viewMode === 'code' ? (
            <CodeViewer filePath={selectedFile} content={selectedFileContent} />
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
          hasFiles={hasFiles}
        />
      </div>
    </div>
  );
}
