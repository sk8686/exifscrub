import type { ExifData } from '../lib/exif-reader';
import type { PhotoItem } from './PhotoGrid';
import RiskBadge from './RiskBadge';
import { PRESERVED_TAGS } from '../lib/risk-map';

interface MetaPanelProps {
  photo: PhotoItem;
}

export default function MetaPanel({ photo }: MetaPanelProps) {
  const { exifData, cleanedExif, isCleaned } = photo;

  if (!exifData) {
    return (
      <div className="bg-[var(--color-bg-alt)] rounded-xl p-6 text-center text-[var(--color-text-muted)]">
        <p>No EXIF data found in this image.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Privacy risk summary */}
      {!isCleaned && exifData.risks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-2">
            ⚠️ {exifData.risks.length} privacy risk{exifData.risks.length !== 1 ? 's' : ''} found
          </h3>
          <ul className="space-y-1">
            {exifData.risks.slice(0, 5).map((risk, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                <RiskBadge level={risk.level} compact />
                <span><strong>{risk.label}:</strong> {risk.value}</span>
              </li>
            ))}
            {exifData.risks.length > 5 && (
              <li className="text-sm text-red-600">+{exifData.risks.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Cleaned success message */}
      {isCleaned && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-green-800 mb-1">
            ✓ Metadata removed successfully
          </h3>
          <p className="text-sm text-green-700">
            {photo.cleanedSize !== null && (
              <>Size: {formatBytes(photo.originalSize)} → {formatBytes(photo.cleanedSize)}</>
            )}
          </p>
        </div>
      )}

      {/* Full metadata table */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden overflow-x-auto">
        <div className="px-4 py-3 bg-[var(--color-bg-alt)] border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold">Full Metadata</h3>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {exifData.tags.map((tag) => {
            const wasRemoved = isCleaned && !PRESERVED_TAGS.has(tag.name);
            const isPreserved = isCleaned && PRESERVED_TAGS.has(tag.name);

            return (
              <div
                key={tag.name}
                className={`px-3 sm:px-4 py-2.5 flex items-start gap-2 sm:gap-3 text-sm ${
                  wasRemoved ? 'bg-red-50/50' : ''
                }`}
              >
                <RiskBadge level={tag.riskLevel} compact />
                <div className="flex-1 min-w-0">
                  <span className={`font-medium break-words ${wasRemoved ? 'line-through text-red-400' : 'text-[var(--color-text)]'}`}>
                    {tag.label}
                  </span>
                  <span className={`ml-1 sm:ml-2 break-words ${wasRemoved ? 'line-through text-red-300' : 'text-[var(--color-text-muted)]'}`}>
                    {tag.value}
                  </span>
                </div>
                {isPreserved && (
                  <span className="text-xs text-[var(--color-success)] shrink-0">Preserved</span>
                )}
                {wasRemoved && (
                  <span className="text-xs text-[var(--color-danger)] shrink-0">Removed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Preserved items explanation */}
      {isCleaned && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">
            ✅ Preserved (keeps your photo displaying correctly)
          </h4>
          <ul className="text-sm text-blue-700 space-y-0.5">
            <li>• Orientation — ensures photo isn't rotated wrong</li>
            <li>• Color profile — keeps colors accurate</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
