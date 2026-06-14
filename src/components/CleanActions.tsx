import { useState } from 'react';
import pkg from 'file-saver';
const { saveAs } = pkg;
import JSZip from 'jszip';
import type { PhotoItem } from './PhotoGrid';

interface CleanActionsProps {
  photos: PhotoItem[];
  onCleanSingle: (id: string) => void;
  onCleanAll: () => void;
}

export default function CleanActions({ photos, onCleanSingle, onCleanAll }: CleanActionsProps) {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const cleanedPhotos = photos.filter((p) => p.isCleaned && p.cleanedFile);
  const uncleanedPhotos = photos.filter((p) => !p.isCleaned && !p.isProcessing);
  const isProcessing = photos.some((p) => p.isProcessing);

  const handleDownloadAll = async () => {
    if (cleanedPhotos.length === 0) return;

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
      {uncleanedPhotos.length >= 1 && (
        <button
          onClick={() => onCleanSingle(uncleanedPhotos[0].id)}
          disabled={isProcessing}
          className="px-4 py-3 sm:px-5 sm:py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium text-sm hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isProcessing ? 'Processing...' : uncleanedPhotos.length === 1 ? 'Clean Photo' : `Clean All (${uncleanedPhotos.length})`}
        </button>
      )}

      {cleanedPhotos.length > 0 && (
        <button
          onClick={handleDownloadAll}
          disabled={isDownloadingAll}
          className="px-4 py-3 sm:px-5 sm:py-2.5 bg-[var(--color-success)] text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isDownloadingAll
            ? 'Preparing...'
            : cleanedPhotos.length === 1
              ? 'Download Cleaned Photo'
              : `Download All (${cleanedPhotos.length}) as ZIP`}
        </button>
      )}
    </div>
  );
}
