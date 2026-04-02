'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface DashboardStatsData {
  cloneCountThisMonth: number;
  hostedSiteCount: number;
  avgQualityScore: number | null;
  tasksPerDay: { date: string; count: number }[];
}

interface DashboardStatsProps {
  initialData?: DashboardStatsData;
}

export function DashboardStats({ initialData }: DashboardStatsProps = {} as DashboardStatsProps) {
  const t = useTranslation();
  const [data, setData] = useState<DashboardStatsData | null>(initialData ?? null);

  useEffect(() => {
    if (initialData) return;
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [initialData]);

  if (!data) {
    return (
      <div className="mb-8 grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-[14px] bg-[var(--surface-raised)]"
          />
        ))}
      </div>
    );
  }

  const maxCount = Math.max(1, ...data.tasksPerDay.map((d) => d.count));

  return (
    <div className="mb-8 space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Clone Count */}
        <div className="feature-card group !p-5">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>{t.dashboard.cloneCount}</span>
            <svg className="w-4 h-4 text-[var(--accent)] opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="font-heading text-3xl font-extrabold tracking-[-1px] stat-number">
            {data.cloneCountThisMonth}
          </div>
          <div className="mt-2 h-1 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] transition-all duration-700"
              style={{ width: `${Math.min(100, (data.cloneCountThisMonth / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* Hosted Count */}
        <div className="feature-card group !p-5">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>{t.dashboard.hostedCount}</span>
            <svg className="w-4 h-4 text-[var(--green)] opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 19a4.5 4.5 0 01-.42-8.98A7 7 0 0118.5 9a4.5 4.5 0 01-.5 9H6.5z" />
            </svg>
          </div>
          <div className="font-heading text-3xl font-extrabold tracking-[-1px] text-[var(--text)]">
            {data.hostedSiteCount}
          </div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">{t.dashboard.viewHosting}</div>
          <div className="mt-1.5 h-1 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--green)] to-[#4ade80] transition-all duration-700"
              style={{ width: `${Math.min(100, data.hostedSiteCount * 25)}%` }}
            />
          </div>
        </div>

        {/* Quality Score */}
        <div className="feature-card group !p-5">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>{t.dashboard.avgQuality}</span>
            <svg className="w-4 h-4 text-[var(--green)] opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className={`font-heading text-3xl font-extrabold tracking-[-1px] ${
            data.avgQualityScore != null ? 'text-[var(--green)]' : 'text-[var(--muted)]'
          }`}>
            {data.avgQualityScore != null ? `${data.avgQualityScore}` : '—'}
          </div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">
            {data.avgQualityScore != null ? t.dashboard.fromRecent : t.dashboard.noData}
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--green)] to-[#4ade80] transition-all duration-700"
              style={{ width: `${data.avgQualityScore ?? 0}%` }}
            />
          </div>
        </div>

        {/* Trend */}
        <div className="feature-card group !p-5">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>{t.dashboard.trend14d}</span>
            <svg className="w-4 h-4 text-[var(--accent)] opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="flex h-12 items-end gap-0.5">
            {data.tasksPerDay.map(({ date, count }) => (
              <div
                key={date}
                className="flex-1 rounded-t-sm bg-[var(--accent)]/40 transition-all duration-200 hover:bg-[var(--accent)]"
                style={{
                  height: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                  minHeight: count > 0 ? 4 : 0,
                }}
                title={t.dashboardTasks.countLabel(date, count)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
