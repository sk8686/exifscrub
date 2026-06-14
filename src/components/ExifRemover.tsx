import { useState, useCallback, useRef } from 'react';
import DropZone from './DropZone';
import PhotoGrid, { type PhotoItem } from './PhotoGrid';
import MetaPanel from './MetaPanel';
import CleanActions from './CleanActions';
import { readExif } from '../lib/exif-reader';
import { cleanFile } from '../lib/exif-cleaner';

export default function ExifRemover() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

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

    setPhotos((prev) => {
      const updated = [...prev, ...newPhotos];
      photosRef.current = updated;
      return updated;
    });

    setSelectedId((prev) => prev ?? newPhotos[0]?.id ?? null);

    for (const photo of newPhotos) {
      const exifData = await readExif(photo.file);
      setPhotos((prev) => {
        const updated = prev.map((p) =>
          p.id === photo.id ? { ...p, exifData, isProcessing: false } : p
        );
        photosRef.current = updated;
        return updated;
      });
    }
  }, []);

  const handleCleanSingle = useCallback(async (id: string) => {
    const photo = photosRef.current.find((p) => p.id === id);
    if (!photo || photo.isProcessing || photo.isCleaned) return;

    setPhotos((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, isProcessing: true } : p));
      photosRef.current = updated;
      return updated;
    });

    try {
      const result = await cleanFile(photo.file);
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
              }
            : p
        );
        photosRef.current = updated;
        return updated;
      });
    } catch {
      setPhotos((prev) => {
        const updated = prev.map((p) => (p.id === id ? { ...p, isProcessing: false } : p));
        photosRef.current = updated;
        return updated;
      });
    }
  }, []);

  const handleCleanAll = useCallback(async () => {
    const uncleaned = photosRef.current.filter((p) => !p.isCleaned && !p.isProcessing);
    for (const photo of uncleaned) {
      await handleCleanSingle(photo.id);
    }
  }, [handleCleanSingle]);

  const hasPhotos = photos.length > 0;

  return (
    <div className="space-y-6">
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
