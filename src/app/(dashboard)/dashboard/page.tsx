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
    <div className="max-w-[1400px] px-12 py-10">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold tracking-[-0.5px]">{t.dashboard.title}</h1>
        <Link href="/clone/new" className="flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-5 py-2.5 text-[13px] font-medium text-white">
          ＋ {t.dashboard.newClone}
        </Link>
      </div>

      <DashboardPageData />
    </div>
  );
}
