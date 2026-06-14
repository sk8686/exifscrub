import { useState, useCallback } from 'react';
import DropZone from './DropZone';
import PhotoGrid, { type PhotoItem } from './PhotoGrid';
import MetaPanel from './MetaPanel';
import CleanActions from './CleanActions';
import { readExif } from '../lib/exif-reader';
import { cleanFile } from '../lib/exif-cleaner';

export default function ExifRemover() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPhoto = photos.find((p) => p.id === selectedId) ?? null;

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newPhotos: PhotoItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      thumbnail: URL.createObjectURL(file),
      exifData: null,
      cleanedFile: null,
      cleanedExif: null,
      originalSize: file.size,
      cleanedSize: null,
      isProcessing: true,
      isCleaned: false,
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);

    if (newPhotos.length > 0 && !selectedId) {
      setSelectedId(newPhotos[0].id);
    }

    for (const photo of newPhotos) {
      const exifData = await readExif(photo.file);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, exifData, isProcessing: false } : p
        )
      );
    }
  }, [selectedId]);

  const handleCleanSingle = useCallback(async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (!photo || photo.isProcessing || photo.isCleaned) return;

    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isProcessing: true } : p))
    );

    try {
      const result = await cleanFile(photo.file);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                cleanedFile: result.cleanedFile,
                cleanedExif: result.cleanedExif,
                cleanedSize: result.cleanedSize,
                isProcessing: false,
                isCleaned: true,
              }
            : p
        )
      );
    } catch {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isProcessing: false } : p))
      );
    }
  }, [photos]);

  const handleCleanAll = useCallback(async () => {
    const uncleaned = photos.filter((p) => !p.isCleaned && !p.isProcessing);
    for (const photo of uncleaned) {
      await handleCleanSingle(photo.id);
    }
  }, [photos, handleCleanSingle]);

  const hasPhotos = photos.length > 0;

  return (
    <div className="space-y-6">
      {/* Trust banner */}
      <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-primary)] font-medium text-center">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>100% local processing — your files never leave your device</span>
      </div>

      {/* Drop zone */}
      <DropZone onFilesSelected={handleFilesSelected} />

      {/* Photo grid + detail panel */}
      {hasPhotos && (
        <>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} loaded
            </h2>
            <CleanActions
              photos={photos}
              onCleanSingle={handleCleanSingle}
              onCleanAll={handleCleanAll}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <PhotoGrid
                photos={photos}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            <div className="lg:col-span-3">
              {selectedPhoto ? (
                <MetaPanel photo={selectedPhoto} />
              ) : (
                <div className="bg-[var(--color-bg-alt)] rounded-xl p-6 text-center text-[var(--color-text-muted)]">
                  Select a photo to view its metadata
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
