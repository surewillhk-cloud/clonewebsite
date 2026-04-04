'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

export function TopNav() {
  const t = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const links = [
    { href: '/generate', label: 'AI 生成', icon: '⚡' },
    { href: '/dashboard', label: t.sidebar.console, icon: '📊' },
    { href: '/hosting', label: t.sidebar.mySites, icon: '☁️' },
    { href: '/billing', label: t.sidebar.payment, icon: '💳' },
    { href: '/settings', label: t.sidebar.settings, icon: '⚙️' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] h-12 border-b border-[var(--border-faint)] bg-[var(--surface)]/90 backdrop-blur-xl flex items-center px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-heading text-sm font-extrabold text-[var(--text)] hover:opacity-80 transition-opacity mr-8 shrink-0">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Web<span className="text-[var(--accent)]">Echo</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/generate' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span className="text-[10px]">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: Logout + Mobile */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={handleLogout}
            className="hidden md:block px-3 py-1.5 rounded-lg text-[12px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            {t.sidebar.logout}
          </button>
          <button
            className="md:hidden p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[99] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-12 left-0 right-0 bg-[var(--surface)] border-b border-[var(--border)] shadow-xl animate-slide-up">
            <div className="px-4 py-4 flex flex-col gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/generate' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="text-sm">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
              <div className="border-t border-[var(--border-faint)] mt-2 pt-2">
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {t.sidebar.logout}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
