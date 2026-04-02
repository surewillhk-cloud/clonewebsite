'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { DashboardStats } from './DashboardStats';
import { DashboardTasks } from './DashboardTasks';
import { DashboardHostedSites } from './DashboardHostedSites';

interface PageData {
  stats: {
    cloneCountThisMonth: number;
    hostedSiteCount: number;
    avgQualityScore: number | null;
    tasksPerDay: { date: string; count: number }[];
  };
  tasks: Array<{
    id: string;
    url: string;
    targetUrl: string | null;
    complexity: string;
    complexityLabel: string;
    status: string;
    progress: number;
    qualityScore: number | null;
    createdAt: string;
  }>;
  sites: Array<{
    id: string;
    cloneTaskId: string;
    deploymentUrl: string | null;
    customDomain: string | null;
    status: string;
    hostingPlan: string;
    createdAt: string;
  }>;
}

/**
 * 单次请求获取控制台首页全部数据，减少 3 次 HTTP 往返为 1 次
 */
export function DashboardPageData() {
  const t = useTranslation();
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/page-data')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Unauthorized'))))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error || !data) {
    return (
      <div className="max-w-[1400px] px-12 py-10">
        <div className="mb-8 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-[14px] bg-[var(--surface2)]" />
          ))}
        </div>
        <div className="h-[200px] animate-pulse rounded-[14px] bg-[var(--surface2)]" />
      </div>
    );
  }

  return (
    <>
      <DashboardStats initialData={data.stats} />
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-[15px] font-bold">{t.dashboard.recentTasks}</h2>
        </div>
        <DashboardTasks initialTasks={data.tasks} />
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-[15px] font-bold">{t.dashboard.hostedSites}</h2>
          <Link href="/hosting" className="text-[13px] text-[var(--accent)] hover:underline">
            {t.dashboard.manageAll}
          </Link>
        </div>
        <DashboardHostedSites initialSites={data.sites} />
      </div>
    </>
  );
}
