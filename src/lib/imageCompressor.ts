// ==============================================================================
// LOXER Image Compression & WebP Optimization Utility (Client-Side)
// ==============================================================================

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.8)
  mimeType?: 'image/webp' | 'image/jpeg';
}

export interface CompressedResult {
  dataUrl: string;
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // percentage saved (e.g. 85 for 85% reduction)
  width: number;
  height: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedResult> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    mimeType = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Berkas yang dipilih bukan gambar yang valid.'));
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memproses gambar.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional bounding box
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context tidak tersedia.'));
        }

        // Crisp rendering settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to WebP or fallback to JPEG
        let targetType = mimeType;
        let dataUrl = canvas.toDataURL(targetType, quality);

        // If browser doesn't support WebP export, fallback to JPEG
        if (!dataUrl.startsWith(`data:${targetType}`) && targetType === 'image/webp') {
          targetType = 'image/jpeg';
          dataUrl = canvas.toDataURL(targetType, quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Gagal mengompres gambar ke format WebP.'));
            }

            const compressedSize = blob.size;
            const savedBytes = Math.max(0, originalSize - compressedSize);
            const compressionRatio = Math.round((savedBytes / originalSize) * 100);

            resolve({
              dataUrl,
              blob,
              originalSize,
              compressedSize,
              compressionRatio,
              width,
              height,
            });
          },
          targetType,
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
