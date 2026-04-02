'use client';

import React from 'react';

interface BrowserToolbarProps {
  currentUrl: string;
  onNavigate: (url: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function BrowserToolbar({ currentUrl, onNavigate, onRefresh, onClose }: BrowserToolbarProps) {
  const [urlInput, setUrlInput] = React.useState(currentUrl);
  React.useEffect(() => setUrlInput(currentUrl), [currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = urlInput.trim();
    if (!u) return;
    const full = u.startsWith('http') ? u : `https://${u}`;
    onNavigate(full);
  };

  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-3 py-2">
      <button
        type="button"
        onClick={onRefresh}
        className="rounded p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface2)] hover:text-[var(--text)]"
        title="刷新"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 21h5v-5" />
        </svg>
      </button>
      <form onSubmit={handleSubmit} className="flex flex-1">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="w-full rounded-lg border border-[var(--border2)] bg-[var(--surface2)] px-3 py-2 font-mono text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          placeholder="https://..."
        />
      </form>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-[var(--border2)] px-4 py-2 text-[12px] text-[var(--muted)] transition-colors hover:bg-[var(--surface2)]"
      >
        关闭
      </button>
    </div>
  );
}
