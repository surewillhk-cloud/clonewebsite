'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface TaskItem {
  id: string;
  url: string;
  targetUrl: string | null;
  complexity: string;
  complexityLabel: string;
  status: string;
  progress: number;
  qualityScore: number | null;
  createdAt: string;
}

interface DashboardTasksProps {
  initialTasks?: TaskItem[];
}

export function DashboardTasks({ initialTasks }: DashboardTasksProps = {} as DashboardTasksProps) {
  const t = useTranslation();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks ?? []);

  const formatRelativeTime = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffM < 1) return t.dashboardTasks.justNow;
    if (diffM < 60) return t.dashboardTasks.minutesAgo(diffM);
    if (diffH < 24) return t.dashboardTasks.hoursAgo(diffH);
    if (diffD < 2) return t.dashboardTasks.yesterday;
    return t.dashboardTasks.daysAgo(diffD);
  };
  const [loading, setLoading] = useState(!initialTasks);

  useEffect(() => {
    if (initialTasks) return;
    fetch('/api/clone/list?limit=10')
      .then((res) => res.json())
      .then((data) => {
        setTasks(data.tasks ?? []);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [initialTasks]);

  const statusStyles = (status: string) => {
    if (status === 'done') return 'bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green)]/20';
    if (status === 'failed') return 'bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red)]/20';
    return 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20';
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[14px] border border-[var(--border-faint)] bg-[var(--surface)]">
        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_100px] border-b border-[var(--border-faint)] bg-[var(--surface-raised)] px-5 py-3">
          {[t.dashboardTasks.site, t.dashboardTasks.complexity, t.dashboardTasks.status, t.dashboardTasks.qualityScore, ''].map((th) => (
            <div key={th} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{th}</div>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="overflow-hidden rounded-[14px] border border-[var(--border-faint)] bg-[var(--surface)]">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 text-4xl">📋</div>
          <div className="mb-1 font-heading text-[15px] font-bold">{t.dashboardTasks.noTasks}</div>
          <div className="mb-5 text-[13px] text-[var(--muted)]">{t.dashboardTasks.createFirst}</div>
          <Link href="/clone/new" className="btn-primary">
            ＋ {t.dashboard.newClone}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border-faint)] bg-[var(--surface)]">
      <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_120px] border-b border-[var(--border-faint)] bg-[var(--surface-raised)] px-5 py-3">
        {[t.dashboardTasks.site, t.dashboardTasks.complexity, t.dashboardTasks.status, t.dashboardTasks.qualityScore, ''].map((th) => (
          <div key={th} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{th}</div>
        ))}
      </div>
      {tasks.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[2.5fr_1fr_1fr_1fr_120px] items-center border-b border-[var(--border-faint)] px-5 py-4 transition-all duration-200 last:border-b-0 hover:bg-[var(--surface-raised)] group"
        >
          <div>
            <div className="font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{row.url}</div>
            <div className="text-[11px] text-[var(--muted)]">
              {row.complexityLabel} · {formatRelativeTime(row.createdAt)}
            </div>
          </div>
          <div>
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                row.complexity.includes('dynamic')
                  ? 'bg-[var(--orange-soft)] text-[var(--orange)]'
                  : 'bg-[var(--green-soft)] text-[var(--green)]'
              }`}
            >
              {row.complexityLabel}
            </span>
          </div>
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles(row.status)}`}
            >
              {row.status === 'done' ? t.dashboardTasks.done : row.status === 'failed' ? t.dashboardTasks.failed : (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  {t.dashboardTasks.processing}
                </>
              )}
            </span>
          </div>
          <div>
            {row.qualityScore != null ? (
              <span
                className={`font-semibold ${row.qualityScore >= 80 ? 'text-[var(--green)]' : 'text-[var(--orange)]'}`}
              >
                {row.qualityScore}
              </span>
            ) : (
              <span className={row.status === 'failed' ? 'text-[var(--red)]' : 'text-[var(--muted)]'}>—</span>
            )}
          </div>
          <div className="flex gap-1.5">
            {row.status === 'done' ? (
              <>
                <Link
                  href={`/clone/${row.id}/result`}
                  className="rounded-md border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all"
                >
                  {t.dashboardTasks.preview}
                </Link>
                <a
                  href={`/api/clone/${row.id}/download`}
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-all"
                  download
                >
                  {t.dashboardTasks.download}
                </a>
              </>
            ) : row.status === 'failed' ? (
              <Link
                href="/clone/new"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-all"
              >
                {t.dashboardTasks.retry}
              </Link>
            ) : (
              <Link
                href={`/clone/${row.id}`}
                className="rounded-md border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all"
              >
                {t.dashboardTasks.viewProgress}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
