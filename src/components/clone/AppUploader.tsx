'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const MAX_FILES = 5;
const MAX_SIZE_MB = 2;

export interface AppUploaderProps {
  value: string[];
  onChange: (base64List: string[]) => void;
  disabled?: boolean;
}

export function AppUploader({ value, onChange, disabled }: AppUploaderProps) {
  const t = useTranslation();
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length || value.length >= MAX_FILES) return;
      const remaining = MAX_FILES - value.length;
      const toProcess = Array.from(files).slice(0, remaining);
      const valid = toProcess.filter((f) => {
        const isImage = f.type.startsWith('image/');
        const okSize = f.size <= MAX_SIZE_MB * 1024 * 1024;
        return isImage && okSize;
      });

      const newList: string[] = [...value];
      let done = 0;
      valid.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (result.startsWith('data:')) {
            newList.push(result);
            done++;
            if (done === valid.length) {
              onChange(newList.slice(0, MAX_FILES));
            }
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [value, onChange]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const removeAt = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-heading text-[15px] font-bold">
        📱 {t.appUploader.title}
      </div>
      <div className="text-[13px] text-[var(--muted)]">
        {t.appUploader.desc(MAX_SIZE_MB)}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-[10px] border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-[var(--accent)] bg-[rgba(79,126,255,0.08)]'
            : 'border-[var(--border2)] bg-[var(--surface2)]'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
          id="app-screenshot-upload"
        />
        <label
          htmlFor="app-screenshot-upload"
          className={`cursor-pointer ${disabled ? 'pointer-events-none' : ''}`}
        >
          <div className="mb-2 text-3xl">📷</div>
          <div className="text-[14px] text-[var(--muted)]">
            {t.appUploader.clickOrDrag}
          </div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">
            {t.appUploader.selected(value.length, MAX_FILES)}
          </div>
        </label>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((dataUrl, i) => (
            <div
              key={i}
              className="relative h-24 w-24 overflow-hidden rounded-lg border border-[var(--border2)] bg-[var(--surface2)]"
            >
              <img
                src={dataUrl}
                alt={t.appUploader.screenshotAlt(i + 1)}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={disabled}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
