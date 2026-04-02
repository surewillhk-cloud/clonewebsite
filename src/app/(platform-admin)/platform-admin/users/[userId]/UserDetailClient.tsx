'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/contexts/LocaleContext';

interface UserDetailClientProps {
  data: {
    user: {
      id: string;
      email: string | null;
      credits: number;
      creditsExpireAt: string | null;
      stripeCustomerId: string | null;
      createdAt: string;
      updatedAt: string | null;
    };
    taskStats: {
      total: number;
      done: number;
      failed: number;
    };
    recentTasks: Array<{
      id: string;
      targetUrl: string | null;
      complexity: string | null;
      status: string;
      creditsUsed: number;
      createdAt: string;
    }>;
  };
}

export function UserDetailClient({ data }: UserDetailClientProps) {
  const { user, taskStats, recentTasks } = data;
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const t = useTranslation().usersAdmin;
  const tTasks = useTranslation().tasksAdmin;
  const { locale } = useLocale();
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';

  const statusLabels: Record<string, string> = {
    queued: tTasks.statusQueued,
    scraping: tTasks.statusScraping,
    analyzing: tTasks.statusAnalyzing,
    generating: tTasks.statusGenerating,
    testing: tTasks.statusTesting,
    done: tTasks.statusDone,
    failed: tTasks.statusFailed,
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 font-heading text-[15px] font-bold">{t.userInfo}</h2>
        <dl className="grid gap-3 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.userId}</dt>
            <dd className="font-mono text-[12px]">{user.id}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.email}</dt>
            <dd>{user.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.credits}</dt>
            <dd className="font-medium">{user.credits}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.creditExpiry}</dt>
            <dd>{user.creditsExpireAt ? new Date(user.creditsExpireAt).toLocaleDateString(dateLocale) : '—'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.stripeCustomer}</dt>
            <dd className="font-mono text-[12px]">{user.stripeCustomerId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.regTime}</dt>
            <dd>{new Date(user.createdAt).toLocaleString(dateLocale)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setCreditModalOpen(true)}
            className="rounded-lg border border-[var(--accent)] bg-[rgba(79,126,255,0.1)] px-4 py-2 text-[13px] text-[var(--accent)] hover:bg-[rgba(79,126,255,0.2)]"
          >
            {t.adjustCredits}
          </button>
          <Link
            href="/platform-admin/users"
            className="rounded-lg border border-[var(--border2)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
          >
            {t.backToUserList}
          </Link>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 font-heading text-[15px] font-bold">{t.taskStats}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] p-4 text-center">
            <div className="font-heading text-[24px] font-bold">{taskStats.total}</div>
            <div className="text-[12px] text-[var(--muted)]">{t.totalTasks}</div>
          </div>
          <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] p-4 text-center">
            <div className="font-heading text-[24px] font-bold text-[var(--green)]">{taskStats.done}</div>
            <div className="text-[12px] text-[var(--muted)]">{t.completed}</div>
          </div>
          <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] p-4 text-center">
            <div className="font-heading text-[24px] font-bold text-[var(--orange)]">{taskStats.failed}</div>
            <div className="text-[12px] text-[var(--muted)]">{t.failed}</div>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 font-heading text-[15px] font-bold">{t.recentTasks}</h2>
        {recentTasks.length === 0 ? (
          <p className="text-[14px] text-[var(--muted)]">{t.noTasks}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--border2)]">
                  <th className="pb-3 pr-4">{t.task}</th>
                  <th className="pb-3 pr-4">{tTasks.url}</th>
                  <th className="pb-3 pr-4">{t.complexity}</th>
                  <th className="pb-3 pr-4">{t.status}</th>
                  <th className="pb-3 pr-4">{t.credits}</th>
                  <th className="pb-3">{t.createTime}</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((tItem) => (
                  <tr key={tItem.id} className="border-b border-[var(--border2)]/50">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/platform-admin/tasks/${tItem.id}`}
                        className="font-mono text-[12px] text-[var(--accent)] hover:underline"
                      >
                        {tItem.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="max-w-[180px] truncate py-3 pr-4" title={tItem.targetUrl ?? ''}>
                      {tItem.targetUrl ?? '—'}
                    </td>
                    <td className="py-3 pr-4">{tItem.complexity ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          tItem.status === 'done'
                            ? 'text-[var(--green)]'
                            : tItem.status === 'failed'
                              ? 'text-[var(--orange)]'
                              : ''
                        }
                      >
                        {statusLabels[tItem.status] ?? tItem.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{tItem.creditsUsed}</td>
                    <td className="py-3 text-[13px] text-[var(--muted)]">
                      {new Date(tItem.createdAt).toLocaleString(dateLocale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creditModalOpen && (
        <CreditModal
          user={{ id: user.id, email: user.email, credits: user.credits }}
          onClose={() => setCreditModalOpen(false)}
          onSuccess={() => {
            setCreditModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function CreditModal({
  user,
  onClose,
  onSuccess,
}: {
  user: { id: string; email: string | null; credits: number };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslation().usersAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delta === 0) {
      setError(t.invalidCredits);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/users/${user.id}/credits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.opFailed);
        return;
      }
      onSuccess();
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-heading text-lg font-bold">{t.adjustTitle}</h3>
        <p className="mb-4 text-[14px] text-[var(--muted)]">
          {t.currentCredits(user.email ?? user.id, user.credits)}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--muted)]">
              {t.creditsChange}
            </label>
            <input
              type="number"
              value={delta || ''}
              onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px]"
              placeholder={t.creditsChangePlaceholder}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--muted)]">{t.reason}</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px]"
              placeholder={t.reasonPlaceholder}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-[14px]"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
            >
              {loading ? t.processing : t.confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
