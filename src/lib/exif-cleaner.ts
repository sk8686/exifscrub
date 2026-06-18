import { readExif, type ExifData } from './exif-reader';

export interface CleanResult {
  cleanedFile: File;
  originalSize: number;
  cleanedSize: number;
  cleanedExif: ExifData;
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
  if (!jpegBlob) throw new Error('HEIC conversion returned empty result');
  const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([jpegBlob], name, { type: 'image/jpeg' });
}

function getOutputFormat(file: File): { mimeType: string; quality: number; extension: string } {
  const type = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (type === 'image/png') {
    return { mimeType: 'image/png', quality: 1, extension: '.png' };
  }
  if (type === 'image/webp') {
    return { mimeType: 'image/webp', quality: 0.92, extension: '.webp' };
  }
  // GIF, AVIF, TIFF all convert to JPEG for clean output
  if (type === 'image/gif' || ext === 'gif') {
    return { mimeType: 'image/jpeg', quality: 0.92, extension: '.jpg' };
  }
  if (type === 'image/avif' || ext === 'avif') {
    return { mimeType: 'image/jpeg', quality: 0.92, extension: '.jpg' };
  }
  if (type === 'image/tiff' || ext === 'tiff' || ext === 'tif') {
    return { mimeType: 'image/jpeg', quality: 0.92, extension: '.jpg' };
  }
  return { mimeType: 'image/jpeg', quality: 0.92, extension: '.jpg' };
}

/** Apply EXIF Orientation transform to canvas context */
function applyOrientation(ctx: CanvasRenderingContext2D, orientation: number, width: number, height: number): void {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, height, width); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
    default: break; // orientation 1 or invalid: no transform
  }
}

async function removeExifViaCanvas(file: File, orientation: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_DIM = 4096;
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Determine canvas dimensions after orientation swap
      const swap = orientation >= 5 && orientation <= 8;
      canvas.width = swap ? height : width;
      canvas.height = swap ? width : height;

      // Apply EXIF orientation transform (must be after setting canvas dimensions)
      applyOrientation(ctx, orientation, width, height);

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const { mimeType, quality, extension } = getOutputFormat(file);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from canvas'));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const cleanedFile = new File([blob], `${baseName}-clean${extension}`, { type: mimeType });
          resolve(cleanedFile);
        },
        mimeType,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export async function cleanFile(file: File): Promise<CleanResult> {
  let processedFile = file;
  if (/\.heic$/i.test(file.name) || /\.heif$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif') {
    processedFile = await convertHeicToJpeg(file);
  }

  const exifData = await readExif(processedFile);

  // Extract orientation value before cleaning
  const orientationTag = exifData.tags.find((t) => t.name === 'Orientation');
  const orientation = orientationTag ? parseInt(orientationTag.value, 10) || 1 : 1;

  const cleanedFile = await removeExifViaCanvas(processedFile, orientation);

  const cleanedExif = await readExif(cleanedFile);

  return {
    cleanedFile,
    originalSize: processedFile.size,
    cleanedSize: cleanedFile.size,
    cleanedExif,
  };
}
