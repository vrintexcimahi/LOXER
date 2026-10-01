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

export async function validateImageMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 3) return false;

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;

    // GIF: 47 49 46 38 ('GIF8')
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;

    // WebP: RIFF ... WEBP
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function validateDocumentMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4) return false;

    // PDF: %PDF- (25 50 44 46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return true;

    // DOCX / ZIP: PK.. (50 4B 03 04)
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) return true;

    return false;
  } catch {
    return false;
  }
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

  // Validate magic bytes first
  const isValidImage = await validateImageMagicBytes(file);
  if (!isValidImage && !file.type.startsWith('image/svg+xml')) {
    throw new Error('Berkas yang dipilih bukan berkas gambar yang sah (magic bytes tidak sesuai).');
  }

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
