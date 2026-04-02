import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import { FinanceDashboard } from './FinanceDashboard';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return { title: `${t.platformAdmin.finance} — ${t.platformAdmin.title}` };
}

export default async function PlatformAdminFinancePage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/platform-admin/login');

  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const pa = t.platformAdmin;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold">{pa.finance}</h1>
          <div className="flex items-center gap-6">
            <Link
              href="/platform-admin"
              className="text-[14px] text-[var(--muted)] hover:text-[var(--text)]"
            >
              {pa.back}
            </Link>
            <span className="text-[13px] text-[var(--muted)]">{admin.email}</span>
            <form action="/api/platform-admin/logout" method="POST">
              <button
                type="submit"
                className="text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
              >
                {pa.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] px-8 py-10">
        <FinanceDashboard />
      </main>
    </div>
  );
}
