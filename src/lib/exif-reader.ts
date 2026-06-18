import exifr from 'exifr';
import { getRiskInfo, type RiskLevel } from './risk-map';

export interface ExifTag {
  name: string;
  label: string;
  value: string;
  riskLevel: RiskLevel;
  category: string;
}

export interface PrivacyRisk {
  level: RiskLevel;
  key: string;
  label: string;
  value: string;
}

export interface ExifData {
  tags: ExifTag[];
  risks: PrivacyRisk[];
  hasGPS: boolean;
  riskCount: { high: number; medium: number; low: number };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString().replace('T', ' ').slice(0, 19);
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatGPSValue(value: unknown): string {
  if (Array.isArray(value) && value.length >= 3) {
    const [deg, min, sec] = value;
    return `${deg}°${min}'${sec}"`;
  }
  return formatValue(value);
}

export async function readExif(file: File): Promise<ExifData> {
  const tags: ExifTag[] = [];
  const risks: PrivacyRisk[] = [];
  let hasGPS = false;

  try {
    const data = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      ifd1: true,
      iptc: true,
      xmp: true,
      interop: true,
      makerNote: false,
      userComment: false,
    });

    if (!data || typeof data !== 'object') {
      return { tags: [], risks: [], hasGPS: false, riskCount: { high: 0, medium: 0, low: 0 } };
    }

    const riskCount = { high: 0, medium: 0, low: 0 };

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;

      const info = getRiskInfo(key);
      const isGPSTag = info.category === 'Location';
      const displayValue = isGPSTag ? formatGPSValue(value) : formatValue(value);

      if (isGPSTag) hasGPS = true;

      tags.push({
        name: key,
        label: info.label,
        value: displayValue,
        riskLevel: info.level,
        category: info.category,
      });

      riskCount[info.level]++;

      if (info.level === 'high' || info.level === 'medium') {
        risks.push({
          level: info.level,
          key,
          label: info.label,
          value: displayValue,
        });
      }
    }

    const levelOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
    tags.sort((a, b) => levelOrder[a.riskLevel] - levelOrder[b.riskLevel]);
    risks.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

    return { tags, risks, hasGPS, riskCount };
  } catch {
    return { tags: [], risks: [], hasGPS: false, riskCount: { high: 0, medium: 0, low: 0 } };
  }
}
