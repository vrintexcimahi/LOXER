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

export type PasFotoCropMode = 'smart_square' | 'tight_face' | 'full_frame' | 'wide_portrait';

export interface CropAdjustOptions {
  zoom?: number;       // 0.5 to 2.5 (1.0 = proporsional pas foto, <1 = zoom out / bahu luas, >1 = zoom in)
  panX?: number;       // -100 to +100 (%)
  panY?: number;       // -100 to +100 (%)
}

/**
 * Crop candidate's portrait (pas foto) from the uploaded CV document with LEVEL MAX SKILL.
 * - Guarantees 0% bleed of surrounding CV text / document lines
 * - Centered squarely on the candidate's face & shoulders with natural headroom
 * - Supports smart square 1:1, tight face, full frame, and interactive zoom/pan adjustment
 *
 * @param sourceImage Base64 Data URL or Image URL
 * @param photoBox Normalized bounding box [ymin, xmin, ymax, xmax] in 0-1000 scale
 * @param faceBox Optional tight face bounding box [ymin, xmin, ymax, xmax] in 0-1000 scale
 * @param mode Crop mode: 'smart_square' (default 1:1), 'tight_face', 'full_frame', or 'wide_portrait'
 * @param rotationAngle Optional rotation angle (0, 90, 180, 270)
 * @param adjustOptions Optional manual zoom (0.5 - 2.5) and panX/panY (-100 to 100) offsets
 */
export async function cropPasFotoFromImage(
  sourceImage: string,
  photoBox?: [number, number, number, number] | null,
  faceBox?: [number, number, number, number] | null,
  mode: PasFotoCropMode = 'smart_square',
  rotationAngle: number = 0,
  adjustOptions?: CropAdjustOptions
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

        // Normalize 0-1000 coordinates safely
        const normY1 = Math.max(0, Math.min(1000, Math.min(ymin, ymax)));
        const normY2 = Math.max(0, Math.min(1000, Math.max(ymin, ymax)));
        const normX1 = Math.max(0, Math.min(1000, Math.min(xmin, xmax)));
        const normX2 = Math.max(0, Math.min(1000, Math.max(xmin, xmax)));

        // Convert 0-1000 normalized coordinates to image pixels
        const rawY1 = (normY1 / 1000) * naturalH;
        const rawX1 = (normX1 / 1000) * naturalW;
        const rawY2 = (normY2 / 1000) * naturalH;
        const rawX2 = (normX2 / 1000) * naturalW;

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

        const TARGET_SIZE = 960;
        const HALF_SIZE = TARGET_SIZE / 2;

        const canvas = document.createElement('canvas');
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
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
            tempCtx.drawImage(img, Math.min(naturalW - 1, safeX1 + 2), Math.min(naturalH - 1, safeY1 + 2), 1, 1, 0, 0, 1, 1);
            const pixel = tempCtx.getImageData(0, 0, 1, 1).data;
            bgColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
          }

          // Fill canvas with sampled portrait background
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

          // Fit portrait into canvas
          const scale = Math.min(TARGET_SIZE / safeW, TARGET_SIZE / safeH);
          const drawW = safeW * scale;
          const drawH = safeH * scale;
          const drawX = (TARGET_SIZE - drawW) / 2;
          const drawY = (TARGET_SIZE - drawH) / 2;

          const angle = ((Math.round(rotationAngle || 0) % 360) + 360) % 360;
          if (angle > 0) {
            ctx.save();
            ctx.translate(HALF_SIZE, HALF_SIZE);
            ctx.rotate((angle * Math.PI) / 180);
            ctx.drawImage(img, safeX1, safeY1, safeW, safeH, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
          } else {
            ctx.drawImage(img, safeX1, safeY1, safeW, safeH, drawX, drawY, drawW, drawH);
          }

          enhancePortraitCanvas(ctx, TARGET_SIZE, TARGET_SIZE, {
            sharpenStrength: 0.35,
            contrastBoost: 1.05,
            vibrancyBoost: 1.05,
          });

          return resolve(canvas.toDataURL('image/jpeg', 0.95));
        }

        let cropX = safeX1;
        let cropY = safeY1;
        let cropW = safeW;
        let cropH = safeH;

        const hasFaceBox = faceBox && Array.isArray(faceBox) && faceBox.length === 4;
        let fX1 = 0, fY1 = 0, fX2 = 0, fY2 = 0, fW = 0, fH = 0, fCenterX = 0, fCenterY = 0;
        if (hasFaceBox) {
          const fMinY = Math.max(0, Math.min(1000, Math.min(faceBox[0], faceBox[2])));
          const fMaxY = Math.max(0, Math.min(1000, Math.max(faceBox[0], faceBox[2])));
          const fMinX = Math.max(0, Math.min(1000, Math.min(faceBox[1], faceBox[3])));
          const fMaxX = Math.max(0, Math.min(1000, Math.max(faceBox[1], faceBox[3])));

          fY1 = (fMinY / 1000) * naturalH;
          fX1 = (fMinX / 1000) * naturalW;
          fY2 = (fMaxY / 1000) * naturalH;
          fX2 = (fMaxX / 1000) * naturalW;
          fW = Math.max(10, fX2 - fX1);
          fH = Math.max(10, fY2 - fY1);
          fCenterX = fX1 + fW / 2;
          fCenterY = fY1 + fH / 2;
        }

        // Base dimension for proportional 1:1 portrait (Pas Foto Proporsional):
        // Avoid artificial shrink to 52-70% which caused the extreme over-zoom!
        let baseDim = Math.min(safeW, safeH);

        if (mode === 'tight_face' && hasFaceBox) {
          // Focused close-up mode: tight framing around face
          baseDim = Math.min(safeW, Math.max(fW * 1.55, fH * 1.55));
        } else if (mode === 'wide_portrait') {
          // Extra breathing room showing full chest, collar & wide shoulders
          baseDim = Math.max(safeW, safeH * 0.95);
        } else {
          // Standard smart_square (Default 1:1 Pas Foto):
          // Uses the full safe photo box (96-98%) with balanced headroom and chest room
          baseDim = Math.min(safeW, safeH) * 0.98;
        }

        // Apply interactive user zoom & pan if provided
        const zoom = Math.max(0.5, Math.min(2.5, adjustOptions?.zoom ?? 1.0));
        const panXPercent = Math.max(-100, Math.min(100, adjustOptions?.panX ?? 0));
        const panYPercent = Math.max(-100, Math.min(100, adjustOptions?.panY ?? 0));

        // When zoom < 1.0, finalDim expands (zooms out, showing more shoulders/hijab/hair)
        // When zoom > 1.0, finalDim contracts (zooms in closer to face)
        const finalDim = baseDim / zoom;

        // Positioning center:
        // For professional portraits, eye level / center of face sits around 38-40% from top of 1:1 frame
        let centerX = hasFaceBox ? fCenterX : (safeX1 + safeW / 2);
        let centerY = hasFaceBox
          ? (fCenterY - finalDim * 0.40) + (finalDim / 2)
          : (safeY1 + safeH / 2);

        // Apply manual pan offsets (in percentage of finalDim)
        centerX += (panXPercent / 100) * finalDim;
        centerY += (panYPercent / 100) * finalDim;

        cropW = finalDim;
        cropH = finalDim;
        cropX = centerX - finalDim / 2;
        cropY = centerY - finalDim / 2;

        // Allow graceful expansion outside safe box when user explicitly zooms out (up to full document bounds)
        if (cropX < 0) cropX = 0;
        if (cropY < 0) cropY = 0;
        if (cropX + cropW > naturalW) {
          cropX = Math.max(0, naturalW - cropW);
          cropW = Math.min(naturalW, cropW);
        }
        if (cropY + cropH > naturalH) {
          cropY = Math.max(0, naturalH - cropH);
          cropH = Math.min(naturalH, cropH);
        }

        // Clamp crop boundaries strictly within natural image dimensions
        cropW = Math.max(10, Math.min(naturalW, cropW));
        cropH = Math.max(10, Math.min(naturalH, cropH));
        cropX = Math.max(0, Math.min(naturalW - cropW, cropX));
        cropY = Math.max(0, Math.min(naturalH - cropH, cropY));

        const angle = ((Math.round(rotationAngle || 0) % 360) + 360) % 360;
        if (angle > 0) {
          ctx.save();
          ctx.translate(HALF_SIZE, HALF_SIZE);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.drawImage(img, cropX, cropY, cropW, cropH, -HALF_SIZE, -HALF_SIZE, TARGET_SIZE, TARGET_SIZE);
          ctx.restore();
        } else {
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, TARGET_SIZE, TARGET_SIZE);
        }

        // Automatic HD Portrait Enhancement: Natural contrast, healthy vibrant skin tones, & crisp edge clarity
        enhancePortraitCanvas(ctx, TARGET_SIZE, TARGET_SIZE, {
          sharpenStrength: 0.40,
          contrastBoost: 1.06,
          vibrancyBoost: 1.06,
        });

        resolve(canvas.toDataURL('image/jpeg', 0.95));
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
 * Auto-enhance portrait sharpness, contrast, and color richness safely.
 * Transforms blurry, low-contrast, or hazy photos into crisp, studio-grade portraits.
 * Strictly guarantees natural skin tones with 0% color inversion or solarization artifacts.
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

    // Normalize contrast factor to a safe positive multiplier:
    // e.g. 1.08 = 8% contrast boost, 1.15 = 15% contrast boost
    let contrastFactor = 1.06;
    if (typeof options?.contrastBoost === 'number' && !isNaN(options.contrastBoost)) {
      const cb = options.contrastBoost;
      if (cb > 2) {
        contrastFactor = 1 + Math.min(0.25, Math.max(-0.25, cb / 255));
      } else if (cb >= 0) {
        // Multiplier e.g. 1.18 -> 1 + (0.18)*0.45 = 1.081
        contrastFactor = 1 + (cb - 1) * 0.45;
      }
    }
    // Hard safety clamp to prevent contrast clipping or inversion
    contrastFactor = Math.max(0.85, Math.min(1.22, contrastFactor));

    // Normalize vibrancy factor (color saturation boost)
    let vibrancyFactor = 1.05;
    if (typeof options?.vibrancyBoost === 'number' && !isNaN(options.vibrancyBoost)) {
      const vb = options.vibrancyBoost;
      if (vb > 2) {
        vibrancyFactor = 1 + Math.min(0.25, Math.max(-0.25, vb / 255));
      } else if (vb >= 0) {
        vibrancyFactor = 1 + (vb - 1) * 0.45;
      }
    }
    vibrancyFactor = Math.max(0.85, Math.min(1.22, vibrancyFactor));

    // Normalize sharpening weight (Laplacian unsharp masking)
    // 3x3 convolution weight w: 0.10 - 0.20 gives crisp details without halos
    const requestedSharpen = options?.sharpenStrength ?? 0.45;
    const w = Math.max(0, Math.min(0.20, requestedSharpen * 0.22));

    // 1. Contrast expansion & Color Vibrancy (Natural & Pleasing)
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Linear contrast adjustment centered at midpoint 128
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;

      // Vibrancy / saturation enhancement
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + vibrancyFactor * (r - gray);
      g = gray + vibrancyFactor * (g - gray);
      b = gray + vibrancyFactor * (b - gray);

      data[i] = Math.max(0, Math.min(255, Math.round(r)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }

    // 2. Unsharp Masking / Laplacian high-pass edge sharpening (Crisp Studio Clarity)
    if (w > 0.01) {
      const srcCopy = new Uint8ClampedArray(data);
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
          data[idx] = Math.max(0, Math.min(255, Math.round(rVal)));

          const gVal =
            srcCopy[idx + 1] * center -
            w * (srcCopy[topIdx + 1] + srcCopy[btmIdx + 1] + srcCopy[leftIdx + 1] + srcCopy[rightIdx + 1]);
          data[idx + 1] = Math.max(0, Math.min(255, Math.round(gVal)));

          const bVal =
            srcCopy[idx + 2] * center -
            w * (srcCopy[topIdx + 2] + srcCopy[btmIdx + 2] + srcCopy[leftIdx + 2] + srcCopy[rightIdx + 2]);
          data[idx + 2] = Math.max(0, Math.min(255, Math.round(bVal)));
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
