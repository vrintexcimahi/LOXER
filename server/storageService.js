import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_UPLOADS_DIR = path.resolve(ROOT_DIR, 'public', 'uploads');

// Ensure root upload directory exists
if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
  fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Storage Driver Detection & Config
// ---------------------------------------------------------------------------
const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.R2_BUCKET || '';
const S3_ENDPOINT = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || '';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '';
const S3_REGION = process.env.S3_REGION || process.env.AWS_REGION || 'auto';
const S3_PUBLIC_URL_PREFIX = process.env.S3_PUBLIC_URL || process.env.STORAGE_PUBLIC_URL_PREFIX || '';

export function getStorageDriver() {
  if (S3_BUCKET && S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
    if (S3_ENDPOINT.includes('r2.cloudflarestorage.com') || process.env.R2_BUCKET) {
      return 'r2';
    }
    return 's3';
  }
  return 'local';
}

// ---------------------------------------------------------------------------
// File Signature (Magic Bytes) Verification
// ---------------------------------------------------------------------------
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
};

export function validateMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  // GIF: 47 49 46 38 ('GIF8')
  if (mimeType === 'image/gif') {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  }

  // WEBP: 'RIFF'....'WEBP'
  if (mimeType === 'image/webp') {
    if (buffer.length < 12) return false;
    const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
    const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return isRiff && isWebp;
  }

  // PDF: %PDF (25 50 44 46)
  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 4).toString('ascii') === '%PDF';
  }

  // DOCX / ZIP: PK.. (50 4B 03 04)
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }

  // SVG: textual XML/SVG check
  if (mimeType === 'image/svg+xml') {
    const head = buffer.subarray(0, 200).toString('utf8').trim().toLowerCase();
    return head.includes('<svg') || (head.includes('<?xml') && head.includes('<svg'));
  }

  return false;
}

// ---------------------------------------------------------------------------
// S3 SigV4 Upload Helper (Zero External Dependencies)
// ---------------------------------------------------------------------------
function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

async function uploadToS3(key, buffer, mimeType) {
  const endpointUrl = new URL(S3_ENDPOINT.startsWith('http') ? S3_ENDPOINT : `https://${S3_ENDPOINT}`);
  const host = endpointUrl.host;
  const pathPart = `/${S3_BUCKET}/${key}`.replace(/\/+/g, '/');
  const targetUrl = `${endpointUrl.protocol}//${host}${pathPart}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const service = 's3';
  const region = S3_REGION;

  const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest =
    `PUT\n` +
    `${pathPart}\n\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign =
    `${algorithm}\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    `${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

  const signingKey = getSignatureKey(S3_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorizationHeader =
    `${algorithm} ` +
    `Credential=${S3_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  const res = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      Host: host,
      'Content-Type': mimeType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: authorizationHeader,
    },
    body: buffer,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`S3 upload failed (${res.status}): ${errorText}`);
  }

  const publicUrl = S3_PUBLIC_URL_PREFIX
    ? `${S3_PUBLIC_URL_PREFIX.replace(/\/$/, '')}/${key}`
    : targetUrl;

  return { publicUrl };
}

// ---------------------------------------------------------------------------
// Local Disk Upload Adapter
// ---------------------------------------------------------------------------
function uploadToLocal(folder, filename, buffer) {
  // Sanitize folder and filename
  const cleanFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');

  const targetDir = path.join(PUBLIC_UPLOADS_DIR, cleanFolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, cleanFilename);
  fs.writeFileSync(filePath, buffer);

  const relativeUrl = `/uploads/${cleanFolder}/${cleanFilename}`;
  return {
    url: relativeUrl,
    publicUrl: relativeUrl,
  };
}

// ---------------------------------------------------------------------------
// Public Storage API Methods
// ---------------------------------------------------------------------------

/**
 * Upload a binary buffer to the configured storage driver
 */
export async function uploadBuffer({ buffer, filename, mimeType, folder = 'uploads' }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer berkas kosong');
  }

  // Max 15MB limit general, 5MB for PDF documents
  const MAX_SIZE = 15 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    throw new Error(`Ukuran berkas melebihi batas maksimal 15MB (${(buffer.length / (1024 * 1024)).toFixed(1)}MB)`);
  }

  const normalizedMime = (mimeType || 'application/octet-stream').toLowerCase();
  if (normalizedMime === 'application/pdf' && buffer.length > 5 * 1024 * 1024) {
    throw new Error(`Ukuran dokumen PDF melebihi batas maksimal 5MB (${(buffer.length / (1024 * 1024)).toFixed(1)}MB).`);
  }
  const ext = MIME_EXTENSIONS[normalizedMime] || path.extname(filename) || '.bin';

  // Magic bytes security verification for known formats
  if (MIME_EXTENSIONS[normalizedMime]) {
    const isValid = validateMagicBytes(buffer, normalizedMime);
    if (!isValid) {
      throw new Error(`Signature berkas tidak valid untuk tipe konten '${normalizedMime}'.`);
    }
  }

  // Generate unique collision-resistant filename
  const uniquePrefix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const baseName = path.basename(filename || 'file', path.extname(filename || '')).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const targetFilename = `${uniquePrefix}-${baseName}${ext}`;

  const driver = getStorageDriver();

  if (driver === 's3' || driver === 'r2') {
    const s3Key = `${folder}/${targetFilename}`.replace(/\/+/g, '/');
    const result = await uploadToS3(s3Key, buffer, normalizedMime);
    return {
      url: result.publicUrl,
      publicUrl: result.publicUrl,
      filename: targetFilename,
      driver,
      size: buffer.length,
      mimeType: normalizedMime,
    };
  }

  // Default: local disk
  const localResult = uploadToLocal(folder, targetFilename, buffer);
  return {
    url: localResult.url,
    publicUrl: localResult.publicUrl,
    filename: targetFilename,
    driver: 'local',
    size: buffer.length,
    mimeType: normalizedMime,
  };
}

/**
 * Upload a Base64 Data URI string to storage
 */
export async function uploadBase64({ dataUri, folder = 'uploads', filenamePrefix = 'upload' }) {
  if (!dataUri || typeof dataUri !== 'string') {
    throw new Error('Data URI tidak valid');
  }

  const matches = dataUri.match(/^data:([a-zA-Z0-9/+-.]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Format Data URI tidak sesuai (wajib data:<mime>;base64,<payload>)');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = MIME_EXTENSIONS[mimeType] || '.bin';
  const filename = `${filenamePrefix}${ext}`;

  return uploadBuffer({ buffer, filename, mimeType, folder });
}

/**
 * Intelligent offloading helper: If value is a Base64 string, offloads to storage
 * and returns the resulting URL. If value is already a URL or empty, returns as is.
 */
export async function offloadBase64Payload(value, folder = 'uploads', filenamePrefix = 'file') {
  if (!value || typeof value !== 'string') return value;

  // Check if string is a Base64 data URI
  if (value.startsWith('data:image/') || value.startsWith('data:application/pdf')) {
    try {
      const uploadRes = await uploadBase64({ dataUri: value, folder, filenamePrefix });
      return uploadRes.url || uploadRes.publicUrl;
    } catch (err) {
      console.warn(`[storageService] Offload Base64 gagal (${folder}):`, err.message);
      // Fallback: return value unmodified if offload fails
      return value;
    }
  }

  // Already a URL or non-base64
  return value;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(fileUrlOrKey) {
  if (!fileUrlOrKey || typeof fileUrlOrKey !== 'string') return false;

  const driver = getStorageDriver();

  // If local file path
  if (fileUrlOrKey.startsWith('/uploads/')) {
    const relativePath = fileUrlOrKey.replace(/^\/uploads\//, '');
    const safePath = path.resolve(PUBLIC_UPLOADS_DIR, relativePath);

    // Prevent path traversal
    if (safePath.startsWith(PUBLIC_UPLOADS_DIR) && fs.existsSync(safePath)) {
      try {
        fs.unlinkSync(safePath);
        return true;
      } catch (err) {
        console.warn('[storageService] Gagal menghapus file lokal:', err.message);
        return false;
      }
    }
  }

  // Future: S3 delete
  return false;
}

/**
 * Get storage stats (disk usage & total uploads)
 */
export function getStorageStats() {
  const driver = getStorageDriver();
  let fileCount = 0;
  let totalBytes = 0;

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        fileCount += 1;
        try {
          const st = fs.statSync(fullPath);
          totalBytes += st.size;
        } catch {
          // ignore
        }
      }
    }
  }

  scanDir(PUBLIC_UPLOADS_DIR);

  return {
    driver,
    localUploadsDir: PUBLIC_UPLOADS_DIR,
    fileCount,
    totalBytes,
    totalMegabytes: (totalBytes / (1024 * 1024)).toFixed(2),
  };
}

/**
 * Prune temporary/orphan uploaded files older than maxAgeDays (Saran 12)
 */
export function pruneOrphanUploads(subfolder = 'temp', maxAgeDays = 7) {
  const targetDir = path.resolve(PUBLIC_UPLOADS_DIR, subfolder);
  if (!fs.existsSync(targetDir)) return { deletedCount: 0, reclaimedBytes: 0 };

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  let reclaimedBytes = 0;

  try {
    const files = fs.readdirSync(targetDir);
    for (const f of files) {
      const fullPath = path.join(targetDir, f);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && stat.mtimeMs < cutoff) {
          reclaimedBytes += stat.size;
          fs.unlinkSync(fullPath);
          deletedCount++;
        }
      } catch {
        // ignore individual file error
      }
    }
  } catch (err) {
    console.warn('[storageService] pruneOrphanUploads notice:', err.message);
  }

  return { deletedCount, reclaimedBytes };
}
