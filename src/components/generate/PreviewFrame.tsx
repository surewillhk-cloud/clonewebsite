'use client';

interface PreviewFrameProps {
  url: string | null;
}

export function PreviewFrame({ url }: PreviewFrameProps) {
  if (!url) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg)]">
        <div className="text-center">
          <div className="text-3xl mb-3">🖥️</div>
          <div className="text-[13px] text-[var(--muted)] mb-2">No preview available</div>
          <div className="text-[12px] text-[var(--muted-dark)]">
            Generate code to see live preview
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white">
      <iframe
        src={url}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="Preview"
      />
    </div>
  );
}
