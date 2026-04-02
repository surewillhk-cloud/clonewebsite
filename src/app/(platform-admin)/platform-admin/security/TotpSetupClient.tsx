'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export function TotpSetupClient() {
  const t = useTranslation().securityAdmin;
  const [step, setStep] = useState<'idle' | 'qr' | 'done'>('idle');
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    try {
      const res = await fetch('/api/platform-admin/totp/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.startFailed);
        return;
      }
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStep('qr');
    } catch {
      setError(t.networkError);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/platform-admin/totp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: totpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.verifyFailed);
        return;
      }
      setStep('done');
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <p className="rounded-lg bg-[var(--green)]/10 px-4 py-3 text-[14px] text-[var(--green)]">
        {t.enableSuccess}
      </p>
    );
  }

  if (step === 'qr' && qrDataUrl) {
    return (
      <form onSubmit={handleConfirm} className="space-y-4">
        <div className="flex justify-center">
          <img src={qrDataUrl} alt="TOTP QR" className="rounded-lg border border-[var(--border)]" />
        </div>
        <p className="text-center text-[13px] text-[var(--muted)]">
          {t.qrHint}
        </p>
        {secret && (
          <p className="break-all rounded-lg bg-[var(--bg)] px-3 py-2 font-mono text-[12px] text-[var(--muted)]">
            {secret}
          </p>
        )}
        <div>
          <label className="mb-1 block text-[13px] text-[var(--muted)]">{t.verifyCodeLabel}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[18px] tracking-[0.5em] text-center outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            placeholder="000000"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</p>
        )}
        <button
          type="submit"
            disabled={totpCode.length !== 6 || loading}
          className="w-full rounded-lg bg-[var(--accent)] py-3 text-[14px] font-medium text-white hover:bg-[#6B91FF] disabled:opacity-50"
        >
          {loading ? t.verifying : t.confirmEnable}
        </button>
      </form>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleStart}
        className="rounded-lg bg-[var(--accent)] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#6B91FF]"
      >
        {t.enableBtn}
      </button>
      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</p>
      )}
    </div>
  );
}
