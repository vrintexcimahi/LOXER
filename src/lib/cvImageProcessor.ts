/**
 * LOXER Smart CV Image Processor
 * Utility to automatically crop candidate portrait (pas foto) and
 * blur/censor contact information on the full CV document for privacy protection.
 */

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

/**
 * Crop candidate's portrait (pas foto) from the uploaded CV document
 * @param sourceImage Base64 Data URL or Image URL
 * @param photoBox Normalized bounding box [ymin, xmin, ymax, xmax] in 0-1000 scale
 */
export async function cropPasFotoFromImage(
  sourceImage: string,
  photoBox?: [number, number, number, number] | null
): Promise<string> {
  if (!sourceImage || !photoBox || !Array.isArray(photoBox) || photoBox.length !== 4) {
    return '';
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const [ymin, xmin, ymax, xmax] = photoBox;
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        if (naturalW <= 0 || naturalH <= 0) return resolve('');

        // Convert 0-1000 normalized coordinates to image pixels
        const rawY1 = (ymin / 1000) * naturalH;
        const rawX1 = (xmin / 1000) * naturalW;
        const rawY2 = (ymax / 1000) * naturalH;
        const rawX2 = (xmax / 1000) * naturalW;

        const boxW = Math.max(15, rawX2 - rawX1);
        const boxH = Math.max(15, rawY2 - rawY1);

        // Add 12% padding around the head/chin
        const padX = boxW * 0.12;
        const padY = boxH * 0.12;

        let cropX = Math.max(0, rawX1 - padX);
        let cropY = Math.max(0, rawY1 - padY);
        let cropW = Math.min(naturalW - cropX, boxW + padX * 2);
        let cropH = Math.min(naturalH - cropY, boxH + padY * 2);

        // Center into 1:1 square crop
        const maxDim = Math.max(cropW, cropH);
        const diffX = maxDim - cropW;
        const diffY = maxDim - cropH;

        cropX = Math.max(0, cropX - diffX / 2);
        cropY = Math.max(0, cropY - diffY / 2);
        cropW = Math.min(naturalW - cropX, maxDim);
        cropH = Math.min(naturalH - cropY, maxDim);

        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 480, 480);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch (err) {
        console.warn('[cropPasFotoFromImage] Failed to crop:', err);
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = sourceImage;
  });
}

/**
 * Generate blurred/censored full CV image for privacy
 * Contact details (phone, email, WA, address) are blurred with security banner
 * @param sourceImage Base64 Data URL or Image URL
 * @param contactBoxes Array of normalized bounding boxes [[ymin, xmin, ymax, xmax], ...] in 0-1000 scale
 */
export async function generateBlurredCvImage(
  sourceImage: string,
  contactBoxes?: [number, number, number, number][] | null
): Promise<string> {
  if (!sourceImage) return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        if (naturalW <= 0 || naturalH <= 0) return resolve(sourceImage);

        // Scale down high-res scans for efficient client & mobile performance
        const maxW = 1000;
        const scale = naturalW > maxW ? maxW / naturalW : 1;
        const targetW = Math.round(naturalW * scale);
        const targetH = Math.round(naturalH * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(sourceImage);

        // Draw original full document
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const boxes = Array.isArray(contactBoxes) && contactBoxes.length > 0 ? contactBoxes : [];

        for (const box of boxes) {
          if (!Array.isArray(box) || box.length !== 4) continue;
          const [ymin, xmin, ymax, xmax] = box;

          const rawY1 = (ymin / 1000) * targetH;
          const rawX1 = (xmin / 1000) * targetW;
          const rawY2 = (ymax / 1000) * targetH;
          const rawX2 = (xmax / 1000) * targetW;

          const pad = 8;
          const bx = Math.max(0, Math.floor(rawX1 - pad));
          const by = Math.max(0, Math.floor(rawY1 - pad));
          const bw = Math.min(targetW - bx, Math.ceil(rawX2 - rawX1 + pad * 2));
          const bh = Math.min(targetH - by, Math.ceil(rawY2 - rawY1 + pad * 2));

          if (bw <= 5 || bh <= 5) continue;

          // Step 1: Irreversible Pixelation Blur
          const subW = Math.max(4, Math.floor(bw / 12));
          const subH = Math.max(4, Math.floor(bh / 12));
          const subCanvas = document.createElement('canvas');
          subCanvas.width = subW;
          subCanvas.height = subH;
          const subCtx = subCanvas.getContext('2d');
          if (subCtx) {
            subCtx.drawImage(canvas, bx, by, bw, bh, 0, 0, subW, subH);
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(subCanvas, 0, 0, subW, subH, bx, by, bw, bh);
            ctx.restore();
          }

          // Step 2: Frosted privacy overlay block
          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
          ctx.fillRect(bx, by, bw, bh);

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx, by, bw, bh);

          // Step 3: Security text banner
          ctx.fillStyle = '#38bdf8';
          const fontSize = Math.max(10, Math.min(13, Math.floor(bh / 4)));
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const centerY = by + bh / 2;
          if (bh >= 36) {
            ctx.fillText('🔒 KONTAK TERPROTEKSI LOXER', bx + bw / 2, centerY - 8);
            ctx.fillStyle = '#94a3b8';
            ctx.font = `600 ${Math.max(9, fontSize - 2)}px system-ui, -apple-system, sans-serif`;
            ctx.fillText('Perekrutan Wajib di Aplikasi', bx + bw / 2, centerY + 8);
          } else {
            ctx.fillText('🔒 KONTAK TERPROTEKSI', bx + bw / 2, centerY);
          }

          ctx.restore();
        }

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        console.warn('[generateBlurredCvImage] Failed to blur contact:', err);
        resolve(sourceImage);
      }
    };
    img.onerror = () => resolve(sourceImage);
    img.src = sourceImage;
  });
}
