import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return { title: `${t.platformAdmin.title} — WebEcho AI` };
}

const ADMIN_HREFS = [
  '/platform-admin/pricing',
  '/platform-admin/finance',
  '/platform-admin/tasks',
  '/platform-admin/users',
  '/platform-admin/config',
  '/platform-admin/config/signatures',
  '/platform-admin/security',
  '/platform-admin/monitoring',
];
const ADMIN_ICONS = ['💰', '📊', '📋', '👥', '⚙️', '🏷️', '🔐', '📡'];

export default async function PlatformAdminDashboardPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/platform-admin/login');

  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const pa = t.platformAdmin;

  const cards = pa.cards.map((c, i) => ({ ...c, href: ADMIN_HREFS[i], icon: ADMIN_ICONS[i] }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold">{pa.title}</h1>
          <div className="flex items-center gap-6">
            <Link href="/platform-admin/pricing" className="text-[14px] text-[var(--accent)] hover:underline">
              {pa.pricing}
            </Link>
            <span className="text-[13px] text-[var(--muted)]">{admin.email}</span>
            <form action="/api/platform-admin/logout" method="POST">
              <button type="submit" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)]">
                {pa.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] px-8 py-10">
        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors ${
                item.href !== '#' ? 'hover:border-[var(--accent)]' : 'cursor-default opacity-70'
              }`}
            >
              <div className="mb-2 text-2xl">{item.icon}</div>
              <div className="mb-1 font-heading text-[16px] font-bold">{item.label}</div>
              <div className="text-[13px] text-[var(--muted)]">{item.desc}</div>
            </Link>
          ))}
        </div>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-4 font-heading text-[15px] font-bold">{pa.quickStart}</h2>
          <p className="text-[14px] text-[var(--muted)]">{pa.quickStartDesc}</p>
        </div>
      </main>
    </div>
  );
}
