import { useState, useRef, useCallback, useEffect, type DragEvent } from 'react';
import type { Translations } from '../i18n/translations';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  t: Translations;
  onSampleLoad?: () => void;
}

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/avif',
  'image/tiff',
]);

const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif|gif|avif|tiff?)$/i;

function isValidFile(file: File): boolean {
  return ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.test(file.name);
}

export default function DropZone({ onFilesSelected, t, onSampleLoad }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const allFiles = Array.from(fileList);
      const validFiles = allFiles.filter(isValidFile);
      const skipped = allFiles.length - validFiles.length;
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
      if (skipped > 0) {
        setSkippedCount(skipped);
        setTimeout(() => setSkippedCount(0), 4000);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      // Only handle paste when not focused on an editable element (input, textarea, etc.)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file && isValidFile(file)) {
            files.push(file);
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  // Register paste listener — scoped to avoid intercepting pastes in input fields
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-6 py-12 md:p-14
        text-center transition-all duration-200 min-h-[200px]
        overflow-hidden group
        ${isDragging
          ? 'border-[var(--color-primary)] bg-blue-50/80 scale-[1.01]'
          : 'border-[var(--color-border)] bg-gradient-to-br from-[var(--color-bg-alt)] to-blue-50/30 hover:border-[var(--color-primary)] hover:from-blue-50/50 hover:to-indigo-50/30'
        }
      `}
    >
      {/* Animated background decoration */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.avif,.tiff,.tif"
        multiple
        className="sr-only"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      <div className="relative flex flex-col items-center gap-4">
        {/* Upload icon with pulse animation */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-200 ${isDragging ? 'bg-blue-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
          <svg className={`w-8 h-8 text-[var(--color-primary)] transition-transform duration-200 ${isDragging ? 'scale-110 -translate-y-1' : 'group-hover:-translate-y-1'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <div>
          <p className="text-xl font-semibold text-[var(--color-text)]">
            {t.tool.dropPhotosHere}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="mt-3 inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-base hover:bg-[var(--color-primary-dark)] transition-colors min-h-[44px] shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {t.tool.browseFiles}
          </button>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            {t.dropzone.hint}
          </p>
        </div>

        {/* Format badges */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {['JPG', 'PNG', 'WebP', 'HEIC', 'GIF', 'AVIF', 'TIFF'].map((fmt) => (
            <span key={fmt} className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text-muted)]">
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {/* Trust indicator */}
      <div className="flex flex-col items-center gap-1.5 mt-2">
        {skippedCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-warning)] font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{skippedCount} {t.tool.skippedFiles}</span>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t.dropzone.trust}</span>
        </div>
      </div>

      {/* Sample images */}
      {onSampleLoad && (
        <div className="flex flex-col items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)]">{t.dropzone.trySample}</span>
          <div className="flex items-center gap-2">
            {(['sample-city', 'sample-nature', 'sample-portrait'] as const).map((name) => (
              <button
                key={name}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isLoadingSample) return;
                  setIsLoadingSample(true);
                  try {
                    const resp = await fetch(`/samples/${name}.jpg`);
                    const blob = await resp.blob();
                    const file = new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
                    onFilesSelected([file]);
                    onSampleLoad();
                  } catch {
                    // silently fail
                  } finally {
                    setIsLoadingSample(false);
                  }
                }}
                disabled={isLoadingSample}
                className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                aria-label={t.dropzone[name as keyof typeof t.dropzone] as string || name}
              >
                <img
                  src={`/samples/${name}.jpg`}
                  alt={name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isLoadingSample && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
