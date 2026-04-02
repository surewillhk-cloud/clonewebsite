'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export function SignaturesEditor() {
  const t = useTranslation().signaturesEditor;
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/platform-admin/signatures')
      .then((r) => r.json())
      .then((data) => {
        setRaw(JSON.stringify(data, null, 2));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setMessage(t.jsonError);
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      setMessage('必须为 JSON 对象');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/platform-admin/signatures', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || t.saveFailed);
        return;
      }
      setRaw(JSON.stringify(data, null, 2));
      setMessage(t.saved);
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage(t.networkError);
    } finally {
      setSaving(false);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(raw);
      setRaw(JSON.stringify(parsed, null, 2));
      setMessage(t.formatted);
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage(t.formatError);
    }
  };

  const handleReset = async () => {
    if (!confirm(t.resetConfirm)) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/platform-admin/signatures/reset', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || t.resetFailed);
        return;
      }
      setRaw(JSON.stringify(data, null, 2));
      setMessage(t.resetSuccess);
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage(t.networkError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
        {t.loading}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-2 font-heading text-[15px] font-bold">
          {t.title}
        </h2>
        <p className="mb-4 text-[13px] text-[var(--muted)]">
          {t.desc}
          <code className="rounded bg-[var(--surface2)] px-1">{t.descPattern}</code>
          {t.descExample}
          <code className="rounded bg-[var(--surface2)] px-1">{t.descExampleCode}</code>
          {t.descEnd}
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="h-[420px] w-full resize-y rounded-lg border border-[var(--border2)] bg-[var(--bg)] p-4 font-mono text-[13px] leading-relaxed"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#6B91FF] disabled:opacity-50"
        >
          {saving ? t.saving : t.save}
        </button>
        <button
          onClick={handleFormat}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-[14px] hover:bg-[var(--surface2)]"
        >
          {t.format}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-[14px] hover:bg-[var(--surface2)] disabled:opacity-50"
        >
          {t.resetDefault}
        </button>
        {message && (
          <span
            className={
              message === t.saved || message === t.formatted || message === t.resetSuccess
                ? 'text-[var(--green)]'
                : message
                  ? 'text-[var(--red)]'
                  : 'text-[var(--muted)]'
            }
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
