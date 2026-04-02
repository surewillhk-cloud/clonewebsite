'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const MAX_SIZE_MB = 100;

export interface ApkUploaderProps {
  value: string | null;
  onChange: (r2Key: string | null) => void;
  disabled?: boolean;
}

export function ApkUploader({ value, onChange, disabled }: ApkUploaderProps) {
  const t = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || disabled || uploading) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.apk')) {
        setError(t.apkUploader.selectApk);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(t.apkUploader.fileTooLarge(MAX_SIZE_MB));
        return;
      }
      setError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('apk', file);
        const res = await fetch('/api/app/upload-apk', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? t.apkUploader.uploadFailed);
        }
        onChange(data.r2Key);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.apkUploader.uploadFailed);
        onChange(null);
      } finally {
        setUploading(false);
      }
    },
    [onChange, disabled, uploading, t]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || uploading) return;
    processFile(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files);
    e.target.value = '';
  };

  const remove = () => onChange(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-heading text-[15px] font-bold">
        📦 {t.apkUploader.title}
      </div>
      <div className="text-[13px] text-[var(--muted)]">
        {t.apkUploader.desc(MAX_SIZE_MB)}
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--orange)]/50 bg-[rgba(255,122,61,0.08)] px-4 py-2 text-[12px] text-[var(--orange)]">
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={handleDrop}
        className={`rounded-[10px] border-2 border-dashed p-8 text-center transition-colors ${
          value ? 'border-[var(--green)]/50 bg-[rgba(0,208,132,0.06)]' : 'border-[var(--border2)] bg-[var(--surface2)]'
        } ${disabled || uploading ? 'opacity-50' : ''}`}
      >
        {value ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-[14px] font-medium text-[var(--green)]">✓ {t.apkUploader.uploaded}</div>
            <div className="text-[12px] text-[var(--muted)]">{t.apkUploader.continueHint}</div>
            <button
              type="button"
              onClick={remove}
              disabled={disabled || uploading}
              className="rounded-lg border border-[var(--border2)] px-4 py-2 text-[12px] text-[var(--muted)] hover:bg-[var(--surface3)] disabled:opacity-50"
            >
              {t.apkUploader.reselect}
            </button>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept=".apk"
              onChange={handleFileInput}
              disabled={disabled || uploading}
              className="hidden"
              id="apk-upload"
            />
            <label
              htmlFor="apk-upload"
              className={`cursor-pointer ${disabled || uploading ? 'pointer-events-none' : ''}`}
            >
              <div className="mb-2 text-3xl">📦</div>
              <div className="text-[14px] text-[var(--muted)]">
                {uploading ? t.apkUploader.uploading : t.apkUploader.clickOrDrag}
              </div>
            </label>
          </>
        )}
      </div>
    </div>
  );
}
