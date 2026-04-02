import { DeployCard } from '@/components/hosting/DeployCard';
import { HostDeployButton } from '@/components/hosting/HostDeployButton';
import { ClonePreviewButton } from '@/components/clone/ClonePreviewButton';
import { getTaskStatus } from '@/lib/task-store';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';

export default async function CloneResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const task = await getTaskStatus(id);
  const downloadHref = `/api/clone/${id}/download`;
  const qualityScore = task?.qualityScore ?? 85;

  return (
    <div className="max-w-[1200px] px-12 py-10">
      <div className="mb-8 flex items-center justify-between rounded-[14px] border border-[rgba(0,208,132,0.25)] bg-gradient-to-br from-[rgba(0,208,132,0.1)] to-[rgba(79,126,255,0.06)] px-8 py-7">
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(0,208,132,0.15)] text-[22px]">🎉</div>
          <div>
            <div className="font-heading text-lg font-extrabold">{t.cloneResult.successExclaim}</div>
            <div className="text-[13px] text-[var(--muted)]">
              {task?.currentStep || t.cloneResult.success}
              {task?.qualityScore != null ? ` · ${t.cloneResult.qualityScore(task.qualityScore)}` : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {task?.cloneType !== 'app' && <ClonePreviewButton taskId={id} />}
          <a
            href={downloadHref}
            className="inline-block rounded-[10px] bg-[var(--accent)] px-6 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#6B91FF]"
            download
          >
            ⬇ {task?.cloneType === 'app' ? t.cloneResult.downloadExpo : t.cloneResult.downloadWeb}
          </a>
          {task?.cloneType !== 'app' && <HostDeployButton taskId={id} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Preview Panel */}
        <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF4D6A]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFB800]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--green)]" />
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-md bg-[var(--surface2)] px-3 py-1.5 font-mono text-[12px] text-[var(--muted)]">
              🔒 preview.webecho.ai/task_8f3k2m
            </div>
            <div className="flex gap-1">
              <button className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--accent)] bg-[rgba(79,126,255,0.15)] text-[12px] text-[var(--accent)]">🖥</button>
              <button className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border2)] text-[12px] text-[var(--muted)]">📱</button>
            </div>
          </div>
          <div className="relative flex h-[520px] items-center justify-center bg-[#f0f0f5]">
            <div className="h-full w-full bg-gradient-to-b from-[#6772e5] to-[#6772e5] [mask-image:linear-gradient(black_0_60px,transparent_60px)]">
              <div className="h-[60px] bg-[#6772e5]" />
              <div className="bg-[#f6f9fc] px-20 pb-16 pt-14">
                <div className="mb-4 flex gap-8">
                  <div className="h-5 w-16 rounded-sm bg-white" />
                  <div className="flex gap-6">
                    {[1,2,3,4].map((i) => <div key={i} className="h-2.5 w-12 rounded-sm bg-white/40" />)}
                  </div>
                </div>
                <div className="mb-4 h-12 w-3/5 rounded-md bg-[#1a1f71]" />
                <div className="mb-8 h-7 w-2/5 rounded bg-[#e0e4f5]" />
                <div className="mb-16 flex gap-3">
                  <div className="h-11 w-[140px] rounded-md bg-[#6772e5]" />
                  <div className="h-11 w-[140px] rounded-md border-2 border-[#6772e5] bg-white" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className="rounded-lg bg-white p-5 shadow-md">
                      <div className="mb-3 h-8 w-8 rounded-lg bg-[#eef2ff]" />
                      <div className="mb-2 h-3 w-[70%] rounded bg-[#1a1f71]" />
                      <div className="mb-1.5 h-2 w-[90%] rounded bg-[#e0e4f5]" />
                      <div className="h-2 w-[65%] rounded bg-[#e0e4f5]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute right-3 top-3 rounded-lg bg-[rgba(0,208,132,0.9)] px-3 py-1.5 text-sm font-bold text-white">
              {t.cloneResult.scoreWithUnit(qualityScore)}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-4">
          {/* Quality Score */}
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">{t.cloneResult.qualityReport}</div>
            <div className="mb-4 flex items-center gap-5">
              <div className="relative h-[72px] w-[72px]">
                <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="var(--border)" strokeWidth="6" />
                  <circle cx="36" cy="36" r="30" fill="none" stroke="var(--green)" strokeWidth="6" strokeDasharray="188.5" strokeDashoffset="24.5" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-heading text-xl font-extrabold text-[var(--green)]">87</div>
              </div>
              <div>
                <div className="font-heading text-[14px] font-bold">{t.cloneResult.visualFidelity}</div>
                <div className="text-[12px] text-[var(--muted)]">{t.cloneResult.autoTestPassed}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { label: t.cloneResult.layoutStructure, val: 92 },
                { label: t.cloneResult.colorTheme, val: 95 },
                { label: t.cloneResult.typography, val: 88 },
                { label: t.cloneResult.interactivity, val: 74 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className="min-w-0 flex-1 text-[12px] text-[var(--muted)]">{item.label}</span>
                  <div className="h-1 w-[100px] overflow-hidden rounded bg-[var(--border2)]">
                    <div className="h-full rounded" style={{ width: `${item.val}%`, background: item.val >= 80 ? 'var(--green)' : 'var(--orange)' }} />
                  </div>
                  <span className={`w-7 text-right text-[12px] font-medium ${item.val >= 80 ? 'text-[var(--green)]' : 'text-[var(--orange)]'}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">{t.cloneResult.thirdPartyServices}</div>
            <div className="flex flex-col gap-2">
              {[
                { icon: '💳', name: 'Stripe', status: 'template' },
                { icon: '📊', name: 'Google Analytics 4', status: 'template' },
                { icon: '💬', name: 'Intercom', status: 'fallback' },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-2.5 rounded-lg bg-[var(--surface2)] px-2.5 py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface3)] text-[14px]">{s.icon}</div>
                  <span className="flex-1 text-[13px]">{s.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                    s.status === 'template' ? 'bg-[rgba(0,208,132,0.1)] text-[var(--green)]' : 'bg-[rgba(79,126,255,0.1)] text-[var(--accent)]'
                  }`}>{s.status === 'template' ? t.cloneResult.presetTemplate : t.cloneResult.fallbackPlan}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">{t.cloneResult.thisBill}</div>
            <div className="flex flex-col gap-1.5">
              {[
                ['Decodo 代理 (2,341 req)', '$0.19'],
                ['Firecrawl (14 页面)', '$0.04'],
                ['Playwright + Browser Session', '$0.22'],
                ['Claude API (12次, 118K tokens)', '$13.48'],
                ['Docker 测试容器', '$0.18'],
                ['利润率系数 (5x)', '×5'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-1 text-[12px]">
                  <span className="text-[var(--muted)]">{label}</span>
                  <span>{val}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[var(--border)] pt-2.5 mt-1 text-[14px] font-medium">
                <span className="text-[var(--text)]">{t.cloneResult.actualCharge}</span>
                <span className="font-heading text-xl font-bold text-[var(--orange)]">$35.55</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[rgba(0,208,132,0.15)] bg-[rgba(0,208,132,0.06)] px-3 py-2.5 text-[12px] text-[var(--green)]">
              {t.cloneResult.chargeSuccess('$35.55')}
            </div>
          </div>

          {/* Deploy Card */}
          <DeployCard taskId={id} hostingPlan="static_starter" />
        </div>
      </div>
    </div>
  );
}
