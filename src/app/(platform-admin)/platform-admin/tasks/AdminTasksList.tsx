'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface TaskItem {
  id: string;
  userId: string;
  targetUrl: string | null;
  complexity: string;
  creditsUsed: number;
  status: string;
  qualityScore: number | null;
  createdAt: string;
  completedAt: string | null;
  cost: { total_cost_cents: number; charged_cents: number; profit_cents: number } | null;
}

const STATUS_KEYS = ['queued', 'scraping', 'analyzing', 'generating', 'testing', 'done', 'failed'] as const;
const COMPLEXITY_KEYS = ['static_single', 'static_multi', 'dynamic_basic', 'dynamic_complex'] as const;

export function AdminTasksList() {
  const t = useTranslation().tasksAdmin;
  const statusLabels: Record<string, string> = {
    queued: t.statusQueued,
    scraping: t.statusScraping,
    analyzing: t.statusAnalyzing,
    generating: t.statusGenerating,
    testing: t.statusTesting,
    done: t.statusDone,
    failed: t.statusFailed,
  };
  const complexityLabels: Record<string, string> = {
    static_single: t.complexityStaticSingle,
    static_multi: t.complexityStaticMulti,
    dynamic_basic: t.complexityDynamicBasic,
    dynamic_complex: t.complexityDynamicComplex,
  };
  const [items, setItems] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/platform-admin/tasks?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-2 text-[14px] text-[var(--text)]"
        >
          <option value="">{t.allStatus}</option>
          {STATUS_KEYS.map((k) => (
            <option key={k} value={k}>
              {statusLabels[k]}
            </option>
          ))}
        </select>
        <span className="text-[13px] text-[var(--muted)]">{t.totalCount(total)}</span>
      </div>

      {loading ? (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          {t.loading}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          {t.noTasks}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-6 py-4 font-semibold">{t.taskId}</th>
                <th className="px-6 py-4 font-semibold">{t.user}</th>
                <th className="px-6 py-4 font-semibold">{t.url}</th>
                <th className="px-6 py-4 font-semibold">{t.complexity}</th>
                <th className="px-6 py-4 font-semibold">{t.credits}</th>
                <th className="px-6 py-4 font-semibold">{t.status}</th>
                <th className="px-6 py-4 font-semibold">{t.quality}</th>
                <th className="px-6 py-4 font-semibold">{t.costRevenue}</th>
                <th className="px-6 py-4 font-semibold">{t.createTime}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((task) => (
                <tr key={task.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-6 py-3">
                    <Link
                      href={`/platform-admin/tasks/${task.id}`}
                      className="font-mono text-[12px] text-[var(--accent)] hover:underline"
                    >
                      {task.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-6 py-3 font-mono text-[12px]">{task.userId.slice(0, 8)}…</td>
                  <td className="max-w-[200px] truncate px-6 py-3 text-[var(--accent)]" title={task.targetUrl ?? ''}>
                    {task.targetUrl ?? '—'}
                  </td>
                  <td className="px-6 py-3">{complexityLabels[task.complexity] ?? task.complexity}</td>
                  <td className="px-6 py-3">{task.creditsUsed}</td>
                  <td className="px-6 py-3">
                    <span
                      className={
                        task.status === 'done'
                          ? 'text-[var(--green)]'
                          : task.status === 'failed'
                            ? 'text-[var(--red)]'
                            : ''
                      }
                    >
                      {statusLabels[task.status] ?? task.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">{task.qualityScore ?? '—'}</td>
                  <td className="px-6 py-3">
                    {task.cost ? (
                      <span className="text-[12px]">
                        成本 ${(task.cost.total_cost_cents / 100).toFixed(2)} / 收入 $
                        {(task.cost.charged_cents / 100).toFixed(2)}{' '}
                        <span className="text-[var(--green)]">
                          利润 ${(task.cost.profit_cents / 100).toFixed(2)}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-3 text-[13px] text-[var(--muted)]">
                    {new Date(task.createdAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[14px] disabled:opacity-50"
          >
            {t.prevPage}
          </button>
          <span className="text-[14px] text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[14px] disabled:opacity-50"
          >
            {t.nextPage}
          </button>
        </div>
      )}
    </div>
  );
}
