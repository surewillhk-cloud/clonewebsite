import Link from 'next/link';
import { getPublicPricing } from '@/lib/platform-admin';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import { HeroUrlInput } from '@/components/home/HeroUrlInput';

export default async function LandingPage() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const pricing = await getPublicPricing();

  const steps = [
    { num: '01', icon: '🔗', ...t.home.steps.input },
    { num: '02', icon: '🧠', ...t.home.steps.analyze },
    { num: '03', icon: '⚙️', ...t.home.steps.generate },
    { num: '04', icon: '🚀', ...t.home.steps.deploy },
  ];

  const features = [
    { icon: '🔍', iconBg: 'blue' as const, ...t.home.features.crawler },
    { icon: '🖥️', iconBg: 'purple' as const, ...t.home.features.browser },
    { icon: '🔌', iconBg: 'green' as const, ...t.home.features.thirdParty },
    { icon: '🧪', iconBg: 'orange' as const, ...t.home.features.test },
    { icon: '☁️', iconBg: 'blue' as const, ...t.home.features.hosting },
    { icon: '📱', iconBg: 'purple' as const, ...t.home.features.app },
  ];

  const stats = [
    { num: '10 min', label: t.home.stats.avgTime },
    { num: '87%', label: t.home.stats.fidelity },
    { num: '50+', label: t.home.stats.services },
    { num: 'Next.js', label: t.home.stats.standardCode },
  ];

  const p = pricing;
  const cloneRangeItems = [
    t.home.cloneRanges.staticSingle(p.cloneRanges.static_single.minDollar, p.cloneRanges.static_single.maxDollar),
    t.home.cloneRanges.staticMulti(p.cloneRanges.static_multi.minDollar, p.cloneRanges.static_multi.maxDollar),
    t.home.cloneRanges.dynamicBasic(p.cloneRanges.dynamic_basic.minDollar, p.cloneRanges.dynamic_basic.maxDollar),
    t.home.cloneRanges.dynamicComplex(p.cloneRanges.dynamic_complex.minDollar, p.cloneRanges.dynamic_complex.maxDollar),
    t.home.cloneRanges.refund,
  ];

  const s = p.hostingPlans.static_starter?.monthlyDollar ?? '30';
  const g = p.hostingPlans.static_growth?.monthlyDollar ?? '50';
  const b = p.hostingPlans.dynamic_basic?.monthlyDollar ?? '500';
  const pr = p.hostingPlans.dynamic_pro?.monthlyDollar ?? '1000';

  return (
    <>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-12 pb-20 pt-[100px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(79,126,255,0.12)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_20%,black_0%,transparent_70%)] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative z-10 mx-auto max-w-[860px] text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(79,126,255,0.3)] bg-[rgba(79,126,255,0.08)] px-3.5 py-1.5 text-xs font-medium tracking-wide text-[#7BA7FF]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
            {t.home.badge}
          </div>
          <h1 className="mb-6 font-heading text-[68px] font-extrabold leading-[1.05] tracking-[-2px] text-[var(--text)]">
            {t.home.heroTitle}
            <br />
            <em className="not-italic text-[var(--accent)]">{t.home.heroTitleAccent}</em>
          </h1>
          <p className="mx-auto mb-12 max-w-[540px] text-lg font-light leading-[1.7] text-[var(--muted)]">
            {t.home.heroDesc}
          </p>
          <HeroUrlInput />
          <p className="text-xs text-[var(--muted)]">
            {t.home.firstTimeHint(pricing.onboardingDollar)}
          </p>
          <div className="mt-16 flex justify-center gap-16 border-t border-[var(--border)] pt-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-3xl font-extrabold text-[var(--text)]">{stat.num}</div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px]">
        <section className="px-12 py-24">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">{t.home.workflow}</div>
          <h2 className="mb-4 font-heading text-[40px] font-extrabold tracking-[-1px]">{t.home.fourSteps}</h2>
          <p className="mb-14 max-w-[480px] text-base text-[var(--muted)]">{t.home.workflowDesc}</p>
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)]">
            {steps.map((step) => (
              <div key={step.num} className="relative bg-[var(--surface)] p-8">
                <div className="mb-5 font-heading text-[48px] font-extrabold leading-none text-[var(--border2)]">{step.num}</div>
                <div className="mb-3 text-2xl">{step.icon}</div>
                <div className="mb-2 font-heading text-[15px] font-bold">{step.title}</div>
                <div className="text-[13px] leading-[1.6] text-[var(--muted)]">{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-12 pb-24">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">{t.home.capabilities}</div>
          <h2 className="mb-4 font-heading text-[40px] font-extrabold tracking-[-1px]">{t.home.notJustScreenshot}</h2>
          <p className="mb-14 max-w-[480px] text-base text-[var(--muted)]">{t.home.capabilitiesDesc}</p>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)]">
            {features.map((feat) => (
              <div key={feat.title} className="bg-[var(--surface)] p-8 transition-colors hover:bg-[var(--surface2)]">
                <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-[10px] text-lg ${
                  feat.iconBg === 'blue' ? 'bg-[rgba(79,126,255,0.15)]' :
                  feat.iconBg === 'purple' ? 'bg-[rgba(123,92,255,0.15)]' :
                  feat.iconBg === 'green' ? 'bg-[rgba(0,208,132,0.15)]' :
                  'bg-[rgba(255,122,61,0.15)]'
                }`}>{feat.icon}</div>
                <div className="mb-2 font-heading text-[15px] font-bold">{feat.title}</div>
                <div className="mb-4 text-[13px] leading-[1.6] text-[var(--muted)]">{feat.desc}</div>
                <span className="inline-block rounded-full bg-[rgba(79,126,255,0.1)] px-2.5 py-1 text-[11px] text-[var(--accent)]">{feat.tag}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="px-12 pb-24">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">{t.home.pricingSection}</div>
          <h2 className="mb-4 font-heading text-[40px] font-extrabold tracking-[-1px]">{t.home.payAsYouGo}</h2>
          <p className="mb-14 max-w-[480px] text-base text-[var(--muted)]">{t.home.pricingSectionDesc}</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 transition-[border-color] hover:border-[var(--border2)]">
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">{t.home.perTask}</div>
              <div className="mb-1 font-heading text-4xl font-extrabold">
                ${pricing.cloneRanges.static_single.minDollar}<sub className="align-middle text-base font-normal text-[var(--muted)]"> {t.home.from}</sub>
              </div>
              <div className="mb-6 text-[13px] text-[var(--muted)]">{t.home.dynamicPricing(pricing.onboardingDollar)}</div>
              <ul className="flex flex-col gap-2.5">
                {cloneRangeItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-[var(--muted)]">
                    <span className="text-[var(--accent)]">→</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl border border-[var(--accent)] bg-[rgba(79,126,255,0.04)] p-8">
              <div className="absolute right-5 top-5 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white">{t.home.hostingService}</div>
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">{t.home.platformHosting}</div>
              <div className="mb-1 font-heading text-4xl font-extrabold">
                ${s}<sub className="align-middle text-base font-normal text-[var(--muted)]">{t.home.perMonth}</sub>
              </div>
              <div className="mb-6 text-[13px] text-[var(--muted)]">{t.home.hostingDesc(s, g, b, pr)}</div>
              <ul className="flex flex-col gap-2.5">
                {t.home.hostingFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-[var(--muted)]">
                    <span className="text-[var(--accent)]">→</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-12 mb-24 rounded-[20px] border border-[rgba(79,126,255,0.2)] bg-gradient-to-br from-[rgba(79,126,255,0.12)] to-[rgba(123,92,255,0.08)] px-20 py-20 text-center">
        <h2 className="mb-4 font-heading text-[44px] font-extrabold tracking-[-1.5px]">{t.home.ctaTitle}</h2>
        <p className="mb-10 text-base text-[var(--muted)]">{t.home.ctaDesc}</p>
        <div className="flex justify-center gap-4">
          <Link href="/clone/new" className="rounded-[10px] bg-[var(--accent)] px-8 py-3.5 text-[15px] font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-[#6B91FF]">{t.home.ctaTry(pricing.onboardingDollar)}</Link>
          <Link href="/pricing" className="rounded-[10px] border border-[var(--border2)] px-8 py-3.5 text-[15px] font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)]">{t.home.viewPricing}</Link>
        </div>
      </section>
    </>
  );
}
