'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

/* ============================================
   Scroll-triggered animation hook
   ============================================ */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* ============================================
   Typing animation for terminal
   ============================================ */
function TerminalTyping({ lines, speed = 40 }: { lines: string[]; speed?: number }) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (currentLine >= lines.length) { setDone(true); return; }

    const line = lines[currentLine];
    if (currentChar <= line.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[currentLine] = line.slice(0, currentChar);
          return next;
        });
        setCurrentChar((c) => c + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentLine, currentChar, lines, speed, done]);

  return (
    <div className="font-mono text-[13px] leading-[1.8] text-[var(--text-secondary)]">
      {displayedLines.map((line, i) => (
        <div key={i} className="min-h-[1.8em]">
          <span className="text-[var(--muted-dark)] select-none">{String(i + 1).padStart(2, ' ')} </span>
          {highlightCode(line)}
        </div>
      ))}
      {!done && (
        <span className="inline-block w-2 h-4 bg-[var(--accent)] animate-pulse ml-1 align-middle" />
      )}
    </div>
  );
}

function highlightCode(code: string): React.ReactNode {
  if (!code) return null;

  const tokens: React.ReactNode[] = [];
  let remaining = code;
  let key = 0;

  const patterns = [
    { regex: /^(\/\/.*)/, className: 'text-[var(--muted-dark)]' },
    { regex: /^(const|await|from|import|true|false)/, className: 'text-[var(--purple)]' },
    { regex: /^('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/, className: 'text-[var(--green)]' },
    { regex: /^(\w+)(?=\s*[.(])/, className: 'text-[var(--accent)]' },
    { regex: /^(\w+)(?=:)/, className: 'text-[var(--accent2)]' },
    { regex: /^(\{|\}|\(|\)|\[|\]|;|,|\.|:)/, className: 'text-[var(--muted)]' },
    { regex: /^(\s+)/, className: '' },
    { regex: /^(\w+)/, className: 'text-[var(--text-secondary)]' },
    { regex: /^(.)/, className: 'text-[var(--text-secondary)]' },
  ];

  while (remaining.length > 0) {
    let matched = false;
    for (const { regex, className } of patterns) {
      const m = remaining.match(regex);
      if (m) {
        tokens.push(<span key={key++} className={className}>{m[1]}</span>);
        remaining = remaining.slice(m[1].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
  }

  return <>{tokens}</>;
}

/* ============================================
   Animated counter
   ============================================ */
function AnimatedNumber({ target, suffix = '', prefix = '', inView }: { target: number; suffix?: string; prefix?: string; inView: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <>{prefix}{value}{suffix}</>;
}

/* ============================================
   Mouse-tracking card glow
   ============================================ */
function GlowCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`feature-card group relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, rgba(249,115,22,0.06), transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
}

/* ============================================
   Section wrapper with scroll animation
   ============================================ */
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView(0.05);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ============================================
   Code tab component
   ============================================ */
function CodeTabs({ tabs }: { tabs: { label: string; code: string[] }[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="feature-card !p-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-faint)] bg-[var(--surface-raised)]">
        <div className="h-2.5 w-2.5 rounded-full bg-[var(--red)]/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-[var(--yellow)]/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-[var(--green)]/60" />
        <div className="ml-4 flex gap-1">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all ${
                active === i
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {/* Code content */}
      <div className="p-6 bg-[var(--bg)] min-h-[200px]">
        <TerminalTyping lines={tabs[active].code} speed={25} />
      </div>
    </div>
  );
}

/* ============================================
   MAIN LANDING PAGE
   ============================================ */
export default function LandingPageClient({ t, pricing }: { t: ReturnType<typeof import('@/translations').getT>; pricing: { onboardingDollar: string } }) {
  const heroInView = useInView(0.1);

  const stats = [
    { num: 10, suffix: ' min', label: t.home.stats.avgTime },
    { num: 87, suffix: '%', label: t.home.stats.fidelity },
    { num: 50, suffix: '+', label: t.home.stats.services },
    { num: 0, suffix: '', label: t.home.stats.standardCode, custom: 'Next.js' },
  ];

  const workflowItems = [
    { icon: '🔗', label: t.home.steps.input.title, desc: t.home.steps.input.desc },
    { icon: '🧠', label: t.home.steps.analyze.title, desc: t.home.steps.analyze.desc },
    { icon: '⚙️', label: t.home.steps.generate.title, desc: t.home.steps.generate.desc },
    { icon: '🚀', label: t.home.steps.deploy.title, desc: t.home.steps.deploy.desc },
  ];

  const featureItems = [
    { icon: '🔍', label: t.home.features.crawler.title, desc: t.home.features.crawler.desc, tag: t.home.features.crawler.tag },
    { icon: '🖥️', label: t.home.features.browser.title, desc: t.home.features.browser.desc, tag: t.home.features.browser.tag },
    { icon: '🔌', label: t.home.features.thirdParty.title, desc: t.home.features.thirdParty.desc, tag: t.home.features.thirdParty.tag },
    { icon: '🧪', label: t.home.features.test.title, desc: t.home.features.test.desc, tag: t.home.features.test.tag },
    { icon: '☁️', label: t.home.features.hosting.title, desc: t.home.features.hosting.desc, tag: t.home.features.hosting.tag },
    { icon: '📱', label: t.home.features.app.title, desc: t.home.features.app.desc, tag: t.home.features.app.tag },
  ];

  const cloneCodeTabs = [
    {
      label: 'TypeScript',
      code: [
        `// Clone any website in one call`,
        `const result = await webEcho.clone({`,
        `  url: 'https://stripe.com',`,
        `  framework: 'nextjs',`,
        `  detectThirdParty: true,`,
        `  autoTest: true,`,
        `});`,
        ``,
        `// → { status: 'done', quality: 92 }`,
      ],
    },
    {
      label: 'cURL',
      code: [
        `curl -X POST https://api.ch007.ai/v1/clone \\`,
        `  -H "Authorization: Bearer we_xxx" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '{`,
        `    "url": "https://stripe.com",`,
        `    "framework": "nextjs"`,
        `  }'`,
      ],
    },
    {
      label: 'Python',
      code: [
        `from ch007 import WebEcho`,
        ``,
        `client = WebEcho(api_key="we_xxx")`,
        `result = client.clone(`,
        `    url="https://stripe.com",`,
        `    framework="nextjs"`,
        `)`,
        `print(result.quality)  # 92`,
      ],
    },
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

        <div
          ref={heroInView.ref}
          className={`relative z-10 mx-auto max-w-[900px] text-center transition-all duration-1000 ${
            heroInView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--accent)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
            {t.home.badge}
          </div>

          {/* Title */}
          <h1 className="mb-6 font-heading text-[48px] sm:text-[60px] lg:text-[72px] font-extrabold leading-[1.05] tracking-[-2px] text-[var(--text)]">
            {t.home.heroTitle}
            <br />
            <em className="not-italic bg-gradient-to-r from-[var(--accent)] via-[var(--accent-hover)] to-[var(--yellow)] bg-clip-text text-transparent">
              {t.home.heroTitleAccent}
            </em>
          </h1>

          {/* Description */}
          <p className="mx-auto mb-10 max-w-[560px] text-lg sm:text-xl font-light leading-[1.7] text-[var(--text-secondary)]">
            {t.home.heroDesc}
          </p>

          {/* URL Input */}
          <div className="flex justify-center">
            {/* Import HeroUrlInput dynamically to avoid SSR issues */}
            <DynamicHeroUrlInput onboardingDollar={pricing.onboardingDollar} t={t} />
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-[var(--border-faint)] pt-12">
            {stats.map((stat, i) => (
              <div key={stat.label} className="text-center group" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="font-heading text-3xl font-extrabold stat-number transition-transform duration-300 group-hover:scale-105">
                  {stat.custom ?? (
                    <AnimatedNumber target={stat.num} suffix={stat.suffix} inView={heroInView.inView} />
                  )}
                </div>
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
          <div className="relative overflow-hidden">
            <div className="flex gap-12 animate-marquee w-max">
              {['Next.js', 'Vercel', 'Stripe', 'Supabase', 'Tailwind', 'React', 'Node.js', 'TypeScript', 'Prisma', 'Railway'].concat(
                ['Next.js', 'Vercel', 'Stripe', 'Supabase', 'Tailwind', 'React', 'Node.js', 'TypeScript', 'Prisma', 'Railway']
              ).map((name, i) => (
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

      {/* ===== SECTION 01: WORKFLOW ===== */}
      <section className="px-6 lg:px-12 py-24">
        <div className="mx-auto max-w-[1200px]">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[11px] font-semibold text-[var(--muted)]">[01 / 03]</span>
              <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">Main Features</span>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Text + Steps */}
            <AnimatedSection delay={100}>
              <h2 className="font-heading text-[36px] lg:text-[44px] font-extrabold leading-[1.1] tracking-[-1.5px] mb-6">
                {t.home.fourSteps}
              </h2>
              <p className="text-[16px] leading-[1.7] text-[var(--muted)] mb-10 max-w-[440px]">
                {t.home.workflowDesc}
              </p>
              <div className="flex flex-col gap-3">
                {workflowItems.map((item, i) => (
                  <AnimatedSection key={i} delay={200 + i * 100}>
                    <GlowCard className="!p-5 cursor-default">
                      <div className="flex items-start gap-4">
                        <div className="text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                        <div className="flex-1">
                          <div className="font-heading text-[15px] font-bold text-[var(--text)] mb-1">{item.label}</div>
                          <div className="text-[13px] leading-[1.6] text-[var(--muted)]">{item.desc}</div>
                        </div>
                      </div>
                    </GlowCard>
                  </AnimatedSection>
                ))}
              </div>
            </AnimatedSection>

            {/* Right: Code Terminal */}
            <AnimatedSection delay={400}>
              <CodeTabs tabs={cloneCodeTabs} />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ===== SECTION 02: CAPABILITIES ===== */}
      <section className="px-6 lg:px-12 py-24 border-t border-[var(--border-faint)]">
        <div className="mx-auto max-w-[1200px]">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[11px] font-semibold text-[var(--muted)]">[02 / 03]</span>
              <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">Developer First</span>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <AnimatedSection delay={100}>
              <h2 className="font-heading text-[36px] lg:text-[44px] font-extrabold leading-[1.1] tracking-[-1.5px] mb-6">
                {t.home.notJustScreenshot}
              </h2>
              <p className="text-[16px] leading-[1.7] text-[var(--muted)] mb-10 max-w-[440px]">
                {t.home.capabilitiesDesc}
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featureItems.map((feat, i) => (
                <AnimatedSection key={feat.label} delay={100 + i * 80}>
                  <GlowCard className="cursor-default">
                    <div className="mb-3 text-xl group-hover:scale-110 transition-transform duration-300">{feat.icon}</div>
                    <div className="mb-1.5 font-heading text-[14px] font-bold text-[var(--text)]">{feat.label}</div>
                    <div className="mb-3 text-[12px] leading-[1.6] text-[var(--muted)]">{feat.desc}</div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300">
                      {feat.tag}
                      <svg className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </GlowCard>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 03: PRICING ===== */}
      <section className="px-6 lg:px-12 py-24 border-t border-[var(--border-faint)]">
        <div className="mx-auto max-w-[1200px]">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[11px] font-semibold text-[var(--muted)]">[03 / 03]</span>
              <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">Zero configuration</span>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <AnimatedSection delay={100}>
              <h2 className="font-heading text-[36px] lg:text-[44px] font-extrabold leading-[1.1] tracking-[-1.5px] mb-6">
                {t.home.payAsYouGo}
              </h2>
              <p className="text-[16px] leading-[1.7] text-[var(--muted)] mb-10 max-w-[440px]">
                {t.home.pricingSectionDesc}
              </p>

              <GlowCard>
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">{t.home.perTask}</div>
                <div className="mb-1 font-heading text-4xl font-extrabold text-[var(--text)]">
                  ${pricing.onboardingDollar}<sub className="align-middle text-base font-normal text-[var(--muted)]"> {t.home.from}</sub>
                </div>
                <div className="mb-6 text-[13px] text-[var(--muted)]">{t.home.dynamicPricing(pricing.onboardingDollar)}</div>
                <Link href="/clone/new" className="btn-primary inline-block text-center">
                  {t.home.ctaTry(pricing.onboardingDollar)}
                </Link>
              </GlowCard>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <GlowCard className="border-[var(--accent-border)] bg-[var(--accent-soft)]">
                <div className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                  {t.home.hostingService}
                </div>
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">{t.home.platformHosting}</div>
                <div className="mb-1 font-heading text-4xl font-extrabold text-[var(--text)]">
                  $30<sub className="align-middle text-base font-normal text-[var(--muted)]">{t.home.perMonth}</sub>
                </div>
                <div className="mb-6 text-[13px] text-[var(--muted)]">{t.home.hostingDesc('30', '50', '500', '1000')}</div>
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
              </GlowCard>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ===== OPEN SOURCE SECTION ===== */}
      <section className="border-t border-[var(--border-faint)] py-24">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
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
            </AnimatedSection>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '10 min', color: 'stat-number', label: 'Avg delivery time' },
                { value: '87%', color: 'text-[var(--green)]', label: 'Visual fidelity' },
                { value: '50+', color: 'text-[var(--accent2)]', label: 'Services detected' },
                { value: '3x', color: 'text-[var(--purple)]', label: 'Auto-retry on fail' },
              ].map((stat, i) => (
                <AnimatedSection key={i} delay={i * 100}>
                  <GlowCard className="!p-5 text-center">
                    <div className={`text-3xl font-heading font-extrabold mb-1 ${stat.color}`}>{stat.value}</div>
                    <div className="text-[12px] text-[var(--muted)]">{stat.label}</div>
                  </GlowCard>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="mx-6 lg:mx-12 mb-24">
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-[20px] border border-[var(--accent-border)] bg-[var(--surface)] p-12 lg:p-20 text-center group">
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
          </div>
        </AnimatedSection>
      </section>
    </>
  );
}

/* ============================================
   Dynamic import of HeroUrlInput (client-only)
   ============================================ */
function DynamicHeroUrlInput({ onboardingDollar, t }: { onboardingDollar: string; t: ReturnType<typeof import('@/translations').getT> }) {
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);
  const trimmed = url.trim();
  const href = trimmed
    ? `/clone/new?url=${encodeURIComponent(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)}`
    : '/clone/new';

  return (
    <div>
      <div className="mx-auto mb-4 flex max-w-[640px] items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 pl-5 transition-all duration-300 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_30px_rgba(249,115,22,0.1)]">
        <span className="whitespace-nowrap text-sm text-[var(--muted)] select-none">https://</span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t.home.urlPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--muted-dark)]"
        />
        <Link
          href={href}
          className={`whitespace-nowrap rounded-[10px] px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 ${
            trimmed || focused
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] shadow-sm hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:-translate-y-0.5'
              : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'
          }`}
        >
          {t.home.startClone}
        </Link>
      </div>
      <p className="text-xs text-[var(--muted)] mt-4">
        {t.home.firstTimeHint(onboardingDollar)}
      </p>
    </div>
  );
}
