'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface UserItem {
  id: string;
  email: string | null;
  credits: number;
  creditsExpireAt: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
}

export function AdminUsersList() {
  const t = useTranslation().usersAdmin;
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creditModal, setCreditModal] = useState<{ user: UserItem } | null>(null);

  const refresh = useCallback(() => {
    fetch(`/api/platform-admin/users?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {});
  }, [page]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/platform-admin/users?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div>
      <div className="mb-6 text-[13px] text-[var(--muted)]">{t.totalUsers(total)}</div>

      {loading ? (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          {t.loading}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          {t.noUsers}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-6 py-4 font-semibold">{t.userId}</th>
                <th className="px-6 py-4 font-semibold">{t.email}</th>
                <th className="px-6 py-4 font-semibold">{t.credits}</th>
                <th className="px-6 py-4 font-semibold">{t.actions}</th>
                <th className="px-6 py-4 font-semibold">{t.stripe}</th>
                <th className="px-6 py-4 font-semibold">{t.regTime}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-6 py-3">
                    <Link
                      href={`/platform-admin/users/${u.id}`}
                      className="font-mono text-[12px] text-[var(--accent)] hover:underline"
                    >
                      {u.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-6 py-3">{u.email ?? '—'}</td>
                  <td className="px-6 py-3 font-medium">{u.credits}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => setCreditModal({ user: u })}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--accent)] hover:border-[var(--accent)]"
                    >
                      {t.adjustCredits}
                    </button>
                  </td>
                  <td className="px-6 py-3 font-mono text-[12px] text-[var(--muted)]">
                    {u.stripeCustomerId ? `${u.stripeCustomerId.slice(0, 12)}…` : '—'}
                  </td>
                  <td className="px-6 py-3 text-[13px] text-[var(--muted)]">
                    {new Date(u.createdAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[14px] disabled:opacity-50"
          >
            {t.prevPage}
          </button>
          <span className="text-[14px] text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[14px] disabled:opacity-50"
          >
            {t.nextPage}
          </button>
        </div>
      )}

      {creditModal && (
        <CreditModal
          user={creditModal.user}
          onClose={() => setCreditModal(null)}
          onSuccess={() => {
            refresh();
            setCreditModal(null);
          }}
        />
      )}
    </div>
  );
}

function CreditModal({
  user,
  onClose,
  onSuccess,
}: {
  user: UserItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslation().usersAdmin;
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delta === 0) {
      setError(t.invalidCredits);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/users/${user.id}/credits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.opFailed);
        return;
      }
      onSuccess();
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-heading text-lg font-bold">{t.adjustTitle}</h3>
        <p className="mb-4 text-[14px] text-[var(--muted)]">
          {t.currentCredits(user.email ?? user.id, user.credits)}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--muted)]">
              {t.creditsChange}
            </label>
            <input
              type="number"
              value={delta || ''}
              onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px]"
              placeholder={t.creditsChangePlaceholder}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--muted)]">
              {t.reason}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px]"
              placeholder={t.reasonPlaceholder}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-[14px]"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
            >
              {loading ? t.processing : t.confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
