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

export default function HostingListPage() {
  const t = useTranslation();
  const [sites, setSites] = useState<HostedSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hosting/list')
      .then((r) => r.json())
      .then((d) => {
        setSites(d.sites ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[900px] px-12 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-extrabold">{t.hosting.listTitle}</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          {t.hosting.listSubtitle}
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[14px] bg-[var(--surface2)]" />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <div className="mb-4 text-4xl">☁</div>
          <div className="mb-2 font-heading text-lg font-bold">{t.hosting.noSites}</div>
          <p className="mb-6 text-[13px] text-[var(--muted)]">
            {t.hosting.deployFromResult}
          </p>
          <Link
            href="/clone/new"
            className="inline-block rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-[#6B91FF]"
          >
            {t.hosting.newClone}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sites.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      s.status === 'active'
                        ? 'bg-[var(--green)]/15 text-[var(--green)]'
                        : s.status === 'deploying'
                          ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                          : 'bg-[var(--border2)] text-[var(--muted)]'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-[12px] text-[var(--muted)]">{s.hostingPlan}</span>
                </div>
                <div className="mt-2">
                  {s.deploymentUrl ? (
                    <a
                      href={s.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-[var(--accent)] hover:underline"
                    >
                      {s.deploymentUrl}
                    </a>
                  ) : (
                    <span className="text-[13px] text-[var(--muted)]">{t.hosting.deploying}</span>
                  )}
                </div>
              </div>
              <Link
                href={`/hosting/${s.id}`}
                className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2 text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20"
              >
                {t.hosting.manage}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
