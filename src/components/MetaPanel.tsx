import type { ExifData } from '../lib/exif-reader';
import type { PhotoItem } from './PhotoGrid';
import type { Translations } from '../i18n/translations';
import RiskBadge from './RiskBadge';
import PrivacyScore, { computePrivacyGrade } from './PrivacyScore';
import { formatBytes } from '../lib/format';
import { useState, useEffect, useRef } from 'react';
import pkg from 'file-saver';
const { saveAs } = pkg;

function getLabel(key: string, fallback: string, t: Translations): string {
  return (t.tagLabels as Record<string, string>)[key] || fallback;
}

function getValue(value: string, t: Translations): string {
  if (!value) return value;
  const trimmed = value.trim();
  return (t.exifValues as Record<string, string>)[trimmed] || value;
}

interface MetaPanelProps {
  photo: PhotoItem;
  onDownloadActivity?: () => void;
  t: Translations;
}

export default function MetaPanel({ photo, onDownloadActivity, t }: MetaPanelProps) {
  const { exifData, isCleaned, cleanedExif } = photo;
  const [viewMode, setViewMode] = useState<'table' | 'compare'>('table');

  // Reset view when switching photos
  useEffect(() => {
    setViewMode('table');
  }, [photo.id]);

  if (!exifData) {
    return (
      <div className="bg-[var(--color-bg-alt)] rounded-xl p-6 text-center text-[var(--color-text-muted)]">
        <p>{t.tool.noExif}</p>
      </div>
    );
  }

  // When cleaned, use cleanedExif for the "current" display; otherwise use original exifData
  const displayExif = isCleaned && cleanedExif ? cleanedExif : exifData;

  // For Before/After: Before = all original tags, After = cleaned tags (actually remaining)
  const removedTagNames = isCleaned && cleanedExif
    ? new Set(exifData.tags.map((t) => t.name).filter((name) => !cleanedExif.tags.some((ct) => ct.name === name)))
    : new Set<string>();
  const beforeTags = exifData.tags;
  const afterTags = isCleaned && cleanedExif ? cleanedExif.tags : [];

  return (
    <div className="space-y-4">
      {/* GPS Map */}
      {!isCleaned && exifData.hasGPS && <GPSMap exifData={exifData} t={t} />}

      {/* Privacy risk summary with score */}
      {!isCleaned && exifData.risks.length > 0 && (
        <div className="space-y-3">
          <PrivacyScore
            grade={computePrivacyGrade(exifData.riskCount.high, exifData.riskCount.medium)}
            t={t}
          />
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-2">
              {exifData.risks.length} {t.tool.privacyRisksFound}
            </h3>
            <ul className="space-y-1">
              {exifData.risks.slice(0, 5).map((risk, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <RiskBadge level={risk.level} compact t={t} />
                  <span><strong>{getLabel(risk.key, risk.label, t)}:</strong> {risk.value}</span>
                </li>
              ))}
              {exifData.risks.length > 5 && (
                <li className="text-sm text-red-600">+{exifData.risks.length - 5}</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Cleaned success message with SHA-256 */}
      {isCleaned && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-green-800 mb-1">
                {t.tool.metadataRemoved}
              </h3>
              <p className="text-sm text-green-700">
                {photo.cleanedSize !== null && (
                  <>{t.tool.size}: {formatBytes(photo.originalSize)} → {formatBytes(photo.cleanedSize)}</>
                )}
              </p>
            </div>
            {photo.cleanedFile && (
              <button
                onClick={() => { onDownloadActivity?.(); saveAs(photo.cleanedFile!, photo.cleanedFile!.name); }}
                className="shrink-0 px-4 py-2.5 bg-[var(--color-success)] text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors min-h-[44px]"
              >
                {t.tool.download}
              </button>
            )}
          </div>
          {photo.sha256 && (
            <div className="mt-2 pt-2 border-t border-green-200">
              <p className="text-xs text-green-600 font-mono break-all">
                {t.tool.sha256}: {photo.sha256}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {photo.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-1">{t.tool.error}</h3>
          <p className="text-sm text-red-700">{photo.error}</p>
        </div>
      )}

      {/* View mode toggle (only when cleaned) */}
      {isCleaned && (
        <div className="flex items-center gap-1 bg-[var(--color-bg-alt)] rounded-lg p-1 w-fit">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors min-h-[44px] ${
              viewMode === 'table'
                ? 'bg-white text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.tool.detail}
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors min-h-[44px] ${
              viewMode === 'compare'
                ? 'bg-white text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.tool.beforeAfter}
          </button>
        </div>
      )}

      {/* Metadata content */}
      {isCleaned && viewMode === 'compare' ? (
        <CompareView beforeTags={beforeTags} afterTags={afterTags} removedCount={removedTagNames.size} t={t} />
      ) : (
        <FullMetadataTable tags={displayExif.tags} isCleaned={isCleaned} t={t} />
      )}

      {/* Preserved explanation */}
      {isCleaned && cleanedExif && cleanedExif.tags.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">
            {t.tool.preserved}
          </h4>
          <ul className="text-sm text-blue-700 space-y-0.5">
            {cleanedExif.tags.map((tag) => (
              <li key={tag.name}>• {getLabel(tag.name, tag.label, t)} — {getValue(tag.value, t) || '—'}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── GPS Map Component ─── */
// Fallback tile sources — tried in order
const TILE_SOURCES = [
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
];

function GPSMap({ exifData, t }: { exifData: ExifData; t: Translations }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const failTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileFailed, setTileFailed] = useState(false);
  const cancelledRef = useRef(false);
  const sourceIndexRef = useRef(0);

  useEffect(() => {
    cancelledRef.current = false;
    setTileFailed(false);
    sourceIndexRef.current = 0;
    if (!mapRef.current) return;

    // Extract GPS coordinates from EXIF data
    const latTag = exifData.tags.find((t) => t.name === 'GPSLatitude');
    const latRefTag = exifData.tags.find((t) => t.name === 'GPSLatitudeRef');
    const lngTag = exifData.tags.find((t) => t.name === 'GPSLongitude');
    const lngRefTag = exifData.tags.find((t) => t.name === 'GPSLongitudeRef');

    if (!latTag || !lngTag) return;

    const lat = parseDMS(latTag.value, latRefTag?.value === 'S');
    const lng = parseDMS(lngTag.value, lngRefTag?.value === 'W');

    if (isNaN(lat) || isNaN(lng)) return;

    // Dynamically import Leaflet + inject CSS
    const leafletCssId = 'leaflet-css';
    if (!document.getElementById(leafletCssId)) {
      const link = document.createElement('link');
      link.id = leafletCssId;
      link.rel = 'stylesheet';
      link.href = '/leaflet.css';
      document.head.appendChild(link);
    }
    import('leaflet').then((L) => {
      if (cancelledRef.current) return;

      // Clean up previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([lat, lng], 14);

      // Try first tile source
      const tileLayer = L.tileLayer(TILE_SOURCES[0], {
        maxZoom: 19,
      }).addTo(map);

      // Listen for tile errors and try fallback sources
      let errorCount = 0;
      const ERROR_THRESHOLD = 3; // consecutive errors before switching
      tileLayer.on('tileerror', () => {
        errorCount++;
        if (errorCount >= ERROR_THRESHOLD && sourceIndexRef.current < TILE_SOURCES.length - 1) {
          errorCount = 0;
          sourceIndexRef.current++;
          tileLayer.setUrl(TILE_SOURCES[sourceIndexRef.current]);
        }
      });

      // Detect persistent failure after a delay
      failTimerRef.current = setTimeout(() => {
        if (cancelledRef.current) return;
        // Check if any tiles actually loaded by testing a known tile URL
        const img = new Image();
        img.onload = () => { /* tile reachable */ };
        img.onerror = () => { setTileFailed(true); };
        img.src = TILE_SOURCES[sourceIndexRef.current]
          .replace('{s}', 'a').replace('{z}', '14')
          .replace('{x}', String(Math.floor((lng + 180) / 360 * Math.pow(2, 14))))
          .replace('{y}', String(Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI / 2) * Math.pow(2, 14))));
      }, 5000);

      tileLayerRef.current = tileLayer;

      const icon = L.divIcon({
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#EF4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        className: '',
      });

      L.marker([lat, lng], { icon }).addTo(map)
        .bindPopup(`<strong>${t.tool.photoLocation}</strong><br/>${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        .openPopup();

      mapInstanceRef.current = map;

      setTimeout(() => map.invalidateSize(), 100);
    }).catch(() => {
      setMapError(t.tool.mapLoadError);
    });

    return () => {
      cancelledRef.current = true;
      if (failTimerRef.current) {
        clearTimeout(failTimerRef.current);
        failTimerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [exifData]);

  // Extract coordinates for display
  const latVal = exifData.tags.find(t => t.name === 'GPSLatitude')?.value || '';
  const lngVal = exifData.tags.find(t => t.name === 'GPSLongitude')?.value || '';
  const latNum = parseDMS(latVal, exifData.tags.find(t => t.name === 'GPSLatitudeRef')?.value === 'S');
  const lngNum = parseDMS(lngVal, exifData.tags.find(t => t.name === 'GPSLongitudeRef')?.value === 'W');

  if (mapError) {
    return (
      <div className="rounded-xl overflow-hidden border border-red-200">
        <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span className="text-xs font-semibold text-red-700">{t.tool.gpsLocation}</span>
        </div>
        <div className="p-4 bg-red-50 text-center">
          <p className="text-sm text-red-700">{mapError}</p>
          <p className="text-xs text-red-500 mt-1 font-mono">{latVal}, {lngVal}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-red-200">
      <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span className="text-xs font-semibold text-red-700">{t.tool.gpsLocation}</span>
        </div>
        <span className="text-[10px] text-red-500">{t.tool.mapTiles}</span>
      </div>
      <div className="relative">
        <div ref={mapRef} style={{ height: '220px', width: '100%' }} />
        {/* Fallback overlay when tiles fail */}
        {tileFailed && (
          <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center z-[999] rounded-b-xl">
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <p className="text-xs text-gray-500 mb-1">{t.tool.mapTileFallback}</p>
            <p className="text-sm font-mono text-gray-600 font-medium">
              {!isNaN(latNum) ? latNum.toFixed(6) : latVal}, {!isNaN(lngNum) ? lngNum.toFixed(6) : lngVal}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function parseDMS(dmsStr: string, isNeg: boolean): number {
  // Try parsing "DD°MM'SS"" format
  const dmsMatch = dmsStr.match(/([\d.]+)°([\d.]+)'([\d.]+)"/);
  if (dmsMatch) {
    const deg = parseFloat(dmsMatch[1]);
    const min = parseFloat(dmsMatch[2]);
    const sec = parseFloat(dmsMatch[3]);
    const decimal = deg + min / 60 + sec / 3600;
    return isNeg ? -decimal : decimal;
  }
  // Try plain number
  const num = parseFloat(dmsStr);
  return isNeg ? -num : num;
}

/* ─── Compare View ─── */
function CompareView({ beforeTags, afterTags, removedCount, t }: { beforeTags: ExifData['tags']; afterTags: ExifData['tags']; removedCount: number; t: Translations }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-xl overflow-hidden border border-red-200 bg-red-50/30">
        <div className="px-3 py-2 bg-red-100 border-b border-red-200 flex items-center gap-2">
          <span className="text-xs font-semibold text-red-700">{t.tool.before}</span>
          <span className="ml-auto text-xs font-bold text-red-600">{beforeTags.length} {t.tool.items}</span>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-red-100">
          {beforeTags.map((tag) => (
            <div key={tag.name} className="px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <RiskBadge level={tag.riskLevel} compact t={t} />
                <p className="text-xs font-medium text-[var(--color-text)]">{getLabel(tag.name, tag.label, t)}</p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] truncate ml-5">{getValue(tag.value, t) || '—'}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border border-green-200 bg-green-50/30">
        <div className="px-3 py-2 bg-green-100 border-b border-green-200 flex items-center gap-2">
          <span className="text-xs font-semibold text-green-700">{t.tool.after}</span>
          <span className="ml-auto text-xs font-bold text-green-600">{removedCount} {t.tool.removedKept} {afterTags.length} {t.tool.preservedLabel}</span>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-green-100">
          {afterTags.length > 0 ? afterTags.map((tag) => (
            <div key={tag.name} className="px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <RiskBadge level={tag.riskLevel} compact t={t} />
                <p className="text-xs font-medium text-[var(--color-text)]">{getLabel(tag.name, tag.label, t)}</p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] truncate ml-5">{getValue(tag.value, t) || '—'}</p>
            </div>
          )) : (
            <div className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">{t.tool.allMetadataRemoved}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Full Metadata Table ─── */
function FullMetadataTable({ tags, isCleaned, t }: { tags: ExifData['tags']; isCleaned: boolean; t: Translations }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden overflow-x-auto">
      <div className="px-4 py-3 bg-[var(--color-bg-alt)] border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="text-sm font-semibold">{isCleaned ? t.tool.remainingMetadata : t.tool.fullMetadata}</h3>
        <span className="text-xs text-[var(--color-text-muted)]">{tags.length} {t.tool.items}</span>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {tags.map((tag) => (
          <div
            key={tag.name}
            className="px-3 sm:px-4 py-2.5 flex items-start gap-2 sm:gap-3 text-sm"
          >
            <RiskBadge level={tag.riskLevel} compact t={t} />
            <div className="flex-1 min-w-0">
              <span className="font-medium break-words text-[var(--color-text)]">
                {getLabel(tag.name, tag.label, t)}
              </span>
              <span className="ml-1 sm:ml-2 break-words text-[var(--color-text-muted)]">
                {getValue(tag.value, t)}
              </span>
            </div>
            {isCleaned && (
              <span className="text-xs text-[var(--color-success)] shrink-0">{t.tool.preservedLabel}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
