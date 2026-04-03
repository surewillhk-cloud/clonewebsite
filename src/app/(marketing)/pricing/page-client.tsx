'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface PricingData {
  cloneRanges: Record<string, { minDollar: string; maxDollar: string }>;
  hostingPlans: Record<string, { monthlyDollar: string }>;
  onboardingDollar: string;
}

export default function PricingPageClient({ pricing }: { pricing: PricingData }) {
  const t = useTranslation();
  const pp = t.pricingPage;
  const p = pricing;

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tableRows = [
    { type: pp.types.staticSingle, proxy: '~$0.01', ai: '~$0.40', price: `$${p.cloneRanges.static_single.minDollar} - $${p.cloneRanges.static_single.maxDollar}` },
    { type: pp.types.staticMulti, proxy: '~$0.04', ai: '~$0.80', price: `$${p.cloneRanges.static_multi.minDollar} - $${p.cloneRanges.static_multi.maxDollar}` },
    { type: pp.types.dynamicBasic, proxy: '~$0.16', ai: '~$2.50', price: `$${p.cloneRanges.dynamic_basic.minDollar} - $${p.cloneRanges.dynamic_basic.maxDollar}` },
    { type: pp.types.dynamicComplex, proxy: '~$0.40', ai: '~$5.50', price: `$${p.cloneRanges.dynamic_complex.minDollar} - $${p.cloneRanges.dynamic_complex.maxDollar}` },
  ];

  const cloneCards = [
    { emoji: '📄', ...pp.cloneCards.staticSingle, range: `$${p.cloneRanges.static_single.minDollar}`, rangeSub: ` - $${p.cloneRanges.static_single.maxDollar}`, cost: '$0.53', highlight: false },
    { emoji: '🗂', ...pp.cloneCards.staticMulti, range: `$${p.cloneRanges.static_multi.minDollar}`, rangeSub: ` - $${p.cloneRanges.static_multi.maxDollar}`, cost: '$1.13', highlight: false },
    { emoji: '⚡', ...pp.cloneCards.dynamicBasic, range: `$${p.cloneRanges.dynamic_basic.minDollar}`, rangeSub: ` - $${p.cloneRanges.dynamic_basic.maxDollar}`, cost: '$3.44', highlight: true },
    { emoji: '🏗', ...pp.cloneCards.dynamicComplex, range: `$${p.cloneRanges.dynamic_complex.minDollar}`, rangeSub: ` - $${p.cloneRanges.dynamic_complex.maxDollar}`, cost: '$7.45', highlight: false },
  ];

  const plans = [
    { ...pp.plans.light, featured: false, popular: undefined as string | undefined },
    { ...pp.plans.pro, featured: true, popular: (pp.plans.pro as { popular?: string }).popular },
    { ...pp.plans.team, featured: false, popular: undefined as string | undefined },
  ];

  const staticHosting = [
    { ...pp.hostingPlans.staticStarter, price: `$${p.hostingPlans.static_starter?.monthlyDollar ?? '30'}`, railway: '~$5' },
    { ...pp.hostingPlans.staticGrowth, price: `$${p.hostingPlans.static_growth?.monthlyDollar ?? '50'}`, railway: '~$10' },
  ];

  const dynamicHosting = [
    { ...pp.hostingPlans.dynamicBasic, price: `$${p.hostingPlans.dynamic_basic?.monthlyDollar ?? '500'}`, railway: '~$50' },
    { ...pp.hostingPlans.dynamicPro, price: `$${p.hostingPlans.dynamic_pro?.monthlyDollar ?? '1000'}`, railway: '~$150' },
  ];

  return (
    <div className="max-w-[1200px] px-6 lg:px-12 pb-20 pt-[100px]">
      {/* ===== HEADER ===== */}
      <div className="mb-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--accent)]">
          {pp.badge}
        </div>
        <h1 className="mb-4 font-heading text-[48px] sm:text-[56px] lg:text-[64px] font-extrabold tracking-[-2px] text-[var(--text)]">
          {pp.title}
        </h1>
        <p className="mx-auto max-w-[560px] text-lg leading-[1.7] text-[var(--text-secondary)]">{pp.desc}</p>
      </div>

      {/* ===== PRICING FORMULA ===== */}
      <section className="mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="feature-card group">
            <h3 className="mb-3 font-heading text-[22px] font-extrabold text-[var(--text)]">{pp.whyNoFixed}</h3>
            <p className="mb-4 text-[14px] leading-[1.7] text-[var(--muted)]">{pp.whyNoFixedP1}</p>
            <p className="mb-6 text-[14px] leading-[1.7] text-[var(--muted)]">{pp.whyNoFixedP2}</p>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5 font-mono text-[13px] text-[var(--text-secondary)]">
              <div><span className="text-[var(--orange)]">{pp.formula}</span> {pp.formulaEquals} <span className="text-[var(--accent)]">{pp.actualCost}</span> × <span className="text-[var(--accent)]">{pp.multiplier}</span></div>
              <div className="mt-2 text-[11px] text-[var(--muted-dark)]">{'// '}{pp.formulaComment1}</div>
              <div className="text-[11px] text-[var(--muted-dark)]">{'// '}{pp.formulaComment2}</div>
            </div>
          </div>

          {/* Cost breakdown table */}
          <div className="feature-card !p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-faint)] bg-[var(--surface-raised)]">
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--red)]/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--yellow)]/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--green)]/60" />
              <span className="ml-2 text-[11px] text-[var(--muted)] font-mono">cost-breakdown.json</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-faint)]">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-dark)]">{pp.tableType}</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-dark)]">{pp.tableProxy}</th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-dark)]">{pp.tableAi}</th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-dark)]">{pp.tablePrice}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.type} className="border-b border-[var(--border-faint)] last:border-b-0 hover:bg-[var(--surface-raised)] transition-colors">
                      <td className="px-5 py-3.5 text-[13px] font-medium text-[var(--text)]">{row.type}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--muted)] font-mono">{row.proxy}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--muted)] font-mono">{row.ai}</td>
                      <td className="px-5 py-3.5 text-right text-[13px] font-semibold text-[var(--accent)]">{row.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CLONE FEES CARDS ===== */}
      <section className="mb-20">
        <div className="section-label mb-3">{pp.cloneFees}</div>
        <h2 className="section-title mb-3">{pp.cloneFees}</h2>
        <p className="section-desc mb-10">{pp.cloneFeesDesc}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cloneCards.map((item) => (
            <div key={item.name} className={`feature-card group ${item.highlight ? 'border-[var(--accent-border)] bg-[var(--accent-soft)]' : ''}`}>
              <div className="mb-4 text-2xl group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
              <div className="font-heading text-[15px] font-bold text-[var(--text)] mb-1">{item.name}</div>
              <div className={`font-heading text-[28px] font-extrabold mb-3 ${item.highlight ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                {item.range}<sub className="text-[13px] font-normal text-[var(--muted)]">{item.rangeSub}</sub>
              </div>
              <div className="mb-4 text-[12px] leading-[1.5] text-[var(--muted)]">{item.desc}</div>
              <div className="rounded-lg bg-[var(--bg)] px-3 py-2 text-[11px] text-[var(--muted)] font-mono">
                {pp.costAbout(item.cost)}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--border)] px-2.5 py-0.5 text-[10px] text-[var(--muted)]">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== ONBOARDING TRIAL ===== */}
      <section className="mb-20">
        <div className="feature-card group relative overflow-hidden border-[var(--accent-border)] bg-[var(--accent-soft)] text-center !p-12 lg:!p-16">
          <div className="pointer-events-none absolute top-0 right-0 h-[200px] w-[200px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[80px] group-hover:opacity-[0.12] transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">{pp.onboarding}</div>
            <div className="mb-1 font-heading text-[56px] font-extrabold stat-number">${p.onboardingDollar}</div>
            <div className="mb-2 text-[13px] text-[var(--muted)]">{pp.onboardingSub}</div>
            <p className="mb-8 text-[15px] text-[var(--text-secondary)] max-w-[400px] mx-auto">{pp.onboardingDesc}</p>
            <Link href="/clone/new" className="btn-primary text-[15px] px-10 py-3.5 inline-block">
              {pp.tryNow}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MONTHLY PLANS ===== */}
      <section className="mb-20">
        <div className="section-label mb-3">{pp.monthlyTitle}</div>
        <h2 className="section-title mb-3">{pp.monthlyTitle}</h2>
        <p className="section-desc mb-10">{pp.monthlyDesc}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`feature-card group relative ${
                plan.featured
                  ? 'border-[var(--accent-border)] bg-[var(--accent-soft)]'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-4 py-1 text-[11px] font-semibold text-white shadow-sm whitespace-nowrap">
                  {plan.popular}
                </div>
              )}
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{plan.name}</div>
              <div className="mb-1 font-heading text-4xl font-extrabold text-[var(--text)]">
                {plan.price}<sub className="text-[14px] font-normal text-[var(--muted)]">{plan.sub}</sub>
              </div>
              <div className="mb-6 text-[13px] text-[var(--muted)]">{pp.planMultiplier(plan.multiplier)}</div>
              <div className="mb-6 flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-[13px] text-[var(--muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    <svg className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
              <button
                className={`w-full rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-300 ${
                  plan.featured
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-sm hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:-translate-y-0.5'
                    : 'border border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]'
                }`}
              >
                {plan.subscribe}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOSTING PLANS ===== */}
      <section className="mb-20">
        <div className="section-label mb-3">{pp.hostingTitle}</div>
        <h2 className="section-title mb-3">{pp.hostingTitle}</h2>
        <p className="section-desc mb-10">{pp.hostingDesc}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Static */}
          <div className="feature-card !p-0 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--border-faint)] p-6 bg-[var(--surface-raised)]">
              <span className="rounded-lg bg-[var(--green-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--green)]">{pp.classA}</span>
              <div>
                <div className="font-heading text-base font-bold text-[var(--text)]">{pp.staticSite}</div>
                <div className="text-[12px] text-[var(--muted)]">{pp.staticSiteDesc}</div>
              </div>
            </div>
            <div className="p-4">
              {staticHosting.map((h) => (
                <div key={h.name} className="flex items-center justify-between rounded-xl px-4 py-4 transition-colors hover:bg-[var(--surface-raised)] group/item">
                  <div>
                    <div className="mb-1 font-medium text-[var(--text)] group-hover/item:text-[var(--accent)] transition-colors">{h.name}</div>
                    <div className="text-[12px] text-[var(--muted)]">{h.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-xl font-extrabold text-[var(--text)]">{h.price}<sub className="text-[12px] font-normal text-[var(--muted)]">{pp.perMonth}</sub></div>
                    <div className="text-[11px] text-[var(--muted)]">{pp.railwayNote(h.railway)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic */}
          <div className="feature-card !p-0 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--border-faint)] p-6 bg-[var(--surface-raised)]">
              <span className="rounded-lg bg-[var(--orange-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--orange)]">{pp.classB}</span>
              <div>
                <div className="font-heading text-base font-bold text-[var(--text)]">{pp.dynamicSite}</div>
                <div className="text-[12px] text-[var(--muted)]">{pp.dynamicSiteDesc}</div>
              </div>
            </div>
            <div className="p-4">
              {dynamicHosting.map((h) => (
                <div key={h.name} className="flex items-center justify-between rounded-xl px-4 py-4 transition-colors hover:bg-[var(--surface-raised)] group/item">
                  <div>
                    <div className="mb-1 font-medium text-[var(--text)] group-hover/item:text-[var(--accent)] transition-colors">{h.name}</div>
                    <div className="text-[12px] text-[var(--muted)]">{h.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-xl font-extrabold text-[var(--orange)]">{h.price}<sub className="text-[12px] font-normal text-[var(--muted)]">{pp.perMonth}</sub></div>
                    <div className="text-[11px] text-[var(--muted)]">{pp.railwayNote(h.railway)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="mb-20">
        <div className="section-label mb-3">{pp.faq}</div>
        <h2 className="section-title mb-10">{pp.faq}</h2>
        <div className="max-w-[800px] space-y-0">
          {pp.faqs.map((faq, i) => (
            <div
              key={faq.q}
              className="border-b border-[var(--border-faint)] cursor-pointer group"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="flex justify-between items-center py-5">
                <span className="text-[15px] font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-[var(--muted)] shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openFaq === i ? 'max-h-[300px] pb-5 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-[14px] leading-[1.7] text-[var(--muted)]">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="relative overflow-hidden rounded-[20px] border border-[var(--accent-border)] bg-[var(--surface)] p-12 lg:p-16 text-center group">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--purple-soft)] opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="pointer-events-none absolute top-0 right-0 h-[200px] w-[200px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[80px] group-hover:opacity-[0.12] transition-opacity duration-500" />
        <div className="relative z-10">
          <h2 className="mb-4 font-heading text-[36px] lg:text-[44px] font-extrabold tracking-[-1.5px] text-[var(--text)]">
            {t.home.ctaTitle}
          </h2>
          <p className="mb-10 text-base text-[var(--text-secondary)] max-w-[480px] mx-auto">
            {t.home.ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/clone/new" className="btn-primary text-[15px] px-8 py-3.5">
              {t.home.ctaTry(p.onboardingDollar)}
            </Link>
            <Link href="/" className="btn-secondary text-[15px] px-8 py-3.5">
              {t.home.viewPricing}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
