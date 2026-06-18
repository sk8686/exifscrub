import { useState, useCallback, useRef, useEffect } from 'react';
import DropZone from './DropZone';
import PhotoGrid, { type PhotoItem } from './PhotoGrid';
import MetaPanel from './MetaPanel';
import CleanActions from './CleanActions';
import { readExif } from '../lib/exif-reader';
import { cleanFile } from '../lib/exif-cleaner';
import type { Translations } from '../i18n/translations';

const AUTO_DELETE_MS = 5 * 60 * 1000; // 5 minutes

async function computeSHA256(file: File): Promise<string | null> {
  try {
    if (!crypto.subtle) return null;
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

interface ExifRemoverProps {
  t: Translations;
}

export default function ExifRemover({ t }: ExifRemoverProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const autoDeleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cleanAllInFlight = useRef(false);
  const [autoDeleteVersion, setAutoDeleteVersion] = useState(0);

  const selectedPhoto = photos.find((p) => p.id === selectedId) ?? null;

  // Cleanup ObjectURLs on unmount
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.thumbnail));
    };
  }, []);

  // Auto-delete cleaned files after 5 minutes
  useEffect(() => {
    const cleanedPhotos = photos.filter((p) => p.isCleaned && p.cleanedFile && !autoDeleteTimers.current.has(p.id));
    for (const photo of cleanedPhotos) {
      const timer = setTimeout(() => {
        setPhotos((prev) => {
          const updated = prev.map((p) =>
            p.id === photo.id ? { ...p, cleanedFile: null } : p
          );
          photosRef.current = updated;
          return updated;
        });
        autoDeleteTimers.current.delete(photo.id);
      }, AUTO_DELETE_MS);
      autoDeleteTimers.current.set(photo.id, timer);
    }
  }, [photos, autoDeleteVersion]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newPhotos: PhotoItem[] = files.map((file) => ({
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36),
      file,
      thumbnail: URL.createObjectURL(file),
      exifData: null,
      cleanedFile: null,
      cleanedExif: null,
      originalSize: file.size,
      cleanedSize: null,
      isProcessing: true,
      isCleaned: false,
      error: null,
      sha256: null,
    }));

    setPhotos((prev) => {
      const updated = [...prev, ...newPhotos];
      photosRef.current = updated;
      return updated;
    });

    setSelectedId((prev) => prev ?? newPhotos[0]?.id ?? null);

    for (const photo of newPhotos) {
      try {
        const exifData = await readExif(photo.file);
        setPhotos((prev) => {
          const updated = prev.map((p) =>
            p.id === photo.id ? { ...p, exifData, isProcessing: false } : p
          );
          photosRef.current = updated;
          return updated;
        });
      } catch (err) {
        console.error('readExif failed:', err);
        setPhotos((prev) => {
          const updated = prev.map((p) =>
            p.id === photo.id ? { ...p, isProcessing: false, error: `${t.errorReadFile} ${err instanceof Error ? err.message : t.errorUnknown}` } : p
          );
          photosRef.current = updated;
          return updated;
        });
      }
    }
  }, []);

  const handleRemove = useCallback((id: string) => {
    let remaining: PhotoItem[] = [];
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.thumbnail);
      const updated = prev.filter((p) => p.id !== id);
      remaining = updated;
      photosRef.current = updated;
      return updated;
    });
    // Clear auto-delete timer
    const timer = autoDeleteTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      autoDeleteTimers.current.delete(id);
    }
    setSelectedId((prev) => {
      if (prev === id) {
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prev;
    });
  }, []);

  const handleCleanSingle = useCallback(async (id: string) => {
    const photo = photosRef.current.find((p) => p.id === id);
    if (!photo || photo.isProcessing || photo.isCleaned) return;

    setPhotos((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, isProcessing: true, error: null } : p));
      photosRef.current = updated;
      return updated;
    });

    try {
      const result = await cleanFile(photo.file);
      const sha256 = await computeSHA256(result.cleanedFile);
      setPhotos((prev) => {
        const updated = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                cleanedFile: result.cleanedFile,
                cleanedExif: result.cleanedExif,
                cleanedSize: result.cleanedSize,
                isProcessing: false,
                isCleaned: true,
                error: null,
                sha256,
              }
            : p
        );
        photosRef.current = updated;
        return updated;
      });
    } catch (err) {
      console.error('cleanFile failed:', err);
      const isHeic = /\.heic$/i.test(photo.file.name) || /\.heif$/i.test(photo.file.name) || photo.file.type === 'image/heic' || photo.file.type === 'image/heif';
      const errorMsg = isHeic
        ? t.errorHeicNotSupported
        : `${t.errorCleanFile} ${err instanceof Error ? err.message : t.errorUnknown}`;
      setPhotos((prev) => {
        const updated = prev.map((p) => (p.id === id ? { ...p, isProcessing: false, error: errorMsg } : p));
        photosRef.current = updated;
        return updated;
      });
    }
  }, []);

  const handleCleanAll = useCallback(async () => {
    if (cleanAllInFlight.current) return;
    cleanAllInFlight.current = true;
    try {
      const uncleaned = photosRef.current.filter((p) => !p.isCleaned && !p.isProcessing && p.exifData && (p.exifData.riskCount.high > 0 || p.exifData.riskCount.medium > 0));
      for (const photo of uncleaned) {
        await handleCleanSingle(photo.id);
      }
    } finally {
      cleanAllInFlight.current = false;
    }
  }, [handleCleanSingle]);

  const handleDeleteNow = useCallback(() => {
    setPhotos((prev) => {
      const updated = prev.map((p) => (p.isCleaned ? { ...p, cleanedFile: null } : p));
      photosRef.current = updated;
      return updated;
    });
    autoDeleteTimers.current.forEach((timer) => clearTimeout(timer));
    autoDeleteTimers.current.clear();
  }, []);

  // Reset auto-delete timers on user activity (e.g., download)
  const resetAutoDeleteTimers = useCallback(() => {
    autoDeleteTimers.current.forEach((timer) => clearTimeout(timer));
    autoDeleteTimers.current.clear();
    setAutoDeleteVersion((v) => v + 1);
  }, []);

  const hasPhotos = photos.length > 0;
  const hasCleanedFiles = photos.some((p) => p.isCleaned && p.cleanedFile);

  return (
    <div className="space-y-6">
      {/* Drop zone — always visible */}
      <DropZone onFilesSelected={handleFilesSelected} t={t} onSampleLoad={() => {}} />

      {/* Photo grid + detail panel */}
      {hasPhotos && (
        <>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {photos.length} {t.tool.photosLoaded}
            </h2>
            <CleanActions
              photos={photos}
              onCleanAll={handleCleanAll}
              onDownloadActivity={resetAutoDeleteTimers}
              t={t}
            />
          </div>

          {/* Auto-delete notice */}
          {hasCleanedFiles && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm">
              <span className="text-amber-700">
                {t.tool.autoDeleteNotice}
              </span>
              <button
                onClick={handleDeleteNow}
                className="text-sm font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2 ml-4 shrink-0 min-h-[44px] px-2"
              >
                {t.tool.deleteNow}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <PhotoGrid
                photos={photos}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onRemove={handleRemove}
                t={t}
              />
            </div>

            <div className="lg:col-span-3">
              {selectedPhoto ? (
                <MetaPanel photo={selectedPhoto} onDownloadActivity={resetAutoDeleteTimers} t={t} />
              ) : (
                <div className="bg-[var(--color-bg-alt)] rounded-xl p-6 text-center text-[var(--color-text-muted)]">
                  {t.tool.selectPhoto}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
