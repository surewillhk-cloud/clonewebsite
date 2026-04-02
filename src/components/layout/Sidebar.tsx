'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageToggle } from './LanguageToggle';
import { signOut } from 'next-auth/react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };
  const isActive = (href: string, matchPartial?: boolean) =>
    pathname === href || (matchPartial && pathname.startsWith(href));

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 w-[220px] flex-shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] py-5">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-[var(--border)] px-5 pb-6">
        <div className="font-heading text-base font-extrabold shrink-0">
          Web<span className="text-[var(--accent)]">Echo</span> AI
        </div>
        <LanguageToggle />
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        <Link href="/dashboard" className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all ${isActive('/dashboard') ? 'bg-[rgba(79,126,255,0.12)] text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'}`}>
          <span className="w-4 text-center text-sm">⊞</span> {t.sidebar.console}
        </Link>
        <Link href="/clone/new" className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all ${isActive('/clone', true) ? 'bg-[rgba(79,126,255,0.12)] text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'}`}>
          <span className="w-4 text-center text-sm">＋</span> {t.sidebar.newClone}
        </Link>
        <Link href="/hosting" className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all ${isActive('/hosting') ? 'bg-[rgba(79,126,255,0.12)] text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'}`}>
          <span className="w-4 text-center text-sm">☁</span> {t.sidebar.mySites}
        </Link>
      </nav>
      <div className="mt-8 px-5 pb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">{t.sidebar.billing}</div>
      <nav className="flex flex-col gap-0.5 px-2">
        <Link href="/billing" className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all ${pathname === '/billing' ? 'bg-[rgba(79,126,255,0.12)] text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'}`}>
          <span className="w-4 text-center text-sm">💳</span> {t.sidebar.payment}
        </Link>
        <Link href="#" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-[var(--muted)] transition-all hover:bg-[var(--surface2)] hover:text-[var(--text)]">
          <span className="w-4 text-center text-sm">📊</span> {t.sidebar.invoice}
        </Link>
        <Link href="/settings" className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all ${pathname === '/settings' ? 'bg-[rgba(79,126,255,0.12)] text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'}`}>
          <span className="w-4 text-center text-sm">⚙</span> {t.sidebar.settings}
        </Link>
      </nav>
      <div className="mt-auto border-t border-[var(--border)] p-5">
        <div className="mb-2 flex justify-between text-[11px] text-[var(--muted)]">
          <span>{t.sidebar.spend}</span>
          <span className="text-[var(--text)]">$38.50</span>
        </div>
        <div className="mb-4 h-1 rounded bg-[var(--border2)]">
          <div className="h-full w-2/5 rounded bg-[var(--accent)]" />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-[12px] text-[var(--muted)] transition-colors hover:bg-[var(--surface2)] hover:text-[var(--text)]"
        >
          {t.sidebar.logout}
        </button>
      </div>
    </aside>
  );
}
