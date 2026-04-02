import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/platform-admin/auth';
import { getUserDetail } from '@/lib/platform-admin/user-detail';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import { UserDetailClient } from './UserDetailClient';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return { title: `${t.usersAdmin.userDetail} — ${t.platformAdmin.title}` };
}

export default async function PlatformAdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect('/platform-admin/login');

  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const ua = t.usersAdmin;

  const { userId } = await params;
  const data = await getUserDetail(userId);
  if (!data) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/platform-admin/users"
              className="text-[14px] text-[var(--muted)] hover:text-[var(--text)]"
            >
              {ua.backToUsers}
            </Link>
            <h1 className="font-heading text-xl font-bold">{ua.userDetail}</h1>
          </div>
          <span className="text-[13px] text-[var(--muted)]">{admin.email}</span>
        </div>
      </header>

      <main className="max-w-[900px] px-8 py-10">
        <UserDetailClient data={data} />
      </main>
    </div>
  );
}
