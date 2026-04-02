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

  const iconBgMap: Record<string, string> = {
    blue: 'bg-[rgba(59,130,246,0.12)] text-[var(--accent2)]',
    purple: 'bg-[rgba(168,85,247,0.12)] text-[var(--purple)]',
    green: 'bg-[rgba(34,197,94,0.12)] text-[var(--green)]',
    orange: 'bg-[rgba(249,115,22,0.12)] text-[var(--accent)]',
  };

  return (
    <>
      {/* ===== HERO SECTION ===== */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 lg:px-12 pb-20 pt-[100px]">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_0%,transparent_70%)] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:60px_60px]" />
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-[var(--accent)] opacity-[0.04] blur-[120px]" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-[var(--purple)] opacity-[0.04] blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-[860px] text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--accent)] animate-fade-in">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
            {t.home.badge}
          </div>

          {/* Title */}
          <h1 className="mb-6 font-heading text-[56px] sm:text-[68px] font-extrabold leading-[1.05] tracking-[-2px] text-[var(--text)] animate-slide-up">
            {t.home.heroTitle}
            <br />
            <em className="not-italic bg-gradient-to-r from-[var(--accent)] via-[var(--accent-hover)] to-[var(--yellow)] bg-clip-text text-transparent">
              {t.home.heroTitleAccent}
            </em>
          </h1>

          {/* Description */}
          <p className="mx-auto mb-12 max-w-[540px] text-lg font-light leading-[1.7] text-[var(--text-secondary)] animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {t.home.heroDesc}
          </p>

          {/* URL Input */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <HeroUrlInput />
            <p className="text-xs text-[var(--muted)] mt-4">
              {t.home.firstTimeHint(pricing.onboardingDollar)}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-[var(--border-faint)] pt-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="font-heading text-3xl font-extrabold stat-number transition-transform duration-300 group-hover:scale-105">{stat.num}</div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WORKFLOW SECTION ===== */}
      <div className="mx-auto max-w-[1100px]">
        <section className="px-6 lg:px-12 py-24">
          <div className="section-label">{t.home.workflow}</div>
          <h2 className="section-title">{t.home.fourSteps}</h2>
          <p className="section-desc mb-14">{t.home.workflowDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="feature-card group cursor-default"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-5 font-heading text-[48px] font-extrabold leading-none text-[var(--border)] group-hover:text-[var(--accent-soft)] transition-colors duration-300">
                  {step.num}
                </div>
                <div className="mb-3 text-2xl group-hover:scale-110 transition-transform duration-300">{step.icon}</div>
                <div className="mb-2 font-heading text-[15px] font-bold text-[var(--text)]">{step.title}</div>
                <div className="text-[13px] leading-[1.6] text-[var(--muted)]">{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FEATURES SECTION ===== */}
        <section className="px-6 lg:px-12 pb-24">
          <div className="section-label">{t.home.capabilities}</div>
          <h2 className="section-title">{t.home.notJustScreenshot}</h2>
          <p className="section-desc mb-14">{t.home.capabilitiesDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat, i) => (
              <div
                key={feat.title}
                className="feature-card group cursor-default"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl text-lg transition-transform duration-300 group-hover:scale-110 ${iconBgMap[feat.iconBg]}`}>
                  {feat.icon}
                </div>
                <div className="mb-2 font-heading text-[15px] font-bold text-[var(--text)]">{feat.title}</div>
                <div className="mb-4 text-[13px] leading-[1.6] text-[var(--muted)]">{feat.desc}</div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-medium text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300">
                  {feat.tag}
                  <svg className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== PRICING SECTION ===== */}
        <section className="px-6 lg:px-12 pb-24">
          <div className="section-label">{t.home.pricingSection}</div>
          <h2 className="section-title">{t.home.payAsYouGo}</h2>
          <p className="section-desc mb-14">{t.home.pricingSectionDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Per-task pricing */}
            <div className="feature-card group">
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">{t.home.perTask}</div>
              <div className="mb-1 font-heading text-4xl font-extrabold text-[var(--text)]">
                ${pricing.cloneRanges.static_single.minDollar}<sub className="align-middle text-base font-normal text-[var(--muted)]"> {t.home.from}</sub>
              </div>
              <div className="mb-6 text-[13px] text-[var(--muted)]">{t.home.dynamicPricing(pricing.onboardingDollar)}</div>
              <ul className="flex flex-col gap-3">
                {cloneRangeItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-[var(--muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    <svg className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Hosting pricing */}
            <div className="feature-card group relative border-[var(--accent-border)] bg-[var(--accent-soft)]">
              <div className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                {t.home.hostingService}
              </div>
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">{t.home.platformHosting}</div>
              <div className="mb-1 font-heading text-4xl font-extrabold text-[var(--text)]">
                ${s}<sub className="align-middle text-base font-normal text-[var(--muted)]">{t.home.perMonth}</sub>
              </div>
              <div className="mb-6 text-[13px] text-[var(--muted)]">{t.home.hostingDesc(s, g, b, pr)}</div>
              <ul className="flex flex-col gap-3">
                {t.home.hostingFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-[var(--muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    <svg className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* ===== CTA SECTION ===== */}
      <section className="mx-6 lg:mx-12 mb-24 relative overflow-hidden rounded-[20px] border border-[var(--accent-border)] bg-[var(--surface)] p-12 lg:p-20 text-center group">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--purple-soft)] opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="pointer-events-none absolute top-0 right-0 h-[200px] w-[200px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[80px] group-hover:opacity-[0.12] transition-opacity duration-500" />

        <div className="relative z-10">
          <h2 className="mb-4 font-heading text-[36px] lg:text-[44px] font-extrabold tracking-[-1.5px] text-[var(--text)]">
            {t.home.ctaTitle}
          </h2>
          <p className="mb-10 text-base text-[var(--text-secondary)] max-w-[480px] mx-auto">
            {t.home.ctaDesc}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/clone/new" className="btn-primary text-[15px] px-8 py-3.5">
              {t.home.ctaTry(pricing.onboardingDollar)}
            </Link>
            <Link href="/pricing" className="btn-secondary text-[15px] px-8 py-3.5">
              {t.home.viewPricing}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
