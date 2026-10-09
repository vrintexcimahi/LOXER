/**
 * LOXER Storage Service (Client-Side)
 * Provides abstracted file and image upload to S3/R2 with local disk fallback.
 */

export interface StorageUploadResult {
  url: string;
  publicUrl: string;
  driver: 'local' | 's3' | 'r2';
  size: number;
  filename: string;
  mimeType: string;
}

export interface StorageStats {
  driver: 'local' | 's3' | 'r2';
  fileCount: number;
  totalBytes: number;
  totalMegabytes: string;
}

/**
 * Check if a given string is a Base64 data URI
 */
export function isBase64DataUrl(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') || str.startsWith('data:application/pdf');
}

/**
 * Resolve an upload path or storage URL to an absolute or public URL
 */
export function getPublicStorageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith('/uploads/')) {
    return pathOrUrl;
  }
  return pathOrUrl;
}

/**
 * Upload a Base64 Data URI string to the storage endpoint
 */
export async function uploadBase64(
  dataUri: string,
  folder = 'uploads',
  filenamePrefix = 'file'
): Promise<StorageUploadResult> {
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('loxer_local_auth_token') ||
        window.localStorage.getItem('loxer_local_auth_token_admin')
      : null;

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      file: dataUri,
      folder,
      filenamePrefix,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Gagal mengunggah file (${res.status})`);
  }

  const data = await res.json();
  return data.data as StorageUploadResult;
}

/**
 * Upload a browser File object to storage
 */
export async function uploadFile(
  file: File,
  folder = 'uploads',
  filenamePrefix?: string
): Promise<StorageUploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas'));
    reader.onload = async () => {
      try {
        const dataUri = reader.result as string;
        const prefix = filenamePrefix || file.name.replace(/\.[^/.]+$/, '');
        const result = await uploadBase64(dataUri, folder, prefix);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch storage status and stats from server
 */
export async function getStorageStatus(): Promise<StorageStats | null> {
  try {
    const res = await fetch('/api/storage/status');
    if (!res.ok) return null;
    const json = await res.json();
    return json.stats as StorageStats;
  } catch {
    return null;
  }
}
