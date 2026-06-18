import type { ExifData } from '../lib/exif-reader';
import RiskBadge from './RiskBadge';
import PrivacyScore, { computePrivacyGrade } from './PrivacyScore';
import type { Translations } from '../i18n/translations';
import { formatBytes } from '../lib/format';

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
  error: string | null;
  sha256: string | null;
}

interface PhotoGridProps {
  photos: PhotoItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  t: Translations;
}

export default function PhotoGrid({ photos, selectedId, onSelect, onRemove, t }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          isSelected={photo.id === selectedId}
          onSelect={() => onSelect(photo.id)}
          onRemove={() => onRemove(photo.id)}
          t={t}
        />
      ))}
    </div>
  );
}

function PhotoCard({ photo, isSelected, onSelect, onRemove, t }: { photo: PhotoItem; isSelected: boolean; onSelect: () => void; onRemove: () => void; t: Translations }) {
  const riskSummary = photo.exifData
    ? `${photo.exifData.riskCount.high + photo.exifData.riskCount.medium} ${t.tool.privacyRisksFound}`
    : '';

  return (
    <div
      className={`
        relative rounded-lg overflow-hidden border-2 text-left transition-all w-full
        ${isSelected ? 'border-[var(--color-primary)] ring-2 ring-blue-200' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}
        ${photo.isProcessing ? 'opacity-60' : ''}
        ${photo.error ? 'border-[var(--color-danger)]' : ''}
      `}
    >
      <button
        onClick={onSelect}
        className="w-full text-left"
      >
        <div className="aspect-square bg-gray-100">
          <img
            src={photo.thumbnail}
            alt={photo.file.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>

        {photo.exifData && !photo.isCleaned && (
          <div className="absolute top-1.5 right-1.5">
            <PrivacyScore
              grade={computePrivacyGrade(photo.exifData.riskCount.high, photo.exifData.riskCount.medium)}
              t={t}
              compact
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
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{formatBytes(photo.originalSize)}</p>
          {riskSummary && !photo.isCleaned && (
            <p className="text-xs text-[var(--color-danger)] mt-0.5">⚠️ {riskSummary}</p>
          )}
          {photo.isCleaned && photo.cleanedSize !== null && (
            <p className="text-xs text-[var(--color-success)] mt-0.5">✓ {t.tool.metadataRemoved.replace('✓ ', '')} ({formatBytes(photo.cleanedSize)})</p>
          )}
          {photo.error && (
            <p className="text-xs text-[var(--color-danger)] mt-0.5 truncate">{photo.error}</p>
          )}
        </div>
      </button>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-0 left-0 w-[44px] h-[44px] rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label={`${t.tool.deleteNow} ${photo.file.name}`}
      >
        ✕
      </button>
    </div>
  );
}
