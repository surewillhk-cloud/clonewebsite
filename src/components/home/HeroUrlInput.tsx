'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export function HeroUrlInput() {
  const t = useTranslation();
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);

  const trimmed = url.trim();
  const href = trimmed
    ? `/clone/new?url=${encodeURIComponent(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)}`
    : '/clone/new';

  return (
    <div className="mx-auto mb-4 flex max-w-[640px] items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 pl-5 transition-all duration-300 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_30px_rgba(249,115,22,0.1)]">
      <span className="whitespace-nowrap text-sm text-[var(--muted)] select-none">https://</span>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t.home.urlPlaceholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--muted-dark)]"
      />
      <Link
        href={href}
        className={`whitespace-nowrap rounded-[10px] px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 ${
          trimmed || focused
            ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] shadow-sm hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:-translate-y-0.5'
            : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'
        }`}
      >
        {t.home.startClone}
      </Link>
    </div>
  );
}
