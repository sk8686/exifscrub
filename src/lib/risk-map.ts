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
  ExposureProgram: { level: 'medium', label: 'Exposure Program', category: 'Device' },
  MeteringMode: { level: 'medium', label: 'Metering Mode', category: 'Device' },
  LightSource: { level: 'medium', label: 'Light Source', category: 'Device' },
  ExposureMode: { level: 'medium', label: 'Exposure Mode', category: 'Device' },
  DigitalZoomRatio: { level: 'medium', label: 'Digital Zoom', category: 'Device' },
  FocalLengthIn35mmFilm: { level: 'medium', label: 'Focal Length (35mm)', category: 'Device' },
  FocalLengthIn35mmFormat: { level: 'medium', label: 'Focal Length (35mm)', category: 'Device' },
  SceneCaptureType: { level: 'medium', label: 'Scene Capture Type', category: 'Device' },
  SensingMethod: { level: 'medium', label: 'Sensing Method', category: 'Device' },
  DeviceSettingDescription: { level: 'medium', label: 'Device Settings', category: 'Device' },
  ExifVersion: { level: 'low', label: 'EXIF Version', category: 'Image' },
  CompressedBitsPerPixel: { level: 'low', label: 'Compressed Bits', category: 'Image' },
  ShutterSpeedValue: { level: 'low', label: 'Shutter Speed Value', category: 'Image' },
  ApertureValue: { level: 'low', label: 'Aperture Value', category: 'Image' },
  BrightnessValue: { level: 'low', label: 'Brightness Value', category: 'Image' },
  ExposureCompensation: { level: 'low', label: 'Exposure Compensation', category: 'Image' },
  MaxApertureValue: { level: 'low', label: 'Max Aperture', category: 'Image' },
  SubSecTime: { level: 'low', label: 'Sub-second Time', category: 'Time' },
  SubSecTimeOriginal: { level: 'low', label: 'Sub-second Original', category: 'Time' },
  SubSecTimeDigitized: { level: 'low', label: 'Sub-second Digitized', category: 'Time' },
  ComponentsConfiguration: { level: 'low', label: 'Components Config', category: 'Image' },
  YCbCrPositioning: { level: 'low', label: 'YCbCr Positioning', category: 'Image' },
  CustomRendered: { level: 'low', label: 'Custom Rendered', category: 'Image' },
  GainControl: { level: 'low', label: 'Gain Control', category: 'Image' },
  Contrast: { level: 'low', label: 'Contrast', category: 'Image' },
  Saturation: { level: 'low', label: 'Saturation', category: 'Image' },
  Sharpness: { level: 'low', label: 'Sharpness', category: 'Image' },
  SubjectDistanceRange: { level: 'low', label: 'Subject Distance Range', category: 'Image' },
  LensSpecification: { level: 'medium', label: 'Lens Specification', category: 'Device' },
  FileSource: { level: 'low', label: 'File Source', category: 'Image' },
  SceneType: { level: 'low', label: 'Scene Type', category: 'Image' },
  GPSAltitudeRef: { level: 'high', label: 'GPS Altitude Ref', category: 'Location' },
  GPSSpeedRef: { level: 'medium', label: 'GPS Speed Ref', category: 'Location' },
  GPSDestBearingRef: { level: 'medium', label: 'GPS Bearing Ref', category: 'Location' },
  GPSProcessingMethod: { level: 'high', label: 'GPS Processing Method', category: 'Location' },
  GPSAreaInformation: { level: 'high', label: 'GPS Area Info', category: 'Location' },

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

export function getRiskInfo(tagName: string): RiskInfo {
  if (RISK_MAP[tagName]) return RISK_MAP[tagName];
  return { level: 'medium', label: tagName, category: 'Other' };
}
