'use client';

import { useState } from 'react';

interface HostDeployButtonProps {
  taskId: string;
  hostingPlan?: string;
}

/** 检测托管订阅是否已配置（有有效的 Stripe Price ID） */
const HOSTING_CHECKOUT_ENABLED =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export function HostDeployButton({
  taskId,
  hostingPlan = 'static_starter',
}: HostDeployButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // 若配置了 Stripe，优先走订阅支付流程；否则直接部署（测试用）
      const useCheckout = HOSTING_CHECKOUT_ENABLED;
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

      if (data.deploymentUrl) window.open(data.deploymentUrl, '_blank');
      if (data.githubRepoUrl) window.open(data.githubRepoUrl, '_blank');
      alert(
        useCheckout
          ? '支付成功！部署已启动，约 3-5 分钟完成'
          : '部署已启动！GitHub 仓库已创建，Railway 正在构建（约 3-5 分钟）'
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '部署失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-[10px] border-2 border-[var(--green)] px-6 py-2.5 text-[13px] font-medium text-[var(--green)] transition-colors hover:bg-[var(--green)]/10 disabled:opacity-50"
    >
      {loading ? '处理中...' : '☁ 一键托管 →'}
    </button>
  );
}
