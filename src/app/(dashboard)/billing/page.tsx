'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function BillingPage() {
  const t = useTranslation();

  return (
    <div className="mx-auto max-w-[800px] px-12 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-extrabold">{t.billing.title}</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{t.billing.subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {t.billing.spend}
          </div>
          <div className="font-heading text-3xl font-extrabold text-[var(--accent)]">$0</div>
          <div className="mt-2 h-2 rounded-full bg-[var(--border2)]">
            <div className="h-full w-0 rounded-full bg-[var(--accent)]" />
          </div>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {t.billing.limit}
          </div>
          <div className="font-heading text-2xl font-bold">{t.billing.onDemand}</div>
          <p className="mt-1 text-[12px] text-[var(--muted)]">{t.billing.byComplexity}</p>
        </div>
      </div>

      <div className="mt-8 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="mb-4 font-heading text-[14px] font-bold">{t.billing.paymentMethods}</div>
        <p className="text-[13px] text-[var(--muted)]">{t.billing.placeholder}</p>
      </div>
    </div>
  );
}