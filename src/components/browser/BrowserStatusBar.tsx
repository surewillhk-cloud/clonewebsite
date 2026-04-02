'use client';

interface BrowserStatusBarProps {
  currentUrl: string;
  loginStatus: { isLoggedIn: boolean; confidence: string } | null;
  onExtract: () => void;
  extracting: boolean;
}

export function BrowserStatusBar({
  currentUrl,
  loginStatus,
  onExtract,
  extracting,
}: BrowserStatusBarProps) {
  const canExtract = loginStatus?.isLoggedIn && loginStatus.confidence === 'high';

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--muted)] truncate max-w-[300px]" title={currentUrl}>
          {currentUrl || '—'}
        </span>
        {loginStatus && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              loginStatus.isLoggedIn && loginStatus.confidence === 'high'
                ? 'bg-[rgba(0,208,132,0.15)] text-[var(--green)]'
                : loginStatus.isLoggedIn && loginStatus.confidence === 'medium'
                  ? 'bg-[rgba(255,193,7,0.15)] text-[#f0ad4e]'
                  : 'bg-[var(--surface2)] text-[var(--muted)]'
            }`}
          >
            {loginStatus.isLoggedIn && loginStatus.confidence === 'high' && '🟢 已检测到登录'}
            {loginStatus.isLoggedIn && loginStatus.confidence === 'medium' && '🟡 可能已登录'}
            {(!loginStatus.isLoggedIn || loginStatus.confidence === 'uncertain') && '🔴 未检测到登录'}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onExtract}
        disabled={!canExtract || extracting}
        className="rounded-lg bg-[var(--accent)] px-5 py-2 text-[13px] font-medium text-white transition-all hover:bg-[#6B91FF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {extracting ? '提取中...' : '已完成登录，开始克隆 →'}
      </button>
    </div>
  );
}
