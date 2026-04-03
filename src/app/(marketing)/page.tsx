import Link from 'next/link';
import { getPublicPricing } from '@/lib/platform-admin';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';
import { HeroUrlInput } from '@/components/home/HeroUrlInput';

export default async function LandingPage() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  const pricing = await getPublicPricing();

  const p = pricing;
  const s = p.hostingPlans.static_starter?.monthlyDollar ?? '30';
  const g = p.hostingPlans.static_growth?.monthlyDollar ?? '50';
  const b = p.hostingPlans.dynamic_basic?.monthlyDollar ?? '500';
  const pr = p.hostingPlans.dynamic_pro?.monthlyDollar ?? '1000';

  const features: Array<{
    num: string;
    section: string;
    tag: string;
    title: string;
    desc: string;
    items: Array<{ icon: string; label: string; desc: string; tag: string }>;
  }> = [
    {
      num: '01',
      section: t.home.workflow,
      tag: 'Main Features',
      title: t.home.fourSteps,
      desc: t.home.workflowDesc,
      items: [
        { icon: '🔗', label: t.home.steps.input.title, desc: t.home.steps.input.desc, tag: '' },
        { icon: '🧠', label: t.home.steps.analyze.title, desc: t.home.steps.analyze.desc, tag: '' },
        { icon: '⚙️', label: t.home.steps.generate.title, desc: t.home.steps.generate.desc, tag: '' },
        { icon: '🚀', label: t.home.steps.deploy.title, desc: t.home.steps.deploy.desc, tag: '' },
      ],
    },
    {
      num: '02',
      section: t.home.capabilities,
      tag: 'Developer First',
      title: t.home.notJustScreenshot,
      desc: t.home.capabilitiesDesc,
      items: [
        { icon: '🔍', label: t.home.features.crawler.title, desc: t.home.features.crawler.desc, tag: t.home.features.crawler.tag },
        { icon: '🖥️', label: t.home.features.browser.title, desc: t.home.features.browser.desc, tag: t.home.features.browser.tag },
        { icon: '🔌', label: t.home.features.thirdParty.title, desc: t.home.features.thirdParty.desc, tag: t.home.features.thirdParty.tag },
        { icon: '🧪', label: t.home.features.test.title, desc: t.home.features.test.desc, tag: t.home.features.test.tag },
        { icon: '☁️', label: t.home.features.hosting.title, desc: t.home.features.hosting.desc, tag: t.home.features.hosting.tag },
        { icon: '📱', label: t.home.features.app.title, desc: t.home.features.app.desc, tag: t.home.features.app.tag },
      ],
    },
    {
      num: '03',
      section: 'Pricing',
      tag: 'Zero configuration',
      title: t.home.payAsYouGo,
      desc: t.home.pricingSectionDesc,
      items: [] as Array<{ icon: string; label: string; desc: string; tag: string }>,
    },
  ];

  const stats = [
    { num: '10 min', label: t.home.stats.avgTime },
    { num: '87%', label: t.home.stats.fidelity },
    { num: '50+', label: t.home.stats.services },
    { num: 'Next.js', label: t.home.stats.standardCode },
  ];

  const cloneRangeItems = [
    t.home.cloneRanges.staticSingle(p.cloneRanges.static_single.minDollar, p.cloneRanges.static_single.maxDollar),
    t.home.cloneRanges.staticMulti(p.cloneRanges.static_multi.minDollar, p.cloneRanges.static_multi.maxDollar),
    t.home.cloneRanges.dynamicBasic(p.cloneRanges.dynamic_basic.minDollar, p.cloneRanges.dynamic_basic.maxDollar),
    t.home.cloneRanges.dynamicComplex(p.cloneRanges.dynamic_complex.minDollar, p.cloneRanges.dynamic_complex.maxDollar),
    t.home.cloneRanges.refund,
  ];

  return (
    <>
      {/* ===== HERO SECTION ===== */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 lg:px-12 pt-[100px] pb-20">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_0%,transparent_70%)] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:60px_60px]" />
        <div className="pointer-events-none absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-[var(--accent)] opacity-[0.04] blur-[120px]" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-[var(--purple)] opacity-[0.04] blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-[900px] text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--accent)] animate-fade-in">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
            {t.home.badge}
          </div>

          {/* Title */}
          <h1 className="mb-6 font-heading text-[52px] sm:text-[64px] lg:text-[72px] font-extrabold leading-[1.05] tracking-[-2px] text-[var(--text)] animate-slide-up">
            {t.home.heroTitle}
            <br />
            <em className="not-italic bg-gradient-to-r from-[var(--accent)] via-[var(--accent-hover)] to-[var(--yellow)] bg-clip-text text-transparent">
              {t.home.heroTitleAccent}
            </em>
          </h1>

          {/* Description */}
          <p className="mx-auto mb-10 max-w-[560px] text-lg sm:text-xl font-light leading-[1.7] text-[var(--text-secondary)] animate-slide-up" style={{ animationDelay: '0.1s' }}>
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

      {/* ===== TRUSTED BY LOGOS ===== */}
      <section className="border-y border-[var(--border-faint)] bg-[var(--surface)] py-10 overflow-hidden">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
          <p className="text-center text-[12px] font-medium uppercase tracking-[2px] text-[var(--muted-dark)] mb-8">
            Trusted by developers worldwide
          </p>
          <div className="relative">
            <div className="flex gap-12 animate-[shimmer_20s_linear_infinite] w-max">
              {['Next.js', 'Vercel', 'Stripe', 'Supabase', 'Tailwind', 'React', 'Node.js', 'TypeScript', 'Prisma', 'Railway', 'Next.js', 'Vercel', 'Stripe', 'Supabase', 'Tailwind', 'React', 'Node.js', 'TypeScript', 'Prisma', 'Railway'].map((name, i) => (
                <div key={i} className="flex items-center gap-2 text-[var(--muted-dark)] opacity-40 hover:opacity-80 transition-opacity shrink-0">
                  <div className="h-6 w-6 rounded-md bg-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--muted)]">
                    {name[0]}
                  </div>
                  <span className="text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE SECTIONS (Firecrawl style with numbered tabs) ===== */}
      <div className="mx-auto max-w-[1200px]">
        {/* Section 01: Workflow */}
        <section className="px-6 lg:px-12 py-24">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px] font-semibold text-[var(--muted)]">[{features[0].num} / 03]</span>
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">{features[0].tag}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <h2 className="font-heading text-[40px] lg:text-[48px] font-extrabold leading-[1.1] tracking-[-1.5px] mb-6">
                {features[0].title}
              </h2>
              <p className="text-[16px] leading-[1.7] text-[var(--muted)] mb-10 max-w-[440px]">
                {features[0].desc}
              </p>
              <div className="flex flex-col gap-4">
                {features[0].items.map((item, i) => (
                  <div key={i} className="feature-card !p-5 group cursor-default">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                      <div>
                        <div className="font-heading text-[15px] font-bold text-[var(--text)] mb-1">{item.label}</div>
                        <div className="text-[13px] leading-[1.6] text-[var(--muted)]">{item.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Code/visual block */}
            <div className="feature-card !p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-faint)] bg-[var(--surface-raised)]">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--red)]/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--yellow)]/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--green)]/60" />
                <span className="ml-2 text-[11px] text-[var(--muted)] font-mono">clone-flow.ts</span>
              </div>
              <div className="p-6 font-mono text-[13px] leading-[1.8] text-[var(--text-secondary)] bg-[var(--bg)]">
                <div><span className="text-[var(--purple)]">const</span> <span className="text-[var(--accent2)]">clone</span> = <span className="text-[var(--purple)]">await</span> <span className="text-[var(--accent)]">webEcho</span>.<span className="text-[var(--accent2)]">clone</span>({'{'}</div>
                <div className="pl-4"><span className="text-[var(--accent2)]">url</span>: <span className="text-[var(--green)]">'https://example.com'</span>,</div>
                <div className="pl-4"><span className="text-[var(--accent2)]">framework</span>: <span className="text-[var(--green)]">'nextjs'</span>,</div>
                <div className="pl-4"><span className="text-[var(--accent2)]">detectThirdParty</span>: <span className="text-[var(--purple)]">true</span>,</div>
                <div className="pl-4"><span className="text-[var(--accent2)]">autoTest</span>: <span className="text-[var(--purple)]">true</span>,</div>
                <div>{'}'});</div>
                <div className="mt-2"><span className="text-[var(--muted-dark)]">// → {`{ status: 'done', quality: 92 }`}</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 02: Capabilities */}
        <section className="px-6 lg:px-12 py-24 border-t border-[var(--border-faint)]">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px] font-semibold text-[var(--muted)]">[{features[1].num} / 03]</span>
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">{features[1].tag}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <h2 className="font-heading text-[40px] lg:text-[48px] font-extrabold leading-[1.1] tracking-[-1.5px] mb-6">
                {features[1].title}
              </h2>
              <p className="text-[16px] leading-[1.7] text-[var(--muted)] mb-10 max-w-[440px]">
                {features[1].desc}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features[1].items.map((feat, i) => (
                <div key={feat.label} className="feature-card group cursor-default" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="mb-3 text-xl group-hover:scale-110 transition-transform duration-300">{feat.icon}</div>
                  <div className="mb-1.5 font-heading text-[14px] font-bold text-[var(--text)]">{feat.label}</div>
                  <div className="mb-3 text-[12px] leading-[1.6] text-[var(--muted)]">{feat.desc}</div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300">
                    {feat.tag}
                    <svg className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 03: Pricing */}
        <section className="px-6 lg:px-12 py-24 border-t border-[var(--border-faint)]">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px] font-semibold text-[var(--muted)]">[{features[2].num} / 03]</span>
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">{features[2].tag}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <h2 className="font-heading text-[40px] lg:text-[48px] font-extrabold leading-[1.1] tracking-[-1.5px] mb-6">
                {features[2].title}
              </h2>
              <p className="text-[16px] leading-[1.7] text-[var(--muted)] mb-10 max-w-[440px]">
                {features[2].desc}
              </p>
              <div className="feature-card !p-6">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">{t.home.perTask}</div>
                <div className="mb-1 font-heading text-4xl font-extrabold text-[var(--text)]">
                  ${pricing.cloneRanges.static_single.minDollar}<sub className="align-middle text-base font-normal text-[var(--muted)]"> {t.home.from}</sub>
                </div>
                <div className="mb-6 text-[13px] text-[var(--muted)]">{t.home.dynamicPricing(pricing.onboardingDollar)}</div>
                <ul className="flex flex-col gap-3">
                  {cloneRangeItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-[var(--muted)]">
                      <svg className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {/* Hosting card */}
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
              {/* Code block */}
              <div className="feature-card !p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-faint)] bg-[var(--surface-raised)]">
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--red)]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--yellow)]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--green)]/60" />
                  <span className="ml-2 text-[11px] text-[var(--muted)] font-mono">pricing.json</span>
                </div>
                <div className="p-6 font-mono text-[13px] leading-[1.8] text-[var(--text-secondary)] bg-[var(--bg)]">
                  <div>{'{'}</div>
                  <div className="pl-4"><span className="text-[var(--accent2)]">"model"</span>: <span className="text-[var(--green)]">"pay-per-use"</span>,</div>
                  <div className="pl-4"><span className="text-[var(--accent2)]">"static"</span>: <span className="text-[var(--green)]">"$1 – $15"</span>,</div>
                  <div className="pl-4"><span className="text-[var(--accent2)]">"dynamic"</span>: <span className="text-[var(--green)]">"$10 – $100+"</span>,</div>
                  <div className="pl-4"><span className="text-[var(--accent2)]">"hosting"</span>: <span className="text-[var(--green)]">"from ${s}/mo"</span>,</div>
                  <div className="pl-4"><span className="text-[var(--accent2)]">"refund"</span>: <span className="text-[var(--purple)]">true</span></div>
                  <div>{'}'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== OPEN SOURCE / COMMUNITY SECTION ===== */}
      <section className="border-t border-[var(--border-faint)] py-24">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="section-label mb-4">Open Source</div>
              <h2 className="font-heading text-[36px] lg:text-[44px] font-extrabold leading-[1.1] tracking-[-1.5px] mb-6">
                Code you can <em className="not-italic bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] bg-clip-text text-transparent">trust</em>
              </h2>
              <p className="text-[16px] leading-[1.7] text-[var(--muted)] mb-8 max-w-[440px]">
                Built transparently. Every line of generated code is standard Next.js + Tailwind — no lock-in, no proprietary runtime.
              </p>
              <div className="flex gap-4">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  View on GitHub
                </a>
                <Link href="/docs" className="btn-secondary">
                  Read docs
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="feature-card !p-5 text-center">
                <div className="text-3xl font-heading font-extrabold stat-number mb-1">10 min</div>
                <div className="text-[12px] text-[var(--muted)]">Avg delivery time</div>
              </div>
              <div className="feature-card !p-5 text-center">
                <div className="text-3xl font-heading font-extrabold text-[var(--green)] mb-1">87%</div>
                <div className="text-[12px] text-[var(--muted)]">Visual fidelity</div>
              </div>
              <div className="feature-card !p-5 text-center">
                <div className="text-3xl font-heading font-extrabold text-[var(--accent2)] mb-1">50+</div>
                <div className="text-[12px] text-[var(--muted)]">Services detected</div>
              </div>
              <div className="feature-card !p-5 text-center">
                <div className="text-3xl font-heading font-extrabold text-[var(--purple)] mb-1">3x</div>
                <div className="text-[12px] text-[var(--muted)]">Auto-retry on fail</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="mx-6 lg:mx-12 mb-24 relative overflow-hidden rounded-[20px] border border-[var(--accent-border)] bg-[var(--surface)] p-12 lg:p-20 text-center group">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--purple-soft)] opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="pointer-events-none absolute top-0 right-0 h-[200px] w-[200px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[80px] group-hover:opacity-[0.12] transition-opacity duration-500" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[150px] w-[150px] rounded-full bg-[var(--purple)] opacity-[0.04] blur-[60px] group-hover:opacity-[0.10] transition-opacity duration-500" />

        <div className="relative z-10">
          <h2 className="mb-4 font-heading text-[36px] lg:text-[48px] font-extrabold tracking-[-1.5px] text-[var(--text)]">
            {t.home.ctaTitle}
          </h2>
          <p className="mb-10 text-base text-[var(--text-secondary)] max-w-[480px] mx-auto">
            {t.home.ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
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
