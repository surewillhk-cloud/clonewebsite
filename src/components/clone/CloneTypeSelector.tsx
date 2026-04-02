'use client';

import type { CloneType } from '@/types/clone';
import { useTranslation } from '@/hooks/useTranslation';

interface CloneTypeSelectorProps {
  value: CloneType;
  onChange: (type: CloneType) => void;
}

export function CloneTypeSelector({ value, onChange }: CloneTypeSelectorProps) {
  const t = useTranslation();
  return (
    <div className="mb-5 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-7">
      <div className="mb-1 flex items-center gap-2 font-heading text-[15px] font-bold">
        {t.clone.cloneTypeLabel}
      </div>
      <div className="mb-6 text-[13px] text-[var(--muted)]">
        {t.clone.cloneTypeDesc}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => onChange('web')}
          className={`cursor-pointer rounded-xl border-2 p-5 transition-colors ${
            value === 'web'
              ? 'border-[var(--accent)] bg-[rgba(79,126,255,0.06)]'
              : 'border-[var(--border2)] hover:bg-[var(--surface2)]'
          }`}
        >
          <div className="mb-2.5 text-[22px]">🌐</div>
          <div className="mb-1 font-heading text-[14px] font-bold">{t.clone.webClone}</div>
          <div className="text-[12px] leading-[1.5] text-[var(--muted)]">
            {t.clone.webCloneDesc}
          </div>
          <div className="mt-3 text-[11px] text-[var(--green)]">✓ {t.clone.available}</div>
        </div>
        <div
          onClick={() => onChange('app')}
          className={`cursor-pointer rounded-xl border-2 p-5 transition-colors ${
            value === 'app'
              ? 'border-[var(--accent)] bg-[rgba(79,126,255,0.06)]'
              : 'border-[var(--border2)] hover:bg-[var(--surface2)]'
          }`}
        >
          <div className="mb-2.5 text-[22px]">📱</div>
          <div className="mb-1 font-heading text-[14px] font-bold">{t.clone.appClone}</div>
          <div className="text-[12px] leading-[1.5] text-[var(--muted)]">
            {t.clone.appCloneDesc}
          </div>
          <div className="mt-3 text-[11px] text-[var(--green)]">✓ {t.clone.screenshotAvailable}</div>
        </div>
      </div>
    </div>
  );
}
