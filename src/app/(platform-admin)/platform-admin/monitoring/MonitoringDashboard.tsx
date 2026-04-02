'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface TaskMetricsSummary {
  totalTasks: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  failedRate: number;
}

interface DailyTaskRow {
  date: string;
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

interface HealthResult {
  service: string;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

interface SlowRequestEntry {
  path: string;
  method: string;
  durationMs: number;
  timestamp: string;
}

export function MonitoringDashboard() {
  const t = useTranslation();
  const mon = t.monitoring;
  const [taskMetrics, setTaskMetrics] = useState<{ summary: TaskMetricsSummary; daily: DailyTaskRow[] } | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; results: HealthResult[] } | null>(null);
  const [slowRequests, setSlowRequests] = useState<SlowRequestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthRefreshing, setHealthRefreshing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/platform-admin/stats/task-metrics?days=30').then((r) => r.json()),
      fetch('/api/platform-admin/health').then((r) => r.json()),
      fetch('/api/platform-admin/stats/slow-requests?limit=30').then((r) => r.json()),
    ])
      .then(([metricsRes, healthRes, slowRes]) => {
        if (!metricsRes.error) setTaskMetrics({ summary: metricsRes.summary, daily: metricsRes.daily });
        if (!healthRes.error) setHealth({ ok: healthRes.ok, results: healthRes.results });
        if (!slowRes.error) setSlowRequests(slowRes.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refreshHealth = () => {
    setHealthRefreshing(true);
    fetch('/api/platform-admin/health?refresh=1')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setHealth({ ok: d.ok, results: d.results });
      })
      .finally(() => setHealthRefreshing(false));
  };

  if (loading) {
    return (
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <div className="text-[14px] text-[var(--muted)]">{mon.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {taskMetrics && (
          <>
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="mb-2 text-[13px] text-[var(--muted)]">{mon.successRate}</h3>
              <div className="font-heading text-2xl font-bold text-[var(--green)]">
                {(taskMetrics.summary.successRate * 100).toFixed(1)}%
              </div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">
                {mon.successCount(taskMetrics.summary.successCount, taskMetrics.summary.totalTasks)}
              </div>
            </div>
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="mb-2 text-[13px] text-[var(--muted)]">{mon.failedRate}</h3>
              <div className="font-heading text-2xl font-bold text-[var(--red)]">
                {(taskMetrics.summary.failedRate * 100).toFixed(1)}%
              </div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">
                {mon.failedCount(taskMetrics.summary.failedCount)}
              </div>
            </div>
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="mb-2 text-[13px] text-[var(--muted)]">{mon.totalTasks}</h3>
              <div className="font-heading text-2xl font-bold">{taskMetrics.summary.totalTasks}</div>
            </div>
          </>
        )}
      </div>

      {taskMetrics && taskMetrics.daily.length > 0 && (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="mb-4 font-heading text-[15px] font-bold">{mon.trend}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border2)]">
                  <th className="pb-2 text-left font-medium">{mon.date}</th>
                  <th className="pb-2 text-right">{mon.total}</th>
                  <th className="pb-2 text-right">{mon.success}</th>
                  <th className="pb-2 text-right">{mon.failed}</th>
                  <th className="pb-2 text-right">{mon.rate}</th>
                </tr>
              </thead>
              <tbody>
                {taskMetrics.daily.map((r) => (
                  <tr key={r.date} className="border-b border-[var(--border2)]/50">
                    <td className="py-2">{r.date}</td>
                    <td className="py-2 text-right">{r.total}</td>
                    <td className="py-2 text-right text-[var(--green)]">{r.success}</td>
                    <td className="py-2 text-right text-[var(--red)]">{r.failed}</td>
                    <td className="py-2 text-right">{(r.successRate * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-[15px] font-bold">外部服务健康</h3>
          <button
            onClick={refreshHealth}
            disabled={healthRefreshing}
            className="rounded-lg border border-[var(--border2)] px-3 py-1.5 text-[13px] hover:bg-[var(--surface2)] disabled:opacity-50"
          >
            {healthRefreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
        {health && (
          <div className="flex flex-wrap gap-4">
            {health.results.map((r) => (
              <div
                key={r.service}
                className={`rounded-lg border px-4 py-3 ${
                  r.ok ? 'border-[var(--green)]/50 bg-[var(--green)]/5' : 'border-[var(--red)]/50 bg-[var(--red)]/5'
                }`}
              >
                <div className="font-medium">{r.service}</div>
                <div className="text-[13px] text-[var(--muted)]">
                  {r.ok ? mon.healthy(r.latencyMs) : (r.error ?? mon.unhealthy)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="mb-4 font-heading text-[15px] font-bold">{mon.slowRequests}</h3>
        {slowRequests.length === 0 ? (
          <p className="text-[14px] text-[var(--muted)]">{mon.noSlowRequests}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border2)]">
                  <th className="pb-2 text-left font-medium">{mon.time}</th>
                  <th className="pb-2 text-left">{mon.method}</th>
                  <th className="pb-2 text-left">{mon.path}</th>
                  <th className="pb-2 text-right">{mon.duration}</th>
                </tr>
              </thead>
              <tbody>
                {slowRequests.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--border2)]/50">
                    <td className="py-2 text-[12px] text-[var(--muted)]">{r.timestamp.slice(11, 19)}</td>
                    <td className="py-2">{r.method}</td>
                    <td className="py-2 font-mono text-[12px]">{r.path}</td>
                    <td className="py-2 text-right text-[var(--orange)]">{r.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
