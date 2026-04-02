'use client';

import React, { useRef, useCallback } from 'react';

interface BrowserCanvasProps {
  screenshot: string | null;
  loading: boolean;
  onAction: (action: { type: 'click'; x: number; y: number } | { type: 'keypress'; key: string } | { type: 'scroll'; deltaY: number }) => void;
}

export function BrowserCanvas({ screenshot, loading, onAction }: BrowserCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const getScale = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return { scaleX: 1, scaleY: 1 };
    const img = el.querySelector('img');
    if (!img || !img.naturalWidth) return { scaleX: 1, scaleY: 1 };
    const rect = el.getBoundingClientRect();
    return {
      scaleX: 1280 / rect.width,
      scaleY: 800 / rect.height,
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { scaleX, scaleY } = getScale();
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    onAction({ type: 'click', x, y });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onAction({ type: 'keypress', key: e.key });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    onAction({ type: 'scroll', deltaY: e.deltaY });
  };

  return (
    <div
      ref={canvasRef}
      className="relative flex min-h-[400px] flex-1 items-center justify-center overflow-auto bg-[#1a1a1a]"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      tabIndex={0}
      role="application"
      aria-label="浏览器画布"
    >
      {loading && !screenshot && (
        <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border2)] border-t-[var(--accent)]" />
          <span className="text-[13px]">正在加载页面...</span>
        </div>
      )}
      {screenshot && (
        <img
          src={screenshot}
          alt="当前页面"
          className="max-h-full max-w-full cursor-pointer object-contain"
          style={{ maxHeight: '70vh' }}
          draggable={false}
        />
      )}
    </div>
  );
}
