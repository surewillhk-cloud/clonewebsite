import Link from 'next/link';
import { getPublicPricing } from '@/lib/platform-admin';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';

export async function generateMetadata() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return {
    title: `${t.common.pricing} — CH007`,
    description: t.pricingPage.desc,
  };
}

export default async function PricingPage() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const pricing = await getPublicPricing();
  const pp = t.pricingPage;
  const p = pricing;

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
    <div className="max-w-[1100px] px-12 pb-20 pt-[100px]">
      <div className="mb-[72px] text-center">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">{pp.badge}</div>
        <h1 className="mb-4 font-heading text-[52px] font-extrabold tracking-[-2px]">{pp.title}</h1>
        <p className="mx-auto max-w-[500px] text-[17px] leading-[1.7] text-[var(--muted)]">{pp.desc}</p>
      </div>

      <div className="mb-12 grid grid-cols-2 gap-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10">
        <div>
          <h3 className="mb-3 font-heading text-[22px] font-extrabold">{pp.whyNoFixed}</h3>
          <p className="mb-4 text-[14px] leading-[1.7] text-[var(--muted)]">{pp.whyNoFixedP1}</p>
          <p className="mb-4 text-[14px] leading-[1.7] text-[var(--muted)]">{pp.whyNoFixedP2}</p>
          <div className="rounded-[10px] border border-[var(--border2)] bg-[var(--surface2)] p-4 font-mono text-[14px] text-[var(--text)]">
            <span><span className="text-[var(--orange)]">{pp.formula}</span> {pp.formulaEquals} <span className="text-[var(--accent)]">{pp.actualCost}</span> × <span className="text-[var(--accent)]">{pp.multiplier}</span></span>
            <span className="mt-1 block text-[12px] text-[var(--muted)]">{'// '}{pp.formulaComment1}</span>
            <span className="block text-[12px] text-[var(--muted)]">{'// '}{pp.formulaComment2}</span>
          </div>
        </div>
        <div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{pp.tableType}</th>
                <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{pp.tableProxy}</th>
                <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{pp.tableAi}</th>
                <th className="border-b border-[var(--border)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{pp.tablePrice}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.type}>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-[13px] font-medium text-[var(--text)]">{row.type}</td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-[13px] text-[var(--muted)]">{row.proxy}</td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-[13px] text-[var(--muted)]">{row.ai}</td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-right text-[13px] font-medium text-[var(--text)]">{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="mb-1.5 font-heading text-xl font-extrabold">{pp.cloneFees}</h2>
        <p className="mb-6 text-[14px] text-[var(--muted)]">{pp.cloneFeesDesc}</p>
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)]">
          {cloneCards.map((item) => (
            <div key={item.name} className={`bg-[var(--surface)] p-7 transition-colors hover:bg-[var(--surface2)] ${item.highlight ? 'bg-[rgba(255,122,61,0.04)]' : ''}`}>
              <div className="mb-4 text-2xl">{item.emoji}</div>
              <div className="font-heading text-[15px] font-bold">{item.name}</div>
              <div className={`my-3 font-heading text-[28px] font-extrabold ${item.highlight ? 'text-[var(--orange)]' : ''}`}>
                {item.range}<sub className="text-[13px] font-normal text-[var(--muted)]">{item.rangeSub}</sub>
              </div>
              <div className="mb-4 text-[12px] leading-[1.5] text-[var(--muted)]">{item.desc}</div>
              <div className="rounded-md bg-[var(--surface2)] px-3 py-2 text-[12px] text-[var(--muted)]">
                {pp.costAbout(item.cost)}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--surface2)] px-2 py-0.5 text-[10px] text-[var(--muted)]">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12 rounded-2xl border border-[rgba(79,126,255,0.2)] bg-gradient-to-br from-[rgba(79,126,255,0.1)] to-[rgba(123,92,255,0.06)] p-12 text-center">
        <h2 className="mb-2 font-heading text-3xl font-extrabold tracking-[-1px]">{pp.onboarding}</h2>
        <div className="mb-1 font-heading text-[48px] font-extrabold text-[var(--accent)]">${p.onboardingDollar}</div>
        <div className="mb-8 text-[13px] text-[var(--muted)]">{pp.onboardingSub}</div>
        <p className="mb-8 text-[15px] text-[var(--muted)]">{pp.onboardingDesc}</p>
        <Link href="/clone/new" className="inline-block rounded-[10px] bg-[var(--accent)] px-10 py-3.5 text-[15px] font-medium text-white">
          {pp.tryNow}
        </Link>
      </div>

      <div className="mb-12">
        <h2 className="mb-1.5 font-heading text-xl font-extrabold">{pp.monthlyTitle}</h2>
        <p className="mb-6 text-[14px] text-[var(--muted)]">{pp.monthlyDesc}</p>
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-[14px] border p-7 ${plan.featured ? 'border-[var(--accent)] bg-[rgba(79,126,255,0.03)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
              {plan.popular && <div className="absolute -top-px right-5 rounded-b-lg bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-white">{plan.popular}</div>}
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{plan.name}</div>
              <div className="mb-1 font-heading text-4xl font-extrabold">{plan.price}<sub className="text-[14px] font-normal text-[var(--muted)]">{plan.sub}</sub></div>
              <div className="mb-5 text-[13px] text-[var(--muted)]">{pp.planMultiplier(plan.multiplier)}</div>
              <div className="mb-6 flex flex-col gap-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-[13px] text-[var(--muted)]">
                    <span className="text-[var(--accent)]">→</span> {f}
                  </div>
                ))}
              </div>
              <button className={`w-full rounded-[10px] px-4 py-2.5 text-[13px] font-medium transition-colors ${
                plan.featured
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border2)] bg-transparent text-[var(--text)] hover:border-[var(--accent)]'
              }`}>
                {plan.subscribe}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <h2 className="mb-1.5 font-heading text-xl font-extrabold">{pp.hostingTitle}</h2>
        <p className="mb-6 text-[14px] text-[var(--muted)]">{pp.hostingDesc}</p>
        <div className="grid grid-cols-2 gap-6">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-3 border-b border-[var(--border)] p-6">
              <span className="rounded-md bg-[rgba(0,208,132,0.1)] px-3 py-1 text-[11px] font-bold text-[var(--green)]">{pp.classA}</span>
              <div>
                <div className="font-heading text-base font-bold">{pp.staticSite}</div>
                <div className="text-[12px] text-[var(--muted)]">{pp.staticSiteDesc}</div>
              </div>
            </div>
            <div className="p-4">
              {staticHosting.map((h) => (
                <div key={h.name} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-4 transition-colors hover:bg-[var(--surface2)]">
                  <div>
                    <div className="mb-1 font-medium">{h.name}</div>
                    <div className="text-[12px] text-[var(--muted)]">{h.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-xl font-extrabold">{h.price}<sub className="text-[12px] font-normal text-[var(--muted)]">{pp.perMonth}</sub></div>
                    <div className="text-[11px] text-[var(--muted)]">{pp.railwayNote(h.railway)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-3 border-b border-[var(--border)] p-6">
              <span className="rounded-md bg-[rgba(255,122,61,0.1)] px-3 py-1 text-[11px] font-bold text-[var(--orange)]">{pp.classB}</span>
              <div>
                <div className="font-heading text-base font-bold">{pp.dynamicSite}</div>
                <div className="text-[12px] text-[var(--muted)]">{pp.dynamicSiteDesc}</div>
              </div>
            </div>
            <div className="p-4">
              {dynamicHosting.map((h) => (
                <div key={h.name} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-4 transition-colors hover:bg-[var(--surface2)]">
                  <div>
                    <div className="mb-1 font-medium">{h.name}</div>
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
      </div>

      <div className="mb-20">
        <h2 className="mb-6 font-heading text-xl font-extrabold">{pp.faq}</h2>
        <div className="space-y-0 border-t border-[var(--border)]">
          {pp.faqs.map((faq) => (
            <div key={faq.q} className="cursor-pointer border-b border-[var(--border)] py-5">
              <div className="flex justify-between items-center text-[15px] font-medium">{faq.q}<span className="text-xl text-[var(--muted)]">+</span></div>
              <div className="mt-3 text-[14px] leading-[1.7] text-[var(--muted)]">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
