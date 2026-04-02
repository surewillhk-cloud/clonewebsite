'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DeployCardProps {
  taskId: string;
  hostingPlan?: string;
}

export function DeployCard({ taskId, hostingPlan = 'static_starter' }: DeployCardProps) {
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<{
    siteId: string;
    githubRepoUrl: string;
    deploymentUrl?: string;
    error?: string;
  } | null>(null);

  const handleDeploy = async () => {
    setDeploying(true);
    setResult(null);
    try {
      const useCheckout = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      const endpoint = useCheckout
        ? '/api/hosting/checkout'
        : '/api/hosting/deploy';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, hostingPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '部署失败');

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setResult(data);
    } catch (err) {
      setResult({
        siteId: '',
        githubRepoUrl: '',
        error: err instanceof Error ? err.message : '部署失败',
      });
    } finally {
      setDeploying(false);
    }
  };

  if (result?.error) {
    return (
      <div className="rounded-[14px] border-2 border-red-500/30 bg-red-500/5 p-6">
        <div className="mb-2 font-heading text-[14px] font-bold text-red-400">部署失败</div>
        <p className="mb-4 text-[13px] text-[var(--muted)]">{result.error}</p>
        <button
          onClick={handleDeploy}
          disabled={deploying}
          className="w-full rounded-[10px] border border-[var(--border2)] py-3 text-[13px] text-[var(--muted)] hover:bg-[var(--surface2)] disabled:opacity-50"
        >
          {deploying ? '部署中...' : '重试'}
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-[14px] border-2 border-[var(--green)]/30 bg-[var(--green)]/5 p-6">
        <div className="mb-2 font-heading text-[14px] font-bold text-[var(--green)]">✓ 部署已启动</div>
        <div className="mb-4 space-y-2 text-[12px]">
          <div>
            <span className="text-[var(--muted)]">GitHub：</span>
            <a
              href={result.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-[var(--accent)] hover:underline"
            >
              {result.githubRepoUrl}
            </a>
          </div>
          {result.deploymentUrl && (
            <div>
              <span className="text-[var(--muted)]">访问地址：</span>
              <a
                href={result.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-[var(--accent)] hover:underline"
              >
                {result.deploymentUrl}
              </a>
            </div>
          )}
        </div>
        <p className="mb-4 text-[11px] text-[var(--muted)]">
          Railway 构建约需 3-5 分钟，请稍后在控制台查看。
        </p>
        {result.siteId && (
          <Link
            href={`/hosting/${result.siteId}`}
            className="block rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2 text-center text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20"
          >
            管理站点 →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border-2 border-[rgba(79,126,255,0.2)] bg-gradient-to-br from-[rgba(79,126,255,0.08)] to-[rgba(123,92,255,0.05)] p-6">
      <div className="mb-2 font-heading text-[14px] font-bold">☁️ 一键部署托管</div>
      <div className="mb-4 text-[13px] leading-[1.5] text-[var(--muted)]">
        平台自动创建 GitHub 私有仓库并部署到 Railway，代码归你所有。
      </div>
      <div className="mb-5 flex flex-col gap-1.5">
        {['自动创建 GitHub 私有仓库', 'Railway 自动构建 + 部署', '自定义域名 + SSL 证书', '代码更新自动重部署'].map(
          (f) => (
            <div key={f} className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
              <span className="text-[var(--green)]">✓</span> {f}
            </div>
          )
        )}
      </div>
      <button
        onClick={handleDeploy}
        disabled={deploying}
        className="w-full rounded-[10px] bg-[var(--accent)] py-3 text-[13px] font-medium text-white transition-colors hover:bg-[#6B91FF] disabled:opacity-50"
      >
        {deploying ? '部署中...' : '选择托管套餐 →'}
      </button>
      <div className="mt-2 text-center text-[11px] text-[var(--muted)]">
        静态入门 $30/月 · 动态基础 $500/月 · 含 Railway 费用
      </div>
    </div>
  );
}
