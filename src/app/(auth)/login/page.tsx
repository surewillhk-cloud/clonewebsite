'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

export default function LoginPage() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
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
          {t.auth.login}
        </h1>
        <p className="mb-8 text-[14px] text-[var(--muted)]">
          {t.auth.loginDesc}
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
              {t.auth.password}
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
            {loading ? t.auth.loggingIn : t.auth.loginBtn}
          </button>
        </form>
        <p className="mt-6 text-center text-[13px] text-[var(--muted)]">
          {t.auth.noAccount}{' '}
          <Link href="/register" className="text-[var(--accent)] hover:underline">
            {t.auth.register}
          </Link>
        </p>
      </div>
    </div>
  );
}
