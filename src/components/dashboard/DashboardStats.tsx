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
            className="h-[120px] animate-pulse rounded-[14px] bg-[var(--surface2)]"
          />
        ))}
      </div>
    );
  }

  const maxCount = Math.max(1, ...data.tasksPerDay.map((d) => d.count));

  return (
    <div className="mb-8 space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>{t.dashboard.cloneCount}</span>
            <span>📋</span>
          </div>
          <div className="font-heading text-3xl font-extrabold tracking-[-1px]">
            {data.cloneCountThisMonth}
          </div>
          <div className="mt-1 h-0.5 rounded bg-[var(--border2)]">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.min(100, (data.cloneCountThisMonth / 20) * 100)}%`,
                background: 'var(--accent)',
              }}
            />
          </div>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>{t.dashboard.hostedCount}</span>
            <span>☁</span>
          </div>
          <div className="font-heading text-3xl font-extrabold tracking-[-1px]">
            {data.hostedSiteCount}
          </div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">
            {t.dashboard.viewHosting}
          </div>
          <div className="mt-1 h-0.5 rounded bg-[var(--border2)]">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.min(100, data.hostedSiteCount * 25)}%`,
                background: 'var(--green)',
              }}
            />
          </div>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>{t.dashboard.avgQuality}</span>
            <span>🎯</span>
          </div>
          <div
            className={`font-heading text-3xl font-extrabold tracking-[-1px] ${
              data.avgQualityScore != null ? 'text-[var(--green)]' : ''
            }`}
          >
            {data.avgQualityScore != null ? `${data.avgQualityScore}` : '—'}
          </div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">
            {data.avgQualityScore != null ? t.dashboard.fromRecent : t.dashboard.noData}
          </div>
          <div className="mt-1 h-0.5 rounded bg-[var(--border2)]">
            <div
              className="h-full rounded"
              style={{
                width: `${data.avgQualityScore ?? 0}%`,
                background: 'var(--green)',
              }}
            />
          </div>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--muted)]">
            <span>{t.dashboard.trend14d}</span>
            <span>📈</span>
          </div>
          <div className="flex h-12 items-end gap-0.5">
            {data.tasksPerDay.map(({ date, count }) => (
              <div
                key={date}
                className="flex-1 rounded-t bg-[var(--accent)]/60 transition-all hover:bg-[var(--accent)]"
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
