import { Metadata } from 'next';
import Link from 'next/link';
import { getLocaleFromRequest } from '@/lib/get-locale';
import { getT } from '@/translations';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);
  return {
    title: `${t.docs.title} | CH007`,
    description: t.docs.desc,
  };
}

export default async function DocsPage() {
  const locale = await getLocaleFromRequest();
  const t = getT(locale);

  const docSections = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: t.docs.quickStart,
      content: t.docs.steps.map((step) => step),
      type: 'steps' as const,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      title: t.docs.loginSite,
      content: t.docs.loginSiteDesc,
      type: 'text' as const,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 19a4.5 4.5 0 01-.42-8.98A7 7 0 0118.5 9a4.5 4.5 0 01-.5 9H6.5z" />
        </svg>
      ),
      title: t.docs.hosting,
      content: t.docs.hostingDesc,
      type: 'text' as const,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
      title: t.docs.thirdParty,
      content: t.docs.thirdPartyDesc,
      type: 'text' as const,
    },
  ];

  return (
    <div className="mx-auto max-w-[900px] px-6 lg:px-12 py-24 pt-[100px]">
      {/* Header */}
      <div className="mb-16">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--accent)]">
          {t.docs.title}
        </div>
        <h1 className="font-heading text-[40px] lg:text-[48px] font-extrabold tracking-[-1.5px] text-[var(--text)] mb-4">
          {t.docs.title}
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-[560px]">{t.docs.desc}</p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {docSections.map((section, i) => (
          <div key={section.title} className="feature-card group">
            <div className="flex items-start gap-5">
              <div className="h-11 w-11 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                {section.icon}
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-[18px] font-bold text-[var(--text)] mb-3">{section.title}</h2>
                {section.type === 'steps' ? (
                  <ol className="space-y-3">
                    {(section.content as string[]).map((step, j) => (
                      <li key={j} className="flex items-start gap-3 text-[14px] leading-relaxed text-[var(--muted)]">
                        <span className="h-6 w-6 rounded-full bg-[var(--border)] text-[var(--muted)] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                          {j + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[14px] leading-relaxed text-[var(--muted)]">{section.content as string}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12">
        <Link href="/clone/new" className="btn-primary inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {t.docs.startClone}
        </Link>
      </div>
    </div>
  );
}
