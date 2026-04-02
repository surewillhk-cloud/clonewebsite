'use client';

import { useEffect } from 'react';

/**
 * 用于 Dashboard 布局：用户通过推荐链接注册且需邮箱验证时，
 * 首次进入 Dashboard 时从 sessionStorage 取出 ref 并绑定
 */
export function ReferralBinder() {
  useEffect(() => {
    const ref = typeof window !== 'undefined' ? sessionStorage.getItem('ch007-ref') : null;
    if (!ref) return;

    fetch('/api/referral/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }),
    })
      .then((r) => (r.ok ? sessionStorage.removeItem('ch007-ref') : undefined))
      .catch(() => {});
  }, []);

  return null;
}
