'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

/** 首页 Hero 区 URL 输入 + 开始克隆，输入内容会传递到 clone/new */
export function HeroUrlInput() {
  const t = useTranslation();
  const [url, setUrl] = useState('');

  const trimmed = url.trim();
  const href = trimmed
    ? `/clone/new?url=${encodeURIComponent(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)}`
    : '/clone/new';

  return (
    <div className="mx-auto mb-4 flex max-w-[620px] items-center gap-3 rounded-[14px] border border-[var(--border2)] bg-[var(--surface)] p-2 pl-5 transition-[border-color] focus-within:border-[var(--accent)]">
      <span className="whitespace-nowrap text-sm text-[var(--muted)]">https://</span>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t.home.urlPlaceholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text)] outline-none placeholder:text-[#3A4560]"
      />
      <Link
        href={href}
        className="whitespace-nowrap rounded-[10px] bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6B91FF]"
      >
        {t.home.startClone}
      </Link>
    </div>
  );
}
