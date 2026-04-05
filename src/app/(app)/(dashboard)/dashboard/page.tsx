import Link from 'next/link';
import { DashboardPageData } from '@/components/dashboard/DashboardPageData';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return { title: t.dashboard.metadataTitle };
}

export default async function DashboardPage() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return (
    <div className="max-w-[1400px] px-8 lg:px-12 py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-[-0.5px]">{t.dashboard.title}</h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">{t.dashboard.manageAll}</p>
        </div>
        <Link href="/generate" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t.dashboard.newProject}
        </Link>
      </div>

      <DashboardPageData />
    </div>
  );
}
