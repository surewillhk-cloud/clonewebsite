'use client';

import { useState } from 'react';
import { BrowserViewer } from '@/components/browser/BrowserViewer';

interface ClonePreviewButtonProps {
  taskId: string;
  className?: string;
  children?: React.ReactNode;
}

export function ClonePreviewButton({ taskId, className, children }: ClonePreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clone/${taskId}/preview-session`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '启动预览失败');
      setSessionId(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动预览失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          'rounded-[10px] border border-[rgba(79,126,255,0.2)] bg-[rgba(79,126,255,0.1)] px-6 py-2.5 text-[13px] font-medium text-[var(--accent)] transition-colors hover:bg-[rgba(79,126,255,0.2)]'
        }
      >
        {children ?? '🖥 内嵌预览'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
          onClick={() => !loading && setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[1100px]">
            {error ? (
              <div className="rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-8">
                <p className="mb-4 text-[14px] text-[var(--muted)]">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClick}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] text-white"
                  >
                    重试
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-[var(--border2)] px-4 py-2 text-[13px] text-[var(--muted)]"
                  >
                    关闭
                  </button>
                </div>
              </div>
            ) : loading && !sessionId ? (
              <div className="rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-12 text-center">
                <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                <p className="text-[14px] text-[var(--muted)]">
                  正在启动预览服务器，首次约需 1–2 分钟…
                </p>
              </div>
            ) : sessionId ? (
              <BrowserViewer
                existingSessionId={sessionId}
                purpose="preview"
                onClose={() => {
                  setOpen(false);
                  setSessionId(null);
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
