import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { query } from '@/lib/db';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import { TotpSetupClient } from './TotpSetupClient';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return { title: `${t.securityAdmin.title} — ${t.platformAdmin.title}` };
}

export default async function PlatformAdminSecurityPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/platform-admin/login');

  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const sec = t.securityAdmin;

  const result = await query(
    'SELECT totp_secret FROM platform_admins WHERE id = $1',
    [admin.id]
  );
  const totpEnabled = !!(result.rows[0]?.totp_secret);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-8 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/platform-admin"
            className="text-[14px] text-[var(--muted)] hover:text-[var(--text)]"
          >
            {sec.backToAdmin}
          </Link>
          <span className="text-[13px] text-[var(--muted)]">{admin.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-8 py-10">
        <h1 className="mb-8 font-heading text-xl font-bold">{sec.title}</h1>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="mb-2 font-heading text-[15px] font-bold">{sec.totpTitle}</h2>
          <p className="mb-6 text-[13px] text-[var(--muted)]">
            {sec.totpDesc}
          </p>
          {totpEnabled ? (
            <p className="rounded-lg bg-[var(--green)]/10 px-4 py-3 text-[14px] text-[var(--green)]">
              {sec.enabled}
            </p>
          ) : (
            <TotpSetupClient />
          )}
        </div>
      </main>
    </div>
  );
}
