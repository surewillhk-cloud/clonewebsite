'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface HostedSite {
  id: string;
  cloneTaskId: string;
  deploymentUrl: string | null;
  customDomain: string | null;
  status: string;
  hostingPlan: string;
  createdAt: string;
}

interface DashboardHostedSitesProps {
  initialSites?: HostedSite[];
}

export function DashboardHostedSites({ initialSites }: DashboardHostedSitesProps = {} as DashboardHostedSitesProps) {
  const t = useTranslation();
  const [sites, setSites] = useState<HostedSite[]>(initialSites ?? []);
  const [loading, setLoading] = useState(!initialSites);

  useEffect(() => {
    if (initialSites) return;
    fetch('/api/hosting/list')
      .then((r) => r.json())
      .then((d) => setSites(d.sites ?? []))
      .finally(() => setLoading(false));
  }, [initialSites]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-[140px] animate-pulse rounded-[14px] bg-[var(--surface2)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {sites.slice(0, 2).map((s) => (
        <Link
          key={s.id}
          href={`/hosting/${s.id}`}
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]/40"
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface2)] text-base">
              ☁
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--green)]">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-[var(--green)] ${s.status === 'active' ? 'animate-pulse' : ''}`}
              />
              {s.status === 'active' ? t.hostingDetail.active : s.status === 'deploying' ? t.hostingDetail.deploying : s.status}
            </div>
          </div>
          <div className="mb-1 font-heading text-[14px] font-bold">
            {s.deploymentUrl
              ? (() => {
                  try {
                    return new URL(s.deploymentUrl).hostname;
                  } catch {
                    return s.deploymentUrl.slice(0, 24) + '…';
                  }
                })()
              : t.hosting.deploying}
          </div>
          <div className="mb-3 text-[12px] text-[var(--accent)]">
            {s.deploymentUrl ?? t.dashboard.waitDeploy}
          </div>
          <div className="border-t border-[var(--border)] pt-3 text-[12px] text-[var(--muted)]">
            {s.hostingPlan}
          </div>
        </Link>
      ))}
      <Link
        href="/hosting"
        className="flex min-h-[140px] cursor-pointer items-center justify-center rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface)] text-center transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface2)]"
      >
        <div className="text-[var(--muted)]">
          <div className="mb-2 text-2xl">＋</div>
          <div className="text-[13px]">{t.dashboard.manageHostedSites}</div>
        </div>
      </Link>
    </div>
  );
}
