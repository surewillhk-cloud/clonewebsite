'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

function RegisterForm() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard` },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (refCode) {
        try {
          const res = await fetch('/api/referral/bind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: refCode }),
          });
          if (!res.ok) sessionStorage.setItem('webecho-ref', refCode);
        } catch {
          sessionStorage.setItem('webecho-ref', refCode);
        }
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="mb-2 font-heading text-2xl font-extrabold">
          {t.auth.registerTitle}
        </h1>
        <p className="mb-8 text-[14px] text-[var(--muted)]">
          {t.auth.registerDesc}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--muted)]">
              {t.auth.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[#3A4560] focus:border-[var(--accent)]"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--muted)]">
              {t.auth.passwordMin}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[#3A4560] focus:border-[var(--accent)]"
              placeholder="••••••••"
              minLength={6}
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
            {loading ? t.auth.registering : t.auth.registerBtn}
          </button>
        </form>
        <p className="mt-6 text-center text-[13px] text-[var(--muted)]">
          {t.auth.haveAccount}{' '}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            {t.auth.login}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 animate-pulse">
          <div className="h-8 bg-[var(--border2)] rounded mb-2 w-32" />
          <div className="h-4 bg-[var(--border2)] rounded mb-8 w-48" />
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
