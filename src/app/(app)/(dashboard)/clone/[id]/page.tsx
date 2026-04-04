'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { useCloneStatus } from '@/hooks/useCloneStatus';

export default function CloneProgressPage() {
  const t = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data } = useCloneStatus(id);

  const status = data?.status ?? 'queued';
  const progress = data?.progress ?? 0;
  const currentStep = data?.currentStep ?? t.cloneProgress.taskQueued;

  if (data?.status === 'done') {
    router.replace(`/clone/${id}/result`);
    return null;
  }

  return (
    <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-12 py-10 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(79,126,255,0.2)] bg-[rgba(79,126,255,0.1)] px-3 py-1.5 text-[12px] text-[var(--accent)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            {status === 'queued' ? t.cloneProgress.queued : t.cloneProgress.processing}
          </div>
          <div className="mb-1 font-heading text-[22px] font-extrabold tracking-[-0.5px]">
            <span className="text-[var(--accent)]">{t.cloneProgress.task} {id.slice(0, 8)}...</span>
          </div>
            <div className="text-[13px] text-[var(--muted)]">
            {t.cloneProgress.taskId}: {id} · {currentStep}
          </div>
        </div>

        <div className="mb-5 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-7">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] text-[var(--muted)]">{t.cloneProgress.overallProgress}</span>
            <strong className="font-heading text-[15px] font-bold text-[var(--accent)]">
              {progress}%
            </strong>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded bg-[var(--border2)]">
            <div
              className="h-full rounded bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[12px] text-[var(--muted)]">{currentStep}</div>
        </div>

        <div className="mb-5 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
          {[
            { icon: '🔗', name: t.cloneProgress.stepScrape, done: ['scraping', 'analyzing', 'generating', 'testing', 'done'].includes(status) },
            { icon: '🧠', name: t.cloneProgress.stepAnalyze, done: ['analyzing', 'generating', 'testing', 'done'].includes(status) },
            { icon: '⚙️', name: t.cloneProgress.stepGenerate, done: ['generating', 'testing', 'done'].includes(status), active: status === 'generating' },
            { icon: '🧪', name: t.cloneProgress.stepTest, done: ['testing', 'done'].includes(status), active: status === 'testing' },
            { icon: '📦', name: t.cloneProgress.stepPackage, done: status === 'done', active: status === 'done' },
          ].map((step) => (
            <div key={step.name} className="flex items-start gap-4 border-b border-[var(--border)] px-6 py-5 last:border-b-0">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base ${
                  step.done
                    ? 'border border-[rgba(0,208,132,0.25)] bg-[rgba(0,208,132,0.12)]'
                    : step.active
                      ? 'border border-[rgba(79,126,255,0.3)] bg-[rgba(79,126,255,0.12)]'
                      : 'border border-[var(--border2)] bg-[var(--surface2)]'
                }`}
              >
                {step.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[14px] font-medium ${
                    step.done ? 'text-[var(--green)]' : step.active ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {step.name}
                </div>
                <div className="text-[12px] leading-[1.5] text-[var(--muted)]">
                  {step.done ? t.cloneProgress.completed : step.active ? t.cloneProgress.inProgress : t.cloneProgress.waiting}
                </div>
              </div>
              {step.done && <span className="text-[16px] text-[var(--green)]">✓</span>}
              {step.active && !step.done && (
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--border2)] border-t-[var(--accent)]" />
              )}
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--green)]" />
            <span className="text-[13px] font-medium text-[var(--muted)]">{t.cloneProgress.liveLog}</span>
          </div>
          <div className="max-h-[200px] overflow-y-auto px-5 py-4 font-mono text-[12px] leading-[1.8]">
            <div className="flex gap-3">
              <span className="shrink-0 text-[var(--border2)]">{new Date().toLocaleTimeString('zh-CN')}</span>
              <span className="text-[var(--muted)]">{currentStep}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            💰 {t.cloneProgress.realtimeCost}
          </div>
          <div className="mb-1 font-heading text-4xl font-extrabold">
            $0<sub className="text-[14px] font-normal text-[var(--muted)]"> {t.cloneProgress.mvpFree}</sub>
          </div>
          <div className="mb-3 text-[12px] text-[var(--muted)]">{t.cloneProgress.stripePhase}</div>
        </div>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {t.cloneProgress.taskInfo}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between border-b border-[var(--border)] py-2">
              <span className="text-[12px] text-[var(--muted)]">{t.cloneProgress.status}</span>
              <span className="text-[13px] text-[var(--accent)]">{status}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)] py-2">
              <span className="text-[12px] text-[var(--muted)]">{t.cloneProgress.taskId}</span>
              <span className="font-mono text-[13px]">{id}</span>
            </div>
          </div>
        </div>

        {status === 'done' && (
          <Link
            href={`/clone/${id}/result`}
            className="block w-full rounded-[10px] bg-[var(--accent)] px-4 py-2.5 text-center text-[13px] font-medium text-white transition-colors hover:bg-[#6B91FF]"
          >
            {t.cloneProgress.viewResult}
          </Link>
        )}
      </div>
    </div>
  );
}
