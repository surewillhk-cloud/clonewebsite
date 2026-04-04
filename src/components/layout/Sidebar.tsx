'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageToggle } from './LanguageToggle';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPartial?: boolean;
}

function isActivePath(pathname: string, href: string, matchPartial?: boolean): boolean {
  return pathname === href || (matchPartial === true && pathname.startsWith(href));
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[18px] h-[18px] transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z" />
    </svg>
  );
}

function PlusIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[18px] h-[18px] transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CloudIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[18px] h-[18px] transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 19a4.5 4.5 0 01-.42-8.98A7 7 0 0118.5 9a4.5 4.5 0 01-.5 9H6.5z" />
    </svg>
  );
}

function CardIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[18px] h-[18px] transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 6l1 14h16l1-14M8 14h2m4 0h2" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[18px] h-[18px] transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-[18px] h-[18px] text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  const isActive = (href: string, matchPartial?: boolean): boolean =>
    pathname === href || (matchPartial === true && pathname.startsWith(href));

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: t.sidebar.console,
      icon: <DashboardIcon active={isActive('/dashboard')} />,
    },
    {
      href: '/generate',
      label: 'AI Generate',
      icon: <svg className={`w-[18px] h-[18px] transition-colors ${isActive('/generate') ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>,
    },
    {
      href: '/clone/new',
      label: t.sidebar.newClone,
      icon: <PlusIcon active={isActive('/clone', true)} />,
      matchPartial: true,
    },
    {
      href: '/hosting',
      label: t.sidebar.mySites,
      icon: <CloudIcon active={isActive('/hosting')} />,
    },
  ];

  const billingItems: NavItem[] = [
    {
      href: '/billing',
      label: t.sidebar.payment,
      icon: <CardIcon active={pathname === '/billing'} />,
    },
    {
      href: '/settings',
      label: t.sidebar.settings,
      icon: <SettingsIcon active={pathname === '/settings'} />,
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-[var(--border-faint)] bg-[var(--surface)] transition-all duration-300 ${
        collapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2 border-b border-[var(--border-faint)] transition-all duration-300 ${collapsed ? 'px-4 justify-center' : 'px-5'} py-4`}>
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className={`font-heading text-base font-extrabold text-[var(--text)] transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
          Web<span className="text-[var(--accent)]">Echo</span>
        </span>
        <div className={`ml-auto transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
          <LanguageToggle />
        </div>
      </div>

      {/* Main Nav */}
      <nav className={`flex flex-col pt-4 transition-all duration-300 ${collapsed ? 'gap-0.5 px-2' : 'gap-1 px-3'}`}>
        {navItems.map((item) => {
          const active = isActive(item.href, item.matchPartial);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
              } ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}`}
            >
              <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </span>
              <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Billing Section */}
      <div className={`mt-6 pb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--muted-dark)] transition-all duration-300 ${collapsed ? 'opacity-0 h-0 overflow-hidden px-2' : 'opacity-100 px-3'}`}>
        {t.sidebar.billing}
      </div>
      <nav className={`flex flex-col transition-all duration-300 ${collapsed ? 'gap-0.5 px-2' : 'gap-1 px-3'}`}>
        {billingItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
              } ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}`}
            >
              <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </span>
              <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom - Usage + Logout */}
      <div className={`mt-auto border-t border-[var(--border-faint)] transition-all duration-300 ${collapsed ? 'p-2' : 'p-5'}`}>
        {!collapsed && (
          <>
            <div className="mb-2 flex justify-between text-[11px] text-[var(--muted)]">
              <span>{t.sidebar.spend}</span>
              <span className="text-[var(--text)]">$38.50</span>
            </div>
            <div className="mb-4 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] transition-all" />
            </div>
          </>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={`flex items-center rounded-xl text-[13px] text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5 w-full'}`}
        >
          <span className="shrink-0"><LogoutIcon /></span>
          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>
            {t.sidebar.logout}
          </span>
        </button>
      </div>
    </aside>
  );
}
