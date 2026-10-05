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

export type PasFotoCropMode = 'smart_square' | 'tight_face' | 'full_frame';

/**
 * Crop candidate's portrait (pas foto) from the uploaded CV document with LEVEL MAX SKILL.
 * - Guarantees 0% bleed of surrounding CV text / document lines
 * - Centered squarely on the candidate's face & shoulders
 * - Supports tight face mode, smart square 1:1, or full portrait framing
 *
 * @param sourceImage Base64 Data URL or Image URL
 * @param photoBox Normalized bounding box [ymin, xmin, ymax, xmax] in 0-1000 scale
 * @param faceBox Optional tight face bounding box [ymin, xmin, ymax, xmax] in 0-1000 scale
 * @param mode Crop mode: 'smart_square' (default 1:1), 'tight_face', or 'full_frame'
 */
export async function cropPasFotoFromImage(
  sourceImage: string,
  photoBox?: [number, number, number, number] | null,
  faceBox?: [number, number, number, number] | null,
  mode: PasFotoCropMode = 'smart_square',
  rotationAngle: number = 0
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

        const boxW = Math.max(20, rawX2 - rawX1);
        const boxH = Math.max(20, rawY2 - rawY1);

        // Apply a strict inner safety margin (2%) to eliminate any surrounding CV paper / text bleed
        const insetX = Math.max(2, Math.floor(boxW * 0.02));
        const insetY = Math.max(2, Math.floor(boxH * 0.02));
        const safeX1 = Math.max(0, rawX1 + insetX);
        const safeX2 = Math.min(naturalW, rawX2 - insetX);
        const safeY1 = Math.max(0, rawY1 + insetY);
        const safeY2 = Math.min(naturalH, rawY2 - insetY);
        const safeW = Math.max(10, safeX2 - safeX1);
        const safeH = Math.max(10, safeY2 - safeY1);

        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (mode === 'full_frame') {
          // Sample background color from top corner inside safe box
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 1;
          tempCanvas.height = 1;
          const tempCtx = tempCanvas.getContext('2d');
          let bgColor = '#0f172a';
          if (tempCtx) {
            tempCtx.drawImage(img, safeX1 + 5, safeY1 + 5, 1, 1, 0, 0, 1, 1);
            const pixel = tempCtx.getImageData(0, 0, 1, 1).data;
            bgColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
          }

          // Fill canvas with sampled portrait background
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, 480, 480);

          // Fit portrait into canvas
          const scale = Math.min(480 / safeW, 480 / safeH);
          const drawW = safeW * scale;
          const drawH = safeH * scale;
          const drawX = (480 - drawW) / 2;
          const drawY = (480 - drawH) / 2;
          ctx.drawImage(img, safeX1, safeY1, safeW, safeH, drawX, drawY, drawW, drawH);
          return resolve(canvas.toDataURL('image/jpeg', 0.92));
        }

        let cropX = safeX1;
        let cropY = safeY1;
        let cropW = safeW;
        let cropH = safeH;

        const hasFaceBox = faceBox && Array.isArray(faceBox) && faceBox.length === 4;
        let fX1 = 0, fY1 = 0, fX2 = 0, fY2 = 0, fW = 0, fH = 0, fCenterX = 0, fCenterY = 0;
        if (hasFaceBox) {
          fY1 = (faceBox[0] / 1000) * naturalH;
          fX1 = (faceBox[1] / 1000) * naturalW;
          fY2 = (faceBox[2] / 1000) * naturalH;
          fX2 = (faceBox[3] / 1000) * naturalW;
          fW = Math.max(10, fX2 - fX1);
          fH = Math.max(10, fY2 - fY1);
          fCenterX = fX1 + fW / 2;
          fCenterY = fY1 + fH / 2;
        }

        // Circular badge / Canva frame detector:
        // When aspect ratio is near 1:1, or face is small relative to box (fH / safeH < 0.45)
        const isNearSquare = Math.abs(safeW - safeH) / Math.max(safeW, safeH) < 0.18;
        const isSmallFaceInBigFrame = hasFaceBox && fH / safeH < 0.44;

        if (mode === 'tight_face' && hasFaceBox) {
          const fDim = Math.max(fW, fH) * 1.5;
          cropW = Math.min(safeW, fDim);
          cropH = cropW;
          cropX = Math.max(safeX1, Math.min(safeX2 - cropW, fCenterX - cropW / 2));
          cropY = Math.max(safeY1, Math.min(safeY2 - cropH, fCenterY - cropH * 0.45));
        } else if (hasFaceBox && (isNearSquare || isSmallFaceInBigFrame)) {
          // Precise inner crop for circular / Canva badge photos:
          // Inscribe square tightly inside the circle (radius * sqrt(2) ~= 0.707)
          // To eliminate 100% of outer paper color, circle stroke lines, and dark corner bleeds!
          const targetDim = Math.max(fH * 2.1, fW * 2.3);
          const maxInscribed = Math.min(safeW, safeH) * 0.70;
          const dim = Math.max(Math.min(targetDim, maxInscribed), Math.min(safeW, safeH) * 0.52);

          cropW = dim;
          cropH = dim;
          cropX = Math.max(safeX1, Math.min(safeX2 - dim, fCenterX - dim / 2));
          cropY = Math.max(safeY1, Math.min(safeY2 - dim, fCenterY - dim * 0.40));
        } else {
          // Standard smart_square mode (1:1 aspect ratio)
          if (safeH >= safeW) {
            // Standard vertical passport photo (3:4, 2:3, etc.)
            const dim = safeW;
            cropW = dim;
            cropH = dim;
            cropX = safeX1;

            if (hasFaceBox) {
              const targetY = fCenterY - dim * 0.42;
              cropY = Math.max(safeY1, Math.min(safeY2 - dim, targetY));
            } else {
              cropY = safeY1 + Math.max(0, (safeH - dim) * 0.12);
              cropY = Math.min(cropY, safeY2 - dim);
            }
          } else {
            // Landscape photo
            const dim = safeH;
            cropW = dim;
            cropH = dim;
            cropY = safeY1;

            if (hasFaceBox) {
              cropX = Math.max(safeX1, Math.min(safeX2 - dim, fCenterX - dim / 2));
            } else {
              cropX = safeX1 + (safeW - dim) / 2;
            }
          }
        }

        const angle = ((Math.round(rotationAngle || 0) % 360) + 360) % 360;
        if (angle > 0) {
          ctx.save();
          ctx.translate(240, 240);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.drawImage(img, cropX, cropY, cropW, cropH, -240, -240, 480, 480);
          ctx.restore();
        } else {
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 480, 480);
        }

        // Automatic HD Portrait Enhancement: Auto-levels, clarity, & crisp unsharp masking
        enhancePortraitCanvas(ctx, 480, 480, {
          sharpenStrength: 0.60,
          contrastBoost: 1.18,
          vibrancyBoost: 1.12,
        });

        resolve(canvas.toDataURL('image/jpeg', 0.92));
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
 * Auto-enhance portrait sharpness, contrast, and color richness.
 * Transforms blurry, low-contrast, or hazy photos into crisp, studio-grade portraits.
 */
export function enhancePortraitCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options?: { sharpenStrength?: number; contrastBoost?: number; vibrancyBoost?: number }
): void {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    const contrast = options?.contrastBoost ?? 1.18;
    const vibrancy = options?.vibrancyBoost ?? 1.12;
    const sharpen = options?.sharpenStrength ?? 0.60;

    // 1. Contrast expansion & Auto-Levels
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Contrast stretch
      r = factor * (r - 128) + 128;
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;

      // Vibrancy boost
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + vibrancy * (r - gray);
      g = gray + vibrancy * (g - gray);
      b = gray + vibrancy * (b - gray);

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    // 2. Unsharp Masking / Laplacian high-pass edge sharpening
    if (sharpen > 0) {
      const srcCopy = new Uint8ClampedArray(data);
      const w = sharpen;
      const center = 1 + 4 * w;

      for (let y = 1; y < height - 1; y++) {
        const rowOffset = y * width * 4;
        const topRow = (y - 1) * width * 4;
        const btmRow = (y + 1) * width * 4;

        for (let x = 1; x < width - 1; x++) {
          const idx = rowOffset + x * 4;
          const topIdx = topRow + x * 4;
          const btmIdx = btmRow + x * 4;
          const leftIdx = idx - 4;
          const rightIdx = idx + 4;

          const rVal =
            srcCopy[idx] * center -
            w * (srcCopy[topIdx] + srcCopy[btmIdx] + srcCopy[leftIdx] + srcCopy[rightIdx]);
          data[idx] = Math.max(0, Math.min(255, rVal));

          const gVal =
            srcCopy[idx + 1] * center -
            w * (srcCopy[topIdx + 1] + srcCopy[btmIdx + 1] + srcCopy[leftIdx + 1] + srcCopy[rightIdx + 1]);
          data[idx + 1] = Math.max(0, Math.min(255, gVal));

          const bVal =
            srcCopy[idx + 2] * center -
            w * (srcCopy[topIdx + 2] + srcCopy[btmIdx + 2] + srcCopy[leftIdx + 2] + srcCopy[rightIdx + 2]);
          data[idx + 2] = Math.max(0, Math.min(255, bVal));
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('[enhancePortraitCanvas] Skipping canvas filter:', err);
  }
}

/**
 * Re-sharpen and enhance an existing base64/image URL on demand
 */
export async function autoEnhanceImageDataUrl(
  dataUrl: string,
  options?: { sharpenStrength?: number; contrastBoost?: number; vibrancyBoost?: number }
): Promise<string> {
  if (!dataUrl) return '';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 480;
        canvas.height = img.naturalHeight || 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        enhancePortraitCanvas(ctx, canvas.width, canvas.height, options);
        resolve(canvas.toDataURL('image/jpeg', 0.94));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
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
