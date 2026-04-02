'use client';

import { useLocale } from '@/contexts/LocaleContext';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center rounded-lg border border-[var(--border2)] bg-[var(--surface)] p-0.5">
      <button
        type="button"
        onClick={() => setLocale('zh')}
        className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
          locale === 'zh'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        }`}
      >
        中
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
          locale === 'en'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        }`}
      >
        EN
      </button>
    </div>
  );
}
