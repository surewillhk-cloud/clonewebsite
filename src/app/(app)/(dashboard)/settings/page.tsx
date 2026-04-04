'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageToggle } from '@/components/layout/LanguageToggle';

export default function SettingsPage() {
  const t = useTranslation();
  const [email, setEmail] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referredCount, setReferredCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; prefix: string; name: string; createdAt: string; lastUsedAt: string | null }>>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [apiKeyCreating, setApiKeyCreating] = useState(false);

  const loadApiKeys = () => {
    fetch('/api/api-keys')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data?.keys ? setApiKeys(data.keys) : null));
  };

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setEmail(data.email ?? null);
          setCredits(data.credits ?? 0);
          setReferralLink(data.referralLink ?? null);
          setReferredCount(data.referredCount ?? 0);
        }
      });
    loadApiKeys();
  }, []);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const st = t.settings;

  return (
    <div className="mx-auto max-w-[800px] px-12 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-extrabold">{st.title}</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{st.subtitle}</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {st.account}
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] text-[var(--muted)]">{st.email}</label>
              <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text)]">
                {email ?? '—'}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--muted)]">{st.credits}</label>
              <div className="rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[14px] text-[var(--text)]">
                {credits != null ? credits : '—'}
              </div>
              <p className="mt-1 text-[12px] text-[var(--muted)]">{st.creditsHint}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {st.referral}
          </div>
          <p className="mb-4 text-[13px] text-[var(--muted)]">{st.referralDesc}</p>
          {referralLink && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3 text-[13px] text-[var(--text)]">
                <span className="break-all">{referralLink}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2.5 text-[13px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
              >
                {copied ? st.copied : st.copy}
              </button>
            </div>
          )}
          {referredCount > 0 && (
            <p className="mt-3 text-[12px] text-[var(--muted)]">
              {st.referred} {referredCount} {st.referredCount}
            </p>
          )}
        </div>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {st.apiKeys}
          </div>
          <p className="mb-4 text-[13px] text-[var(--muted)]">{st.apiKeysDesc}</p>
          {newKey && (
            <div className="mb-4 rounded-lg border border-[var(--green)]/50 bg-[var(--green)]/10 p-4">
              <p className="mb-2 text-[12px] text-[var(--muted)]">{st.keyCreated}</p>
              <code className="block break-all text-[13px] font-mono text-[var(--text)]">{newKey}</code>
            </div>
          )}
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              disabled={apiKeyCreating}
              onClick={() => {
                setApiKeyCreating(true);
                fetch('/api/api-keys', { method: 'POST' })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.key) {
                      setNewKey(data.key);
                      loadApiKeys();
                      setTimeout(() => setNewKey(null), 30000);
                    }
                  })
                  .finally(() => setApiKeyCreating(false));
              }}
              className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 disabled:opacity-50"
            >
              {apiKeyCreating ? st.creatingKey : st.createKey}
            </button>
          </div>
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3"
              >
                <div>
                  <span className="font-mono text-[13px] text-[var(--text)]">{k.prefix}</span>
                  <span className="ml-2 text-[12px] text-[var(--muted)]">
                    {k.name} · {new Date(k.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm(st.confirmRevoke)) return;
                    fetch(`/api/api-keys/${k.id}`, { method: 'DELETE' }).then(() => loadApiKeys());
                  }}
                  className="text-[12px] text-red-400 hover:underline"
                >
                  {st.revoke}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 font-heading text-[13px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {st.language}
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <span className="text-[13px] text-[var(--muted)]">{st.languageHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
