import { useState } from 'react';
import pkg from 'file-saver';
const { saveAs } = pkg;
import JSZip from 'jszip';
import type { PhotoItem } from './PhotoGrid';
import type { Translations } from '../i18n/translations';

interface CleanActionsProps {
  photos: PhotoItem[];
  onCleanAll: () => void;
  onDownloadActivity?: () => void;
  t: Translations;
}

export default function CleanActions({ photos, onCleanAll, onDownloadActivity, t }: CleanActionsProps) {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const cleanedPhotos = photos.filter((p) => p.isCleaned && p.cleanedFile);
  const uncleanedPhotos = photos.filter((p) => !p.isCleaned && !p.isProcessing);
  // Only show Clean button for photos that actually have sensitive metadata
  const photosWithRisks = uncleanedPhotos.filter(
    (p) => p.exifData && (p.exifData.riskCount.high > 0 || p.exifData.riskCount.medium > 0)
  );
  const isProcessing = photos.some((p) => p.isProcessing);

  const handleDownloadAll = async () => {
    if (cleanedPhotos.length === 0) return;

    onDownloadActivity?.();
    setIsDownloadingAll(true);
    try {
      if (cleanedPhotos.length === 1) {
        saveAs(cleanedPhotos[0].cleanedFile!, cleanedPhotos[0].cleanedFile!.name);
      } else {
        const zip = new JSZip();
        for (const photo of cleanedPhotos) {
          zip.file(photo.cleanedFile!.name, photo.cleanedFile!);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'cleaned-photos.zip');
      }
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {photosWithRisks.length >= 1 && (
        <button
          onClick={onCleanAll}
          disabled={isProcessing}
          className="px-4 py-3 sm:px-5 sm:py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium text-sm hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isProcessing ? t.tool.processing : photosWithRisks.length === 1 ? t.tool.cleanPhoto : `${t.tool.cleanAll} (${photosWithRisks.length})`}
        </button>
      )}

      {uncleanedPhotos.length > 0 && photosWithRisks.length === 0 && !isProcessing && (
        <span className="text-sm text-[var(--color-success)] font-medium px-3 py-2 min-h-[44px] flex items-center">
          {t.tool.noSensitiveMetadata}
        </span>
      )}

      {cleanedPhotos.length > 0 && (
        <button
          onClick={handleDownloadAll}
          disabled={isDownloadingAll}
          className="px-4 py-3 sm:px-5 sm:py-2.5 bg-[var(--color-success)] text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isDownloadingAll
            ? t.tool.preparing
            : cleanedPhotos.length === 1
              ? t.tool.downloadCleanedPhoto
              : `${t.tool.downloadAll} (${cleanedPhotos.length})`}
        </button>
      )}
    </div>
  );
}
