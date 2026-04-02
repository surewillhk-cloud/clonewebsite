'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { SystemConfig } from '@/lib/platform-admin';

export function SystemConfigPanel() {
  const t = useTranslation().config;
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/platform-admin/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/platform-admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || t.saveFailed);
        return;
      }
      setConfig(data);
      setMessage(t.saved);
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage(t.networkError);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
        {t.loading}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="mb-6 font-heading text-[15px] font-bold">{t.runConfig}</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[13px] text-[var(--muted)]">
              {t.maxConcurrent}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={config.maxConcurrentTasks}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maxConcurrentTasks: Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)),
                })
              }
              className="w-32 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-2.5 text-[14px]"
            />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-[13px] text-[var(--muted)]">
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) =>
                  setConfig({ ...config, maintenanceMode: e.target.checked })
                }
                className="rounded"
              />
              {t.maintenanceMode}
            </label>
          </div>
          <div className="rounded-[10px] border border-[var(--border2)] bg-[var(--bg)] p-4">
            <h3 className="mb-3 font-heading text-[14px] font-bold">{t.failureRate}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.autoMaintenanceOnHighFailureRate ?? false}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      autoMaintenanceOnHighFailureRate: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-[13px]">
                  {t.failureRateAuto}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[12px] text-[var(--muted)]">
                    {t.failureThreshold}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round((config.failureRateThreshold ?? 0.5) * 100)}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        failureRateThreshold: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) / 100,
                      })
                    }
                    className="w-24 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
                  />
                  <span className="ml-2 text-[12px] text-[var(--muted)]">%</span>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] text-[var(--muted)]">
                    {t.failureWindow}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={config.failureRateWindowTasks ?? 20}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        failureRateWindowTasks: Math.min(100, Math.max(5, parseInt(e.target.value, 10) || 20)),
                      })
                    }
                    className="w-24 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[13px] text-[var(--muted)]">
              {t.newUserCents}
            </label>
            <input
              type="number"
              min={0}
              value={config.newUserTrialCents}
              onChange={(e) =>
                setConfig({
                  ...config,
                  newUserTrialCents: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="w-32 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-2.5 text-[14px]"
            />
            <span className="ml-2 text-[13px] text-[var(--muted)]">
              ${(config.newUserTrialCents / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#6B91FF] disabled:opacity-50"
        >
          {saving ? t.saving : t.save}
        </button>
        {message && (
          <span className={message === t.saved ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
