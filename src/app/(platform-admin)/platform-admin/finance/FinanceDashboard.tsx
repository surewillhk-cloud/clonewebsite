'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface CostBreakdown {
  firecrawlCents: number;
  decodoCents: number;
  playwrightCents: number;
  claudeInputCents: number;
  claudeOutputCents: number;
  dockerCents: number;
  r2Cents: number;
}

interface FinanceSummary {
  totalRevenueCents: number;
  totalCostCents: number;
  totalProfitCents: number;
  totalRefundCents?: number;
  taskCount: number;
}

interface DailyRow {
  date: string;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  refundCents?: number;
  taskCount: number;
}

interface FinanceData {
  summary: FinanceSummary;
  costBreakdown?: CostBreakdown;
  daily: DailyRow[];
  period: number;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function FinanceDashboard() {
  const t = useTranslation().financeDashboard;
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/platform-admin/finance?period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <div className="text-[14px] text-[var(--muted)]">{t.loading}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[14px] border border-[var(--orange)]/50 bg-[rgba(255,122,61,0.08)] p-6">
        <div className="text-[14px] text-[var(--orange)]">{t.loadError}</div>
      </div>
    );
  }

  const { summary, daily, costBreakdown } = data;
  const refundCents = summary.totalRefundCents ?? 0;
  const netRevenueCents = summary.totalRevenueCents - refundCents;

  const handleExport = () => {
    window.open(`/api/platform-admin/finance?period=${period}&format=csv`, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[var(--muted)]">{t.period}</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`rounded-lg px-4 py-2 text-[13px] transition-colors ${
                period === d
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border2)] text-[var(--muted)] hover:border-[var(--accent)]'
              }`}
            >
              {t.lastNDays(d)}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] hover:bg-[var(--surface2)]"
        >
          {t.exportCsv}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t.totalRevenue}
          </div>
          <div className="font-heading text-[24px] font-bold text-[var(--green)]">
            {formatCents(summary.totalRevenueCents)}
          </div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">
            {t.taskCount(summary.taskCount)}
          </div>
        </div>
        {refundCents > 0 && (
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t.refund}
            </div>
            <div className="font-heading text-[24px] font-bold text-[var(--red)]">
              -{formatCents(refundCents)}
            </div>
          </div>
        )}
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t.totalCost}
          </div>
          <div className="font-heading text-[24px] font-bold text-[var(--orange)]">
            {formatCents(summary.totalCostCents)}
          </div>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t.totalProfit}
          </div>
          <div className="font-heading text-[24px] font-bold text-[var(--accent)]">
            {formatCents(summary.totalProfitCents - refundCents)}
          </div>
          {netRevenueCents > 0 && (
            <div className="mt-1 text-[12px] text-[var(--muted)]">
              {t.profitRate(refundCents > 0)}{' '}
              {(((summary.totalProfitCents - refundCents) / netRevenueCents) * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {costBreakdown &&
        (costBreakdown.firecrawlCents ||
          costBreakdown.claudeInputCents ||
          costBreakdown.claudeOutputCents ||
          costBreakdown.dockerCents) > 0 && (
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="mb-4 font-heading text-[15px] font-bold">{t.costBreakdown}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {[
                { label: 'Firecrawl', v: costBreakdown.firecrawlCents },
                { label: 'Decodo', v: costBreakdown.decodoCents },
                { label: 'Playwright', v: costBreakdown.playwrightCents },
                { label: t.costClaudeInput, v: costBreakdown.claudeInputCents },
                { label: t.costClaudeOutput, v: costBreakdown.claudeOutputCents },
                { label: 'Docker', v: costBreakdown.dockerCents },
                { label: 'R2', v: costBreakdown.r2Cents },
              ].map(
                (x) =>
                  x.v > 0 && (
                    <div key={x.label} className="text-[13px]">
                      <span className="text-[var(--muted)]">{x.label}</span>
                      <span className="ml-2 font-medium">{formatCents(x.v)}</span>
                    </div>
                  )
              )}
            </div>
          </div>
        )}

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 font-heading text-[15px] font-bold">{t.dailyDetail}</h2>
        {daily.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[var(--muted)]">
            {t.noRecords}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border2)] text-left">
                  <th className="pb-3 pr-4">{t.date}</th>
                  <th className="pb-3 pr-4">{t.revenue}</th>
                  {refundCents > 0 && <th className="pb-3 pr-4">{t.refund}</th>}
                  <th className="pb-3 pr-4">{t.cost}</th>
                  <th className="pb-3 pr-4">{t.profit}</th>
                  <th className="pb-3">{t.tasks}</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date} className="border-b border-[var(--border2)]/50">
                    <td className="py-3 pr-4">{row.date}</td>
                    <td className="py-3 pr-4 text-[var(--green)]">{formatCents(row.revenueCents)}</td>
                    {refundCents > 0 && (
                      <td className="py-3 pr-4 text-[var(--red)]">
                        {(row.refundCents ?? 0) > 0 ? `-${formatCents(row.refundCents ?? 0)}` : '-'}
                      </td>
                    )}
                    <td className="py-3 pr-4 text-[var(--orange)]">{formatCents(row.costCents)}</td>
                    <td className="py-3 pr-4 text-[var(--accent)]">{formatCents(row.profitCents)}</td>
                    <td className="py-3">{row.taskCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface2)]/50 p-4 text-[13px] text-[var(--muted)]">
        <span className="font-medium text-[var(--text)]">{t.stripeLabel}</span>
        {t.stripeNote}{' '}
        <a
          href="https://dashboard.stripe.com/payments"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          Stripe Dashboard → Payments
        </a>{' '}
        {t.stripeCompare}
      </div>
    </div>
  );
}
