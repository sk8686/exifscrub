import type { ExifData } from '../lib/exif-reader';
import RiskBadge from './RiskBadge';

export interface PhotoItem {
  id: string;
  file: File;
  thumbnail: string;
  exifData: ExifData | null;
  cleanedFile: File | null;
  cleanedExif: ExifData | null;
  originalSize: number;
  cleanedSize: number | null;
  isProcessing: boolean;
  isCleaned: boolean;
}

interface PhotoGridProps {
  photos: PhotoItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PhotoGrid({ photos, selectedId, onSelect }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          isSelected={photo.id === selectedId}
          onSelect={() => onSelect(photo.id)}
        />
      ))}
    </div>
  );
}

function PhotoCard({ photo, isSelected, onSelect }: { photo: PhotoItem; isSelected: boolean; onSelect: () => void }) {
  const riskSummary = photo.exifData
    ? `${photo.exifData.riskCount.high + photo.exifData.riskCount.medium} risks`
    : '';

  return (
    <button
      onClick={onSelect}
      className={`
        relative rounded-lg overflow-hidden border-2 text-left transition-all
        ${isSelected ? 'border-[var(--color-primary)] ring-2 ring-blue-200' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}
        ${photo.isProcessing ? 'opacity-60' : ''}
      `}
    >
      <div className="aspect-square bg-gray-100">
        <img
          src={photo.thumbnail}
          alt={photo.file.name}
          className="w-full h-full object-cover"
        />
      </div>

      {photo.exifData && !photo.isCleaned && (
        <div className="absolute top-1.5 right-1.5">
          <RiskBadge
            level={photo.exifData.riskCount.high > 0 ? 'high' : 'medium'}
            compact
            count={photo.exifData.riskCount.high + photo.exifData.riskCount.medium}
          />
        </div>
      )}

      {photo.isCleaned && (
        <div className="absolute top-1.5 right-1.5 bg-[var(--color-success)] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          ✓
        </div>
      )}

      {photo.isProcessing && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="p-2">
        <p className="text-xs text-[var(--color-text)] truncate">{photo.file.name}</p>
        {riskSummary && !photo.isCleaned && (
          <p className="text-xs text-[var(--color-danger)] mt-0.5">⚠️ {riskSummary}</p>
        )}
        {photo.isCleaned && (
          <p className="text-xs text-[var(--color-success)] mt-0.5">✓ Cleaned</p>
        )}
      </div>
    </button>
  );
}
