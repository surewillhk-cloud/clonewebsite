'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslation } from '@/hooks/useTranslation';

function RegisterForm() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref?.trim()) setRefCode(ref.trim());
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError(t.auth.confirmPassword + ' mismatch');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError(signInResult.error);
        return;
      }
      if (refCode) {
        try {
          await fetch('/api/referral/bind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: refCode }),
          });
        } catch {
          sessionStorage.setItem('ch007-ref', refCode);
        }
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--bg)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[var(--accent)]/10 via-[var(--purple)]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-[var(--accent)]/10 via-[var(--purple)]/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-heading text-xl font-bold text-[var(--text)]">CH007</span>
          </Link>
          <h1 className="font-heading text-3xl font-extrabold text-[var(--text)] mb-2">
            {t.auth.registerTitle}
          </h1>
          <p className="text-[var(--muted)]">
            {t.auth.registerSubtitle}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[var(--text)] mb-2">
                {t.auth.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg)]/80 px-4 py-3.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] transition-all outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder={t.auth.emailPlaceholder}
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--text)] mb-2">
                {t.auth.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg)]/80 px-4 py-3.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] transition-all outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder={t.auth.passwordPlaceholder}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--text)] mb-2">
                {t.auth.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--border2)] bg-[var(--bg)]/80 px-4 py-3.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] transition-all outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder={t.auth.passwordPlaceholder}
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-[13px] text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-[#6B91FF] py-3.5 text-[14px] font-semibold text-white transition-all hover:shadow-lg hover:shadow-[var(--accent)]/25 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.auth.registering}
                </span>
              ) : t.auth.registerBtn}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[13px] text-[var(--muted)]">
              {t.auth.haveAccount}{' '}
              <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
                {t.auth.login}
              </Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-[var(--muted)] mt-4">
            {t.auth.agreeTerms}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 animate-pulse">
            <div className="h-8 bg-[var(--border2)] rounded w-32 mb-4" />
            <div className="h-4 bg-[var(--border2)] rounded w-48 mb-8" />
            <div className="space-y-4">
              <div className="h-12 bg-[var(--border2)] rounded-xl" />
              <div className="h-12 bg-[var(--border2)] rounded-xl" />
              <div className="h-12 bg-[var(--border2)] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
