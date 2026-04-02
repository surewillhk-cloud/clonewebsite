'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';

export default function PlatformAdminLoginPage() {
  const T = useTranslation();
  const t = T.platformAdmin;
  const authT = T.auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/platform-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      if (data.needsTotp) {
        setTempToken(data.tempToken);
        setTotpCode('');
        return;
      }
      router.push('/platform-admin');
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/platform-admin/login/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, totpCode: totpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid code');
        return;
      }
      router.push('/platform-admin');
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="mb-2 font-heading text-2xl font-extrabold">{t.title}</h1>
        <p className="mb-8 text-[14px] text-[var(--muted)]">{t.adminLoginDesc}</p>
        {tempToken ? (
          <form onSubmit={handleTotpSubmit} className="flex flex-col gap-5">
            <p className="text-[13px] text-[var(--muted)]">{t.totpPrompt}</p>
            <div>
              <label className="mb-1.5 block text-[12px] text-[var(--muted)]">{t.verifyCode}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-center text-[18px] tracking-[0.5em] text-[var(--text)] outline-none placeholder:text-[#3A4560] focus:border-[var(--accent)]"
                placeholder="000000"
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full rounded-lg bg-[var(--accent)] py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-[#6B91FF] disabled:opacity-50"
            >
              {loading ? t.verifying : t.verify}
            </button>
            <button
              type="button"
              onClick={() => setTempToken(null)}
              className="text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
            >
              {t.backToPassword}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-[12px] text-[var(--muted)]">
                {authT.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[#3A4560] focus:border-[var(--accent)]"
                placeholder="admin@ch007.ai"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] text-[var(--muted)]">
                {authT.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[#3A4560] focus:border-[var(--accent)]"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--accent)] py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-[#6B91FF] disabled:opacity-50"
            >
              {loading ? authT.loggingIn : authT.loginBtn}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-[13px] text-[var(--muted)]">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            {t.backHome}
          </Link>
        </p>
      </div>
    </div>
  );
}
