'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageToggle } from './LanguageToggle';

export function Navbar() {
  const t = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(10,10,10,0.8)] backdrop-blur-xl border-b border-[var(--border)] shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto flex h-[64px] items-center justify-between px-6 lg:px-12">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-[-0.5px] text-[var(--text)] transition-opacity hover:opacity-80"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            Web<span className="text-[var(--accent)]">Echo</span> AI
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="nav-link text-sm">{t.common.product}</Link>
            <Link href="/pricing" className="nav-link text-sm">{t.common.pricing}</Link>
            <Link href="/docs" className="nav-link text-sm">{t.common.docs}</Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-[13px] text-[var(--text-secondary)] transition-all hover:text-[var(--text)]"
            >
              {t.common.login}
            </Link>
            <Link
              href="/generate"
              className="btn-primary"
            >
              {t.common.cta}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[99] md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-[64px] left-0 right-0 bg-[var(--surface)] border-b border-[var(--border)] shadow-xl animate-slide-up">
            <div className="px-6 py-6 flex flex-col gap-4">
              <Link href="/" className="text-[15px] text-[var(--text-secondary)] py-2 hover:text-[var(--text)] transition-colors" onClick={() => setMobileOpen(false)}>{t.common.product}</Link>
              <Link href="/pricing" className="text-[15px] text-[var(--text-secondary)] py-2 hover:text-[var(--text)] transition-colors" onClick={() => setMobileOpen(false)}>{t.common.pricing}</Link>
              <Link href="/docs" className="text-[15px] text-[var(--text-secondary)] py-2 hover:text-[var(--text)] transition-colors" onClick={() => setMobileOpen(false)}>{t.common.docs}</Link>
              <div className="border-t border-[var(--border)] pt-4 mt-2 flex gap-3">
                <Link href="/login" className="flex-1 text-center rounded-lg border border-[var(--border)] py-2.5 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors" onClick={() => setMobileOpen(false)}>{t.common.login}</Link>
                <Link href="/clone/new" className="flex-1 text-center btn-primary" onClick={() => setMobileOpen(false)}>{t.common.cta}</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
