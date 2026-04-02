'use client';

import { useTranslation } from '@/hooks/useTranslation';

export type AppAnalyzeMode = 'screenshot' | 'apk' | 'traffic';

interface AppAnalyzeModeSelectorProps {
  value: AppAnalyzeMode;
  onChange: (mode: AppAnalyzeMode) => void;
  disabled?: boolean;
}

export function AppAnalyzeModeSelector({ value, onChange, disabled }: AppAnalyzeModeSelectorProps) {
  const t = useTranslation();
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-[13px] text-[var(--muted)]">{t.appAnalyzeMode.label}</span>
      <div className="flex gap-1 rounded-lg border border-[var(--border2)] bg-[var(--surface2)] p-1">
        <button
          type="button"
          onClick={() => onChange('screenshot')}
          disabled={disabled}
          className={`rounded-md px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
            value === 'screenshot'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          📷 {t.appAnalyzeMode.screenshot}
        </button>
        <button
          type="button"
          onClick={() => onChange('apk')}
          disabled={disabled}
          className={`rounded-md px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
            value === 'apk'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          📦 {t.appAnalyzeMode.apk}
        </button>
        <button
          type="button"
          onClick={() => onChange('traffic')}
          disabled={disabled}
          className={`rounded-md px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
            value === 'traffic'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          🔗 {t.appAnalyzeMode.traffic}
        </button>
      </div>
    </div>
  );
}
