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
  const [googleLoading, setGoogleLoading] = useState(false);
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
      router.push('/generate');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    setGoogleLoading(true);
    signIn('google', { callbackUrl: '/generate' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[var(--bg)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[var(--accent)]/10 via-[var(--purple)]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-[var(--accent)]/10 via-[var(--purple)]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_0%,transparent_70%)] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:60px_60px]" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-shadow duration-300">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-heading text-xl font-extrabold text-[var(--text)]">Web<span className="text-[var(--accent)]">Echo</span></span>
          </Link>
          <h1 className="font-heading text-3xl font-extrabold text-[var(--text)] mb-2">
            {t.auth.registerTitle}
          </h1>
          <p className="text-[var(--text-secondary)]">{t.auth.registerSubtitle}</p>
        </div>

        {/* Card */}
        <div className="feature-card !p-8">
          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] py-3.5 text-[14px] font-medium text-[var(--text)] transition-all disabled:opacity-50 mb-6"
          >
            {googleLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {t.auth.signUpWithGoogle}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-faint)]"></div>
            </div>
            <div className="relative flex justify-center text-[12px]">
              <span className="px-4 bg-[var(--surface)] text-[var(--muted)]">{t.auth.orContinue || 'or'}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[var(--text)] mb-2">
                {t.auth.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted-dark)] transition-all outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
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
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted-dark)] transition-all outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
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
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted-dark)] transition-all outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder={t.auth.passwordPlaceholder}
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-[var(--red-soft)] border border-[var(--red)]/20 px-4 py-3">
                <p className="text-[13px] text-[var(--red)]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.auth.registering}
                </>
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
