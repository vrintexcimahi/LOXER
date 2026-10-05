/**
 * Utility helper for safely viewing, opening, and downloading images,
 * specifically handling Base64 data URLs without triggering Chrome's
 * "Not allowed to navigate top frame to data URL" or "about:blank#blocked" security blocks.
 */

/**
 * Converts a base64 data URL to a native Blob object.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(';base64,');
    const contentType = (parts[0].split(':')[1] || 'image/png').trim();
    const raw = window.atob(parts[1] || '');
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (error) {
    console.error('[imageViewerHelper] Failed to convert dataUrl to Blob:', error);
    // Fallback simple blob
    return new Blob([dataUrl], { type: 'text/plain' });
  }
}

/**
 * Checks whether a given string is a valid image source (data URL, blob, or image extension).
 */
export function isImageSource(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  return /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)($|\?)/i.test(trimmed);
}

/**
 * Opens an image safely in a new browser tab.
 * If the image is a base64 data URL, converts it to a Blob object URL first
 * to avoid Chrome's security restriction: "Not allowed to navigate top frame to data URL".
 */
export function openImageSafelyInNewTab(url: string, _title = 'Dokumen LOXER'): void {
  if (!url || typeof url !== 'string') return;
  const trimmed = url.trim();

  try {
    if (trimmed.startsWith('data:image/')) {
      const blob = dataUrlToBlob(trimmed);
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, '_blank');
      if (!newWin) {
        // Fallback if popup blocker intercepted
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      // Revoke blob URL after 1 minute to release memory
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    }

    // Standard HTTP/HTTPS or Blob URL
    const newWin = window.open(trimmed, '_blank', 'noopener,noreferrer');
    if (!newWin) {
      const link = document.createElement('a');
      link.href = trimmed;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.error('[imageViewerHelper] Failed to open image in new tab:', err);
  }
}

/**
 * Safely downloads an image with a specific filename.
 * Handles both base64 data URLs and remote URLs with CORS fallbacks.
 */
export async function downloadImageSafely(url: string, filename = 'dokumen.png'): Promise<boolean> {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Sanitize filename
  const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');

  try {
    if (trimmed.startsWith('data:image/')) {
      const blob = dataUrlToBlob(trimmed);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
      return true;
    }

    // Try fetching as blob to bypass cross-origin browser preview navigation
    try {
      const res = await fetch(trimmed, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = cleanFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
        return true;
      }
    } catch {
      // CORS fetch failed, fallback to direct download link
    }

    const link = document.createElement('a');
    link.href = trimmed;
    link.download = cleanFilename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('[imageViewerHelper] Failed to download image:', err);
    return false;
  }
}
