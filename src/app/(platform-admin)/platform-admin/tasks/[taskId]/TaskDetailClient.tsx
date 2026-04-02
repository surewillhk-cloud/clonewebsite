'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/contexts/LocaleContext';

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface TaskDetailClientProps {
  data: {
    task: {
      id: string;
      userId: string;
      targetUrl: string | null;
      cloneType: string | null;
      complexity: string | null;
      creditsUsed: number;
      status: string;
      qualityScore: number | null;
      deliveryMode: string | null;
      targetLanguage: string | null;
      scraperLayer: number | null;
      errorMessage: string | null;
      createdAt: string;
      completedAt: string | null;
      stripePaymentIntentId: string | null;
    };
    cost: {
      firecrawlCostCents: number;
      decodoCostCents: number;
      playwrightCostCents: number;
      claudeInputTokens: number;
      claudeOutputTokens: number;
      claudeInputCostCents: number;
      claudeOutputCostCents: number;
      dockerCostCents: number;
      r2CostCents: number;
      totalCostCents: number;
      chargedCents: number;
      profitCents: number;
      profitMultiplier: number;
      calculatedAt: string;
    } | null;
  };
}

export function TaskDetailClient({ data }: TaskDetailClientProps) {
  const { task, cost } = data;
  const t = useTranslation().tasksAdmin;
  const { locale } = useLocale();
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';

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

  return (
    <div className="space-y-8">
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 font-heading text-[15px] font-bold">{t.taskInfo}</h2>
        <dl className="grid gap-3 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.taskId}</dt>
            <dd className="font-mono text-[12px]">{task.id}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.userId}</dt>
            <dd>
              <a
                href={`/platform-admin/users/${task.userId}`}
                className="font-mono text-[12px] text-[var(--accent)] hover:underline"
              >
                {task.userId}
              </a>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[12px] text-[var(--muted)]">{t.targetUrl}</dt>
            <dd className="break-all text-[var(--accent)]">{task.targetUrl ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.type}</dt>
            <dd>{task.cloneType ?? 'web'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.complexity}</dt>
            <dd>{complexityLabels[task.complexity ?? ''] ?? task.complexity}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.creditsUsed}</dt>
            <dd>{task.creditsUsed}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.status}</dt>
            <dd
              className={
                task.status === 'done'
                  ? 'text-[var(--green)]'
                  : task.status === 'failed'
                    ? 'text-[var(--orange)]'
                    : ''
              }
            >
              {statusLabels[task.status] ?? task.status}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.qualityScore}</dt>
            <dd>{task.qualityScore ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.scraperLayer}</dt>
            <dd>{task.scraperLayer ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.createTime}</dt>
            <dd>{new Date(task.createdAt).toLocaleString(dateLocale)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--muted)]">{t.completedAt}</dt>
            <dd>{task.completedAt ? new Date(task.completedAt).toLocaleString(dateLocale) : '—'}</dd>
          </div>
          {task.errorMessage && (
            <div className="sm:col-span-2">
              <dt className="text-[12px] text-[var(--muted)]">{t.errorReason}</dt>
              <dd className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                {task.errorMessage}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 font-heading text-[15px] font-bold">{t.costDetails}</h2>
        {cost ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] p-4">
                <div className="text-[11px] text-[var(--muted)]">{t.totalCost}</div>
                <div className="font-heading text-[20px] font-bold text-[var(--orange)]">
                  {formatCents(cost.totalCostCents)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] p-4">
                <div className="text-[11px] text-[var(--muted)]">{t.revenue}</div>
                <div className="font-heading text-[20px] font-bold text-[var(--green)]">
                  {formatCents(cost.chargedCents)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] p-4">
                <div className="text-[11px] text-[var(--muted)]">{t.profit}</div>
                <div className="font-heading text-[20px] font-bold text-[var(--accent)]">
                  {formatCents(cost.profitCents)}
                </div>
              </div>
            </div>
            <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.firecrawl}</dt>
                <dd>{formatCents(cost.firecrawlCostCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.decodo}</dt>
                <dd>{formatCents(cost.decodoCostCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.playwright}</dt>
                <dd>{formatCents(cost.playwrightCostCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.claudeInputTokens}</dt>
                <dd>{cost.claudeInputTokens.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.claudeOutputTokens}</dt>
                <dd>{cost.claudeOutputTokens.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.claudeCost}</dt>
                <dd>{formatCents(cost.claudeInputCostCents + cost.claudeOutputCostCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.docker}</dt>
                <dd>{formatCents(cost.dockerCostCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.r2}</dt>
                <dd>{formatCents(cost.r2CostCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.profitMultiplier}</dt>
                <dd>{cost.profitMultiplier}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">{t.calculatedAt}</dt>
                <dd>{new Date(cost.calculatedAt).toLocaleString(dateLocale)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-[14px] text-[var(--muted)]">{t.noCostRecord}</p>
        )}
      </div>
    </div>
  );
}
