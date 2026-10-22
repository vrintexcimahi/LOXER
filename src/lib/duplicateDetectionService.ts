/**
 * LOXER Intelligent Duplicate Detection & Conflict Prevention Service
 *
 * Mencegah konflik data ganda pada upload CV dan postingan Bursa Talent:
 * 1. Fingerprinting berkas (Binary SHA-256 Hash & Normalisasi Nama File).
 * 2. Normalisasi nomor telepon / WhatsApp standar Indonesia (62 / +62 / 08).
 * 3. Normalisasi nama kandidat (pembersihan gelar akademik S.Kom, S.T, S.Pd, S.E, dll).
 * 4. Fuzzy token matching untuk nama kandidat serupa.
 * 5. Deteksi silang: Antrean lokal (Queue) & Database riil (Bursa Talent).
 */

/**
 * Menghasilkan hash SHA-256 dari konten berkas (Binary Content Fingerprint).
 * Berkas dengan isi identik akan menghasilkan hash yang sama meskipun nama file diubah.
 */
export async function computeFileFingerprint(file: File): Promise<string> {
  try {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      // Fallback fingerprint: nama + ukuran + lastModified
      return `fb_${file.name.toLowerCase()}_${file.size}_${file.lastModified}`;
    }

    // Untuk efisiensi performa pada berkas besar (> 2MB), ambil chunk awal + akhir + size
    let bufferToHash: ArrayBuffer;
    if (file.size > 2 * 1024 * 1024) {
      const sliceStart = file.slice(0, 512 * 1024);
      const sliceEnd = file.slice(file.size - 512 * 1024, file.size);
      const [startBuf, endBuf] = await Promise.all([sliceStart.arrayBuffer(), sliceEnd.arrayBuffer()]);
      
      const combined = new Uint8Array(startBuf.byteLength + endBuf.byteLength + 8);
      combined.set(new Uint8Array(startBuf), 0);
      combined.set(new Uint8Array(endBuf), startBuf.byteLength);
      // Sisipkan panjang ukuran file sebagai integer 64-bit sederhana
      const view = new DataView(combined.buffer);
      view.setFloat64(startBuf.byteLength + endBuf.byteLength, file.size);
      bufferToHash = combined.buffer;
    } else {
      bufferToHash = await file.arrayBuffer();
    }

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', bufferToHash);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('[duplicateDetectionService] computeFileFingerprint fallback:', err);
    return `fb_${file.name.toLowerCase()}_${file.size}_${file.lastModified}`;
  }
}

/**
 * Normalisasi nama file untuk mendeteksi file yang sama dengan penamaan berbeda:
 * Contoh:
 * - "CV BUNGA NOVITA 2026_compressed (1).pdf" -> "bunganovita2026"
 * - "1541603810178_1539610026987_CV Luffi.jpg" -> "luffi"
 * - "Curriculum Vitae ulpa baru fix.pdf" -> "ulpabarufix"
 * - "CV Dafa Ridho Fadillah _20260513_120527_0000.pdf" -> "dafaridhofadillah"
 */
export function normalizeFilename(fileName: string): string {
  if (!fileName) return '';

  let name = fileName.trim().toLowerCase();

  // 1. Hapus ekstensi
  name = name.replace(/\.(pdf|jpe?g|png|webp|jfif|docx?)$/i, '');

  // 2. Hapus prefix angka acak timestamp (misal: 1541603810178_1539610026987_)
  name = name.replace(/^\d{10,}[_-]\d{10,}[_-]/, '');
  name = name.replace(/^\d{8,}[_-]/, '');

  // 3. Hapus suffix timestamp & duplikat penomoran bawaan OS (misal: _20260513_120527_0000 atau (1), (2), - copy)
  name = name.replace(/[_-]\d{8,}[_-]\d{4,}(_\d+)?$/i, '');
  name = name.replace(/[\s_-]*\(\d+\)$/i, '');
  name = name.replace(/[\s_-]*copy(\s*\d+)?$/i, '');
  name = name.replace(/[\s_-]*salinan(\s*\d+)?$/i, '');

  // 4. Hapus kata umum dokumen resume/cv
  name = name.replace(/\b(curriculum\s*vitae|curiculum\s*vitae|resume|cv)\b/gi, '');
  name = name.replace(/\b(dokumen|document|berkas|file|scan|baru|fix|update|compressed|reduced)\b/gi, '');

  // 5. Bersihkan karakter non-alfanumerik
  name = name.replace(/[^a-z0-9]/g, '');

  return name;
}

/**
 * Normalisasi nomor WhatsApp / HP standar Indonesia:
 * - "+62 812-3456-7890" -> "081234567890"
 * - "6281234567890"     -> "081234567890"
 * - "081234567890"      -> "081234567890"
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');

  if (digits.length < 8) return '';

  if (digits.startsWith('62')) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('0')) {
    return digits;
  }
  return '0' + digits;
}

/**
 * Normalisasi email: trim, lowercase, buang spasi
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '';
  return String(email).trim().toLowerCase();
}

/**
 * Normalisasi nama kandidat (menghapus gelar akademik & sebutan):
 * Contoh: "Dewi Lestari, S.E." -> "dewi lestari"
 * Contoh: "M. Rizky Pratama S.Kom" -> "m rizky pratama"
 */
export function normalizeCandidateName(name: string | null | undefined): string {
  if (!name) return '';

  let cleaned = String(name).trim().toLowerCase();

  // Hapus gelar dan singkatan umum di Indonesia
  const titles = [
    /\bs\.?kom\b/gi,
    /\bs\.?t\b/gi,
    /\bs\.?pd\b/gi,
    /\bs\.?e\b/gi,
    /\bs\.?sos\b/gi,
    /\bs\.?h\b/gi,
    /\bs\.?si\b/gi,
    /\ba\.?md\b/gi,
    /\ba\.?ma\b/gi,
    /\bm\.?kom\b/gi,
    /\bm\.?m\b/gi,
    /\bm\.?t\b/gi,
    /\bdrg?\.?\b/gi,
    /\bh\.?\b/gi,
    /\bhj\.?\b/gi,
    /\bprof\.?\b/gi,
    /\bir\.?\b/gi,
    /\bdipl\.?\b/gi,
  ];

  for (const t of titles) {
    cleaned = cleaned.replace(t, '');
  }

  // Buang tanda baca dan spasi berlebih
  cleaned = cleaned.replace(/[,;:.()_'"-]/g, ' ').replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Menghitung tingkat kemiripan string nama (Token Overlap & Jaccard index)
 * Mengembalikan nilai 0.0 sampai 1.0 (1.0 = 100% cocok)
 */
export function calculateNameSimilarity(nameA: string, nameB: string): number {
  const normA = normalizeCandidateName(nameA);
  const normB = normalizeCandidateName(nameB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  // Cek token kata
  const tokensA = new Set(normA.split(' ').filter(Boolean));
  const tokensB = new Set(normB.split(' ').filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  const jaccard = intersection.size / union.size;

  // Jika semua kata pada nama pendek ada di nama panjang (misal: "Dewi Lestari" ada di "Dewi Lestari Anggraeni")
  const minTokens = Math.min(tokensA.size, tokensB.size);
  const containsAllShorter = intersection.size === minTokens && minTokens >= 2;

  if (containsAllShorter) {
    return Math.max(jaccard, 0.90);
  }

  return jaccard;
}

export interface CandidateIdentity {
  id?: string;
  full_name: string;
  whatsapp_number?: string;
  email?: string;
  headline?: string;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  type?: 'queue' | 'database';
  reason?: string;
  matchedName?: string;
  matchedDetails?: string;
  matchedId?: string;
}

/**
 * Memeriksa apakah kandidat merupakan duplikat terhadap daftar pembanding (Antrean / Database).
 */
export function detectCandidateDuplicate(
  candidate: CandidateIdentity,
  pool: CandidateIdentity[],
  poolType: 'queue' | 'database' = 'queue',
  excludeId?: string
): DuplicateDetectionResult {
  const normTargetName = normalizeCandidateName(candidate.full_name);
  const normTargetPhone = normalizePhoneNumber(candidate.whatsapp_number);
  const normTargetEmail = normalizeEmail(candidate.email);

  if (!normTargetName && !normTargetPhone && !normTargetEmail) {
    return { isDuplicate: false };
  }

  for (const item of pool) {
    if (excludeId && item.id === excludeId) continue;

    const itemName = normalizeCandidateName(item.full_name);
    const itemPhone = normalizePhoneNumber(item.whatsapp_number);
    const itemEmail = normalizeEmail(item.email);

    // 1. Kecocokan Pasti via Nomor WhatsApp / HP (100% Identitas Sama)
    if (normTargetPhone && itemPhone && normTargetPhone === itemPhone) {
      return {
        isDuplicate: true,
        type: poolType,
        matchedName: item.full_name,
        matchedId: item.id,
        reason:
          poolType === 'database'
            ? `Nomor WhatsApp ${candidate.whatsapp_number} sudah terdaftar di Bursa Talent (${item.full_name})`
            : `Nomor WhatsApp ${candidate.whatsapp_number} serupa dengan berkas lain di antrean (${item.full_name})`,
        matchedDetails: item.headline,
      };
    }

    // 2. Kecocokan Pasti via Email
    if (normTargetEmail && itemEmail && normTargetEmail === itemEmail) {
      return {
        isDuplicate: true,
        type: poolType,
        matchedName: item.full_name,
        matchedId: item.id,
        reason:
          poolType === 'database'
            ? `Alamat email ${candidate.email} sudah terdaftar di Bursa Talent (${item.full_name})`
            : `Alamat email ${candidate.email} serupa dengan berkas lain di antrean (${item.full_name})`,
        matchedDetails: item.headline,
      };
    }

    // 3. Kecocokan Nama Lengkap Persis
    if (normTargetName && itemName && normTargetName === itemName && normTargetName.length >= 3) {
      return {
        isDuplicate: true,
        type: poolType,
        matchedName: item.full_name,
        matchedId: item.id,
        reason:
          poolType === 'database'
            ? `Kandidat "${item.full_name}" sudah terdaftar di Bursa Talent`
            : `Kandidat "${item.full_name}" terdeteksi ganda di dalam antrean`,
        matchedDetails: item.headline,
      };
    }

    // 4. Kecocokan Kemiripan Nama Tinggi (Fuzzy Similarity >= 0.88)
    const similarity = calculateNameSimilarity(candidate.full_name, item.full_name);
    if (similarity >= 0.88 && normTargetName.length >= 5 && itemName.length >= 5) {
      return {
        isDuplicate: true,
        type: poolType,
        matchedName: item.full_name,
        matchedId: item.id,
        reason:
          poolType === 'database'
            ? `Nama kandidat sangat mirip dengan "${item.full_name}" yang sudah aktif di Bursa Talent`
            : `Nama kandidat sangat mirip dengan "${item.full_name}" di antrean lain`,
        matchedDetails: item.headline,
      };
    }
  }

  return { isDuplicate: false };
}
