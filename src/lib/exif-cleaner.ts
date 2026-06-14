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
  const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([jpegBlob], name, { type: 'image/jpeg' });
}

function getOutputFormat(file: File): { mimeType: string; quality: number; extension: string } {
  const type = file.type.toLowerCase();
  if (type === 'image/png') {
    return { mimeType: 'image/png', quality: 1, extension: '.png' };
  }
  if (type === 'image/webp') {
    return { mimeType: 'image/webp', quality: 0.92, extension: '.webp' };
  }
  return { mimeType: 'image/jpeg', quality: 0.92, extension: '.jpg' };
}

async function removeExifViaCanvas(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
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
  if (/\.heic$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif') {
    processedFile = await convertHeicToJpeg(file);
  }

  await readExif(processedFile); // validate file is readable

  const cleanedFile = await removeExifViaCanvas(processedFile);

  const cleanedExif = await readExif(cleanedFile);

  return {
    cleanedFile,
    originalSize: processedFile.size,
    cleanedSize: cleanedFile.size,
    cleanedExif,
  };
}
