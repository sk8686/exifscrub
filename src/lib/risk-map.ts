export type RiskLevel = 'high' | 'medium' | 'low';

export interface RiskInfo {
  level: RiskLevel;
  label: string;
  category: string;
}

const RISK_MAP: Record<string, RiskInfo> = {
  // High risk — directly identifies location or identity
  GPSLatitude: { level: 'high', label: 'GPS Latitude', category: 'Location' },
  GPSLongitude: { level: 'high', label: 'GPS Longitude', category: 'Location' },
  GPSAltitude: { level: 'high', label: 'GPS Altitude', category: 'Location' },
  GPSLatitudeRef: { level: 'high', label: 'GPS Latitude Ref', category: 'Location' },
  GPSLongitudeRef: { level: 'high', label: 'GPS Longitude Ref', category: 'Location' },
  GPSTimeStamp: { level: 'high', label: 'GPS Timestamp', category: 'Location' },
  GPSDateStamp: { level: 'high', label: 'GPS Date', category: 'Location' },
  GPSSatellites: { level: 'high', label: 'GPS Satellites', category: 'Location' },
  SerialNumber: { level: 'high', label: 'Serial Number', category: 'Identity' },
  BodySerialNumber: { level: 'high', label: 'Body Serial Number', category: 'Identity' },
  LensSerialNumber: { level: 'high', label: 'Lens Serial Number', category: 'Identity' },
  ImageUniqueID: { level: 'high', label: 'Image Unique ID', category: 'Identity' },
  CameraSerialNumber: { level: 'high', label: 'Camera Serial Number', category: 'Identity' },
  OwnerName: { level: 'high', label: 'Owner Name', category: 'Identity' },
  Copyright: { level: 'high', label: 'Copyright', category: 'Identity' },
  Artist: { level: 'high', label: 'Artist', category: 'Identity' },

  // Medium risk — device info and timestamps
  Make: { level: 'medium', label: 'Camera Make', category: 'Device' },
  Model: { level: 'medium', label: 'Camera Model', category: 'Device' },
  LensModel: { level: 'medium', label: 'Lens Model', category: 'Device' },
  LensMake: { level: 'medium', label: 'Lens Make', category: 'Device' },
  Software: { level: 'medium', label: 'Software', category: 'Device' },
  DateTimeOriginal: { level: 'medium', label: 'Capture Date', category: 'Time' },
  DateTime: { level: 'medium', label: 'Modify Date', category: 'Time' },
  CreateDate: { level: 'medium', label: 'Create Date', category: 'Time' },
  ModifyDate: { level: 'medium', label: 'Modify Date', category: 'Time' },
  Flash: { level: 'medium', label: 'Flash', category: 'Device' },
  FocalLength: { level: 'medium', label: 'Focal Length', category: 'Device' },
  FNumber: { level: 'medium', label: 'Aperture', category: 'Device' },
  ExposureTime: { level: 'medium', label: 'Shutter Speed', category: 'Device' },
  ISO: { level: 'medium', label: 'ISO', category: 'Device' },
  ISOSpeedRatings: { level: 'medium', label: 'ISO', category: 'Device' },
  WhiteBalance: { level: 'medium', label: 'White Balance', category: 'Device' },
  ThumbnailOffset: { level: 'medium', label: 'Thumbnail', category: 'Thumbnail' },
  ThumbnailLength: { level: 'medium', label: 'Thumbnail Size', category: 'Thumbnail' },

  // Low risk — technical image properties (should be preserved)
  Orientation: { level: 'low', label: 'Orientation', category: 'Image' },
  ColorSpace: { level: 'low', label: 'Color Space', category: 'Image' },
  ExifImageWidth: { level: 'low', label: 'Image Width', category: 'Image' },
  ExifImageHeight: { level: 'low', label: 'Image Height', category: 'Image' },
  XResolution: { level: 'low', label: 'X Resolution', category: 'Image' },
  YResolution: { level: 'low', label: 'Y Resolution', category: 'Image' },
  ResolutionUnit: { level: 'low', label: 'Resolution Unit', category: 'Image' },
  BitsPerSample: { level: 'low', label: 'Bits Per Sample', category: 'Image' },
  Compression: { level: 'low', label: 'Compression', category: 'Image' },
  PhotometricInterpretation: { level: 'low', label: 'Photometric', category: 'Image' },
  SamplesPerPixel: { level: 'low', label: 'Samples Per Pixel', category: 'Image' },
  RowsPerStrip: { level: 'low', label: 'Rows Per Strip', category: 'Image' },
  StripByteCounts: { level: 'low', label: 'Strip Bytes', category: 'Image' },
};

export const PRESERVED_TAGS = new Set([
  'Orientation',
  'ColorSpace',
]);

export function getRiskInfo(tagName: string): RiskInfo {
  if (RISK_MAP[tagName]) return RISK_MAP[tagName];
  return { level: 'medium', label: tagName, category: 'Other' };
}

export function isHighRisk(tagName: string): boolean {
  return getRiskInfo(tagName).level === 'high';
}
