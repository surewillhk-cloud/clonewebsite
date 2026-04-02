import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import { SystemConfigPanel } from './SystemConfigPanel';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return { title: `${t.platformAdmin.config} — ${t.platformAdmin.title}` };
}

export default async function PlatformAdminConfigPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/platform-admin/login');

  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const pa = t.platformAdmin;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/platform-admin"
              className="text-[14px] text-[var(--muted)] hover:text-[var(--text)]"
            >
              {pa.back}
            </Link>
            <h1 className="font-heading text-xl font-bold">{pa.config}</h1>
          </div>
          <span className="text-[13px] text-[var(--muted)]">{admin.email}</span>
        </div>
      </header>

      <main className="max-w-[600px] px-8 py-10">
        <div className="mb-8">
          <Link
            href="/platform-admin/config/signatures"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px] hover:bg-[var(--surface2)]"
          >
            🏷️ {pa.signatures}
          </Link>
        </div>
        <SystemConfigPanel />
      </main>
    </div>
  );
}
