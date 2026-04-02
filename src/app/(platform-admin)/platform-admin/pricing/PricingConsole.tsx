'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/contexts/LocaleContext';
import type { PricingConfig, ClonePriceItem } from '@/lib/platform-admin';

interface PricingHistoryEntry {
  id: string;
  config: PricingConfig;
  createdBy: string;
  createdAt: string;
}

const DEFAULT_CONFIG: PricingConfig = {
  profitMultiplier: 5.0,
  multiplierByComplexity: {
    static_single: 5.0,
    static_multi: 5.0,
    dynamic_basic: 5.0,
    dynamic_complex: 5.0,
  },
  minPriceCents: 300,
  maxPriceCents: 9900,
  clonePriceItems: {
    static_single: { mode: 'fixed', minCents: 300, maxCents: 500 },
    static_multi: { mode: 'fixed', minCents: 600, maxCents: 1200 },
    dynamic_basic: { mode: 'fixed', minCents: 1900, maxCents: 4900 },
    dynamic_complex: { mode: 'fixed', minCents: 3900, maxCents: 9900 },
  },
  hostingPlans: {
    static_starter: 3000,
    static_growth: 5000,
    dynamic_basic: 50000,
    dynamic_pro: 100000,
  },
  onboardingPriceCents: 900,
  appPriceItems: {
    screenshot: { minCents: 300, maxCents: 500 },
    apk: { minCents: 800, maxCents: 1200 },
  },
};

export function PricingConsole() {
  const t = useTranslation().pricingConsole;
  const { locale } = useLocale();
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
  const complexityLabels: Record<string, string> = {
    static_single: t.complexityStaticSingle,
    static_multi: t.complexityStaticMulti,
    dynamic_basic: t.complexityDynamicBasic,
    dynamic_complex: t.complexityDynamicComplex,
  };
  const hostingLabels: Record<string, string> = {
    static_starter: t.hostingStaticStarter,
    static_growth: t.hostingStaticGrowth,
    dynamic_basic: t.hostingDynamicBasic,
    dynamic_pro: t.hostingDynamicPro,
  };
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<PricingHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const loadConfig = () => {
    fetch('/api/platform-admin/pricing')
      .then((r) => r.json())
      .then((data) => {
        setConfig({ ...DEFAULT_CONFIG, ...data } as PricingConfig);
      });
  };

  const loadHistory = () => {
    fetch('/api/platform-admin/pricing/history')
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetch('/api/platform-admin/pricing')
      .then((r) => r.json())
      .then((data) => {
        setConfig({ ...DEFAULT_CONFIG, ...data } as PricingConfig);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (historyOpen) loadHistory();
  }, [historyOpen]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/platform-admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || t.saveFailed);
        return;
      }
      setConfig({ ...DEFAULT_CONFIG, ...data });
      setMessage(t.saved);
      if (historyOpen) loadHistory();
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage(t.networkError);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG });
  };

  const updateCloneItem = (key: string, item: ClonePriceItem) => {
    if (!config) return;
    setConfig({
      ...config,
      clonePriceItems: { ...config.clonePriceItems, [key]: item },
    });
  };

  const updateHostingPlan = (key: string, cents: number) => {
    if (!config) return;
    setConfig({
      ...config,
      hostingPlans: { ...config.hostingPlans, [key]: cents },
    });
  };

  const updateAppPrice = (mode: 'screenshot' | 'apk', field: 'minCents' | 'maxCents', value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      appPriceItems: {
        ...config.appPriceItems,
        [mode]: { ...config.appPriceItems[mode], [field]: value },
      },
    });
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
      {/* 克隆价格 - 按复杂度 */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="mb-2 font-heading text-[15px] font-bold">{t.clonePriceTitle}</h2>
        <p className="mb-6 text-[13px] text-[var(--muted)]">{t.clonePriceHint}</p>
        <div className="space-y-4">
          {(['static_single', 'static_multi', 'dynamic_basic', 'dynamic_complex'] as const).map((key) => {
            const item = config.clonePriceItems[key] ?? { mode: 'fixed' as const, minCents: 300, maxCents: 500 };
            return (
              <div key={key} className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border2)] bg-[var(--bg)] p-4">
                <span className="w-28 text-[14px] font-medium">{complexityLabels[key]}</span>
                <select
                  value={item.mode ?? 'fixed'}
                  onChange={(e) =>
                    updateCloneItem(key, {
                      mode: e.target.value as 'fixed' | 'multiplier',
                      minCents: item.minCents ?? 300,
                      maxCents: item.maxCents ?? 500,
                      multiplier: item.multiplier ?? 5,
                    })
                  }
                  className="rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 py-2 text-[13px]"
                >
                  <option value="fixed">{t.fixed}</option>
                  <option value="multiplier">{t.multiplier}</option>
                </select>
                {item.mode === 'fixed' ? (
                  <>
                    <input
                      type="number"
                      min={0}
                      placeholder="min"
                      value={item.minCents ?? ''}
                      onChange={(e) =>
                        updateCloneItem(key, {
                          ...item,
                          minCents: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-20 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-2 py-1.5 text-[13px]"
                    />
                    <span className="text-[var(--muted)]">-</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="max"
                      value={item.maxCents ?? ''}
                      onChange={(e) =>
                        updateCloneItem(key, {
                          ...item,
                          maxCents: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-20 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-2 py-1.5 text-[13px]"
                    />
                    <span className="text-[12px] text-[var(--muted)]">{t.cents(item.minCents ?? 0, item.maxCents ?? 0)}</span>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={0.5}
                      value={item.multiplier ?? 5}
                      onChange={(e) =>
                        updateCloneItem(key, { ...item, multiplier: parseFloat(e.target.value) || 5 })
                      }
                      className="w-16 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-2 py-1.5 text-[13px]"
                    />
                    <span className="text-[12px] text-[var(--muted)]">{t.timesCost}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* APP 克隆价格 */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="mb-6 font-heading text-[15px] font-bold">{t.appCloneTitle}</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-[13px] text-[var(--muted)]">{t.screenshotMode}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={config.appPriceItems.screenshot.minCents}
                onChange={(e) => updateAppPrice('screenshot', 'minCents', parseInt(e.target.value, 10) || 0)}
                className="w-20 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
              />
              <span>-</span>
              <input
                type="number"
                min={0}
                value={config.appPriceItems.screenshot.maxCents}
                onChange={(e) => updateAppPrice('screenshot', 'maxCents', parseInt(e.target.value, 10) || 0)}
                className="w-20 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
              />
              <span className="text-[13px] text-[var(--muted)]">{t.centsUnit}</span>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[13px] text-[var(--muted)]">{t.apkMode}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={config.appPriceItems.apk.minCents}
                onChange={(e) => updateAppPrice('apk', 'minCents', parseInt(e.target.value, 10) || 0)}
                className="w-20 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
              />
              <span>-</span>
              <input
                type="number"
                min={0}
                value={config.appPriceItems.apk.maxCents}
                onChange={(e) => updateAppPrice('apk', 'maxCents', parseInt(e.target.value, 10) || 0)}
                className="w-20 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
              />
              <span className="text-[13px] text-[var(--muted)]">{t.centsUnit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 托管套餐价格 */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="mb-6 font-heading text-[15px] font-bold">{t.hostingTitle}</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(config.hostingPlans).map(([key, cents]) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3">
              <span className="text-[14px]">{hostingLabels[key] ?? key}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={cents}
                  onChange={(e) => updateHostingPlan(key, parseInt(e.target.value, 10) || 0)}
                  className="w-24 rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 py-2 text-[14px]"
                />
                <span className="text-[13px] text-[var(--muted)]">{t.hostingCents(cents)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新用户体验价 */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="mb-6 font-heading text-[15px] font-bold">{t.onboardingTitle}</h2>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min={0}
            value={config.onboardingPriceCents}
            onChange={(e) =>
              setConfig({ ...config, onboardingPriceCents: parseInt(e.target.value, 10) || 0 })
            }
            className="w-24 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-2.5 text-[14px]"
          />
          <span className="text-[13px] text-[var(--muted)]">{t.onboardingCents(config.onboardingPriceCents)}</span>
        </div>
      </div>

      {/* 兜底与默认倍数（倍数模式时使用） */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="mb-6 font-heading text-[15px] font-bold">{t.multiplierFallback}</h2>
        <p className="mb-4 text-[13px] text-[var(--muted)]">{t.multiplierHint}</p>
        <div className="flex flex-wrap gap-8">
          <div>
            <label className="mb-1 block text-[12px] text-[var(--muted)]">{t.globalProfit}</label>
            <input
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={config.profitMultiplier}
              onChange={(e) => setConfig({ ...config, profitMultiplier: parseFloat(e.target.value) || 5 })}
              className="w-20 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-[var(--muted)]">{t.minPrice}</label>
            <input
              type="number"
              min={0}
              value={config.minPriceCents}
              onChange={(e) => setConfig({ ...config, minPriceCents: parseInt(e.target.value, 10) || 0 })}
              className="w-24 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-[var(--muted)]">{t.maxPrice}</label>
            <input
              type="number"
              min={100}
              value={config.maxPriceCents}
              onChange={(e) => setConfig({ ...config, maxPriceCents: parseInt(e.target.value, 10) || 9900 })}
              className="w-24 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[14px]"
            />
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
        <button
          onClick={handleReset}
          className="rounded-lg border border-[var(--border)] px-6 py-3 text-[14px] text-[var(--muted)] hover:border-[var(--border2)] hover:text-[var(--text)]"
        >
          {t.resetDefault}
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen(!historyOpen)}
          className="rounded-lg border border-[var(--border)] px-6 py-3 text-[14px] text-[var(--muted)] hover:border-[var(--border2)] hover:text-[var(--text)]"
        >
          {t.historyToggle(historyOpen)}
        </button>
        {message && (
          <span className={`text-[14px] ${message === t.saved || message === t.rollbackSuccess ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {message}
          </span>
        )}
      </div>

      {/* 定价历史与回滚 */}
      {historyOpen && (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="mb-4 font-heading text-[15px] font-bold">{t.historyTitle}</h2>
          <p className="mb-4 text-[13px] text-[var(--muted)]">
            {t.historyDesc}
          </p>
          {history.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">{t.noHistory}</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-4 py-3"
                >
                  <div className="text-[13px]">
                    <span className="text-[var(--muted)]">{new Date(h.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span className="ml-3 text-[var(--text)]">{h.createdBy}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setRollingBack(h.id);
                      try {
                        const res = await fetch('/api/platform-admin/pricing/rollback', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ snapshotId: h.id }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setMessage(data.error || t.rollbackFailed);
                          return;
                        }
                        loadConfig();
                        loadHistory();
                        setMessage(t.rollbackSuccess);
                        setTimeout(() => setMessage(null), 3000);
                      } catch {
                        setMessage(t.rollbackFailed);
                      } finally {
                        setRollingBack(null);
                      }
                    }}
                    disabled={rollingBack !== null}
                    className="rounded-lg border border-[var(--accent)] px-4 py-1.5 text-[13px] text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50"
                  >
                    {rollingBack === h.id ? t.rollingBack : t.rollback}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
