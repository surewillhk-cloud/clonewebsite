'use client';

interface CodePreviewToggleProps {
  mode: 'code' | 'preview';
  onToggle: (mode: 'code' | 'preview') => void;
}

export function CodePreviewToggle({ mode, onToggle }: CodePreviewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg)] rounded-lg p-0.5 border border-[var(--border-faint)]">
      <button
        onClick={() => onToggle('code')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
          mode === 'code'
            ? 'bg-[var(--accent)] text-white shadow-sm'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Code
      </button>
      <button
        onClick={() => onToggle('preview')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
          mode === 'preview'
            ? 'bg-[var(--accent)] text-white shadow-sm'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview
      </button>
    </div>
  );
}
