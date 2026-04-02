'use client';

import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageToggle } from './LanguageToggle';

export function Navbar() {
  const t = useTranslation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex h-[60px] items-center justify-between border-b border-[var(--border)] bg-[rgba(8,10,15,0.85)] px-12 backdrop-blur-[20px]">
      <Link href="/" className="font-heading text-lg font-extrabold tracking-[-0.5px] text-[var(--text)]">
        Web<span className="text-[var(--accent)]">Echo</span> AI
      </Link>
      <div className="flex gap-8">
        <Link href="/" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">{t.common.product}</Link>
        <Link href="/pricing" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">{t.common.pricing}</Link>
        <Link href="/docs" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">{t.common.docs}</Link>
        <Link href="#" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--text)]">{t.common.blog}</Link>
      </div>
      <div className="flex items-center gap-4">
        <LanguageToggle />
        <Link href="/login" className="rounded-lg border border-[var(--border2)] px-4 py-[7px] text-[13px] text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--text)]">{t.common.login}</Link>
        <Link href="/clone/new" className="rounded-lg bg-[var(--accent)] px-5 py-2 text-[13px] font-medium text-white transition-all hover:translate-y-[-1px] hover:bg-[#6B91FF]">{t.common.cta}</Link>
      </div>
    </nav>
  );
}
