'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserToolbar } from './BrowserToolbar';
import { BrowserCanvas } from './BrowserCanvas';
import { BrowserStatusBar } from './BrowserStatusBar';

const POLL_INTERVAL_MS = 400;

interface BrowserViewerProps {
  targetUrl?: string;
  purpose: 'login' | 'preview';
  onClose: () => void;
  onExtract?: (cookieString: string) => void;
  /** 使用已存在的 Session（如预览模式由 preview-session API 创建）*/
  existingSessionId?: string | null;
}

export function BrowserViewer({
  targetUrl = '',
  purpose,
  onClose,
  onExtract,
  existingSessionId,
}: BrowserViewerProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(targetUrl);
  const [loginStatus, setLoginStatus] = useState<{ isLoggedIn: boolean; confidence: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  const createSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, purpose: purpose || 'login' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '创建 Session 失败');
      setSessionId(data.sessionId);
      setCurrentUrl(data.targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  }, [targetUrl, purpose]);

  // 使用已存在的 Session（预览模式）
  useEffect(() => {
    if (existingSessionId) {
      setSessionId(existingSessionId);
      setLoading(false);
      return;
    }
    if (!targetUrl && purpose === 'login') return;
    createSession();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      const sid = sessionIdRef.current;
      if (sid) {
        fetch(`/api/browser/${sid}/close`, { method: 'POST' }).catch(() => {});
      }
    };
  }, [existingSessionId, targetUrl, purpose, createSession]);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/browser/${sessionId}/screenshot`);
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 404) {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
          }
          throw new Error(data.error ?? '获取截图失败');
        }
        setScreenshot(data.screenshot);
        setCurrentUrl(data.currentUrl ?? currentUrl);
        if (data.loginStatus) setLoginStatus(data.loginStatus);
      } catch (err) {
        console.warn('[BrowserViewer] Poll error:', err);
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [sessionId]);

  const handleAction = useCallback(
    async (action: { type: string; x?: number; y?: number; key?: string; deltaY?: number; url?: string }) => {
      if (!sessionId) return;
      try {
        await fetch(`/api/browser/${sessionId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
      } catch (err) {
        console.warn('[BrowserViewer] Action error:', err);
      }
    },
    [sessionId]
  );

  const handleNavigate = useCallback(
    (url: string) => {
      handleAction({ type: 'navigate', url });
      setCurrentUrl(url);
    },
    [handleAction]
  );

  const handleRefresh = useCallback(() => {
    handleNavigate(currentUrl);
  }, [handleNavigate, currentUrl]);

  const handleExtract = useCallback(async () => {
    if (!sessionId || !onExtract) return;
    setExtracting(true);
    try {
      const res = await fetch(`/api/browser/${sessionId}/extract`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '提取失败');
      onExtract(data.cookieString);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : '提取 Cookie 失败');
    } finally {
      setExtracting(false);
    }
  }, [sessionId, onExtract, onClose]);

  const handleClose = useCallback(async () => {
    if (sessionId) {
      try {
        await fetch(`/api/browser/${sessionId}/close`, { method: 'POST' });
      } catch {}
    }
    onClose();
  }, [sessionId, onClose]);

  if (error) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-8">
        <p className="text-[14px] text-[var(--muted)]">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={createSession}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] text-white"
          >
            重试
          </button>
          <button
            onClick={handleClose}
            className="rounded-lg border border-[var(--border2)] px-4 py-2 text-[13px] text-[var(--muted)]"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[85vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl border border-[var(--border2)] bg-[var(--surface)] shadow-xl">
      <BrowserToolbar
        currentUrl={currentUrl}
        onNavigate={handleNavigate}
        onRefresh={handleRefresh}
        onClose={handleClose}
      />
      <BrowserCanvas
        screenshot={screenshot}
        loading={loading && !screenshot}
        onAction={handleAction}
      />
      {purpose === 'login' && onExtract && (
        <BrowserStatusBar
          currentUrl={currentUrl}
          loginStatus={loginStatus}
          onExtract={handleExtract}
          extracting={extracting}
        />
      )}
    </div>
  );
}
