'use client';

import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export function Footer() {
  const t = useTranslation();
  return (
    <footer className="flex items-center justify-between border-t border-[var(--border)] px-12 py-10">
      <div className="font-heading text-sm font-extrabold text-[var(--muted)]">WebEcho AI</div>
      <div className="flex gap-6">
        <Link href="#" className="text-[13px] text-[var(--muted)]">{t.footer.privacy}</Link>
        <Link href="#" className="text-[13px] text-[var(--muted)]">{t.footer.terms}</Link>
        <Link href="/docs" className="text-[13px] text-[var(--muted)]">{t.footer.docs}</Link>
        <Link href="#" className="text-[13px] text-[var(--muted)]">{t.footer.contact}</Link>
      </div>
    </footer>
  );
}
