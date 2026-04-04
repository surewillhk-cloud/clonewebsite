'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface HostingStatus {
  status: string;
  deploymentUrl: string | null;
  customDomain: string | null;
  domainVerified: boolean;
  githubRepoUrl: string | null;
  railwayBudgetUsed: number;
  railwayBudgetLimit: number;
}

export default function HostingSitePage() {
  const t = useTranslation();
  const params = useParams();
  const siteId = params?.siteId as string;
  const [status, setStatus] = useState<HostingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [domainSubmitting, setDomainSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [domainResult, setDomainResult] = useState<{
    cnameTarget?: string;
    instructions?: string;
  } | null>(null);

  const fetchStatus = async (sync = false) => {
    if (!siteId) return;
    if (!status && !loading) setLoading(true);
    try {
      const res = await fetch(
        `/api/hosting/${siteId}/status${sync ? '?sync=1' : ''}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.hostingDetail.loadFailed);
      setStatus(data);
      if (data.customDomain) setDomainInput(data.customDomain);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.hostingDetail.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!siteId) return;
    fetchStatus();
  }, [siteId]);

  const handleBindDomain = async () => {
    if (!domainInput.trim()) return;
    setDomainSubmitting(true);
    setDomainResult(null);
    try {
      const res = await fetch(`/api/hosting/${siteId}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.hostingDetail.bindFailed);
      setDomainResult(data);
      setStatus((s) =>
        s ? { ...s, custom_domain: domainInput.trim(), domain_verified: false } : null
      );
    } catch (err) {
      setDomainResult({
        instructions: err instanceof Error ? err.message : t.hostingDetail.bindFailed,
      });
    } finally {
      setDomainSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[800px] px-12 py-10">
        <div className="animate-pulse rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="mb-4 h-6 w-1/3 rounded bg-[var(--border2)]" />
          <div className="h-4 w-2/3 rounded bg-[var(--border2)]" />
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="mx-auto max-w-[800px] px-12 py-10">
        <div className="rounded-[14px] border-2 border-red-500/30 bg-red-500/5 p-8">
          <div className="font-heading text-lg font-bold text-red-400">{t.hostingDetail.loadFailed}</div>
          <p className="mt-2 text-[13px] text-[var(--muted)]">{error ?? t.hostingDetail.siteNotFound}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] text-white hover:bg-[#6B91FF]"
          >
            {t.hostingDetail.backToDashboard}
          </Link>
        </div>
      </div>
    );
  }

  const statusLabel =
    status.status === 'active'
      ? t.hostingDetail.active
      : status.status === 'deploying'
        ? t.hostingDetail.deploying
        : status.status === 'suspended'
          ? t.hostingDetail.suspended
          : status.status;

  return (
    <div className="mx-auto max-w-[800px] px-12 py-10">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-[13px] text-[var(--muted)] hover:text-[var(--accent)]"
        >
          {t.hostingDetail.backLink}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-extrabold">{t.hostingDetail.title}</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{t.hostingDetail.siteId(siteId.slice(0, 8))}</p>
      </div>

      <div className="space-y-6">
        {/* 状态卡片 */}
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {t.hostingDetail.status}
            </span>
            <button
              onClick={async () => {
                setSyncing(true);
                await fetchStatus(true);
                setSyncing(false);
              }}
              disabled={syncing}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--muted)] hover:bg-[var(--surface2)] disabled:opacity-50"
            >
              {syncing ? t.hostingDetail.sync : t.hostingDetail.refreshRailway}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[12px] font-medium ${
                status.status === 'active'
                  ? 'bg-[var(--green)]/15 text-[var(--green)]'
                  : status.status === 'deploying'
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : status.status === 'suspended'
                      ? 'bg-[var(--orange)]/15 text-[var(--orange)]'
                      : 'bg-[var(--border2)] text-[var(--muted)]'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          {status.deploymentUrl && (
            <div className="mt-4">
              <a
                href={status.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-[var(--accent)] hover:underline"
              >
                {status.deploymentUrl}
              </a>
            </div>
          )}
          {status.githubRepoUrl && (
            <div className="mt-2">
              <span className="text-[12px] text-[var(--muted)]">{t.hostingDetail.github}</span>
              <a
                href={status.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-[13px] text-[var(--accent)] hover:underline"
              >
                {status.githubRepoUrl}
              </a>
            </div>
          )}
        </div>

        {/* 自定义域名 */}
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {t.hostingDetail.domain}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="www.example.com"
              className="flex-1 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            <button
              onClick={handleBindDomain}
              disabled={domainSubmitting || !domainInput.trim()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#6B91FF] disabled:opacity-50"
            >
              {domainSubmitting ? t.hostingDetail.processing : t.hostingDetail.bind}
            </button>
          </div>
          {domainResult?.cnameTarget && (
            <div className="mt-4 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5 p-4 text-[12px]">
              <div className="font-medium text-[var(--green)]">{t.hostingDetail.cnameGuide}</div>
              <p className="mt-2 text-[var(--muted)]">{domainResult.instructions}</p>
              <p className="mt-1 font-mono text-[13px]">
                CNAME → <strong>{domainResult.cnameTarget}</strong>
              </p>
            </div>
          )}
          {domainResult?.instructions && !domainResult?.cnameTarget && (
            <p className="mt-2 text-[12px] text-red-400">{domainResult.instructions}</p>
          )}
        </div>
      </div>
    </div>
  );
}
