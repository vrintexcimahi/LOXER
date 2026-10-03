/**
 * LOXER Contact Privacy & Shopee-Grade Strict Content Sensor Service
 *
 * Mencegah kebocoran privasi kandidat dan transaksi di luar aplikasi:
 * 1. Sensor & masking otomatis nomor telepon / WhatsApp (0831••••4023).
 * 2. Sensor & masking email (azq••••@gmail.com).
 * 3. Sensor nama jalan/alamat rumah detail (hanya tampilkan area/kota).
 * 4. Deteksi ketat gaya Shopee/Upwork untuk chat & pesan:
 *    - Blokir nomor kontak (angka berurutan, spasi, format +62, ejaan huruf: kosong delapan...).
 *    - Blokir email & format tersamar (dot com, at gmail).
 *    - Blokir handle sosial media (WA, Tele, IG, FB, Line, TikTok, dll).
 *    - Blokir ajakan transaksi/kontak di luar aplikasi LOXER.
 */

// ---------------------------------------------------------------------------
// 1. Masking Helpers (Untuk Tampilan Publik & Bursa Talent)
// ---------------------------------------------------------------------------

/**
 * Mask nomor telepon / WhatsApp: 083160674023 -> 0831••••4023
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return 'Kontak Terproteksi LOXER';
  const clean = String(phone).trim();
  const digits = clean.replace(/\D/g, '');

  if (digits.length < 8) {
    return '•••••••• (Terproteksi)';
  }

  const prefix = digits.startsWith('62') ? '0' + digits.slice(2, 5) : digits.slice(0, 4);
  const suffix = digits.slice(-3);
  return `${prefix}•••••${suffix} (Privasi Terproteksi)`;
}

/**
 * Mask email: azqytull@gmail.com -> azq•••••@gmail.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return 'Email Terproteksi LOXER';
  const clean = String(email).trim().toLowerCase();
  const [user, domain] = clean.split('@');
  if (user.length <= 2) {
    return `${user[0] || 'u'}••••@${domain}`;
  }
  const prefix = user.slice(0, 3);
  return `${prefix}•••••@${domain}`;
}

/**
 * Mask alamat / domisili: Jl. Babakan Loa Wetan, Cimahi -> Area Cimahi (Terproteksi LOXER)
 */
export function maskAddress(address: string | null | undefined, defaultCity = 'Cimahi'): string {
  if (!address) return `Area ${defaultCity} (Terproteksi)`;
  const raw = String(address).trim();

  // Daftar kata kunci jalan/rumah yang harus disensor
  const streetKeywords = [
    /\bjl\.?\b/i,
    /\bjalan\b/i,
    /\bgang\b/i,
    /\bgg\.?\b/i,
    /\brt\b/i,
    /\brw\b/i,
    /\bno\.?\b/i,
    /\bnomor\b/i,
    /\bblok\b/i,
    /\bkomplek\b/i,
    /\bperumahan\b/i,
    /\bdesa\b/i,
    /\bkelurahan\b/i,
  ];

  const hasStreet = streetKeywords.some((regex) => regex.test(raw));
  if (!hasStreet && raw.length < 30) {
    return raw;
  }

// Ambil nama kota dari kata terakhir atau pisahkan koma
  const parts = raw.split(/,|\//).map((p) => p.trim()).filter(Boolean);
  const cityCandidate = parts[parts.length - 1] || defaultCity;
  return `Area ${cityCandidate.replace(/^kota\s+|^kabupaten\s+/i, '')} (Alamat Lengkap Terproteksi LOXER)`;
}

/**
 * Bersihkan domisili dari detail jalan, RT/RW, dll agar hanya menyisakan nama kota/kabupaten
 */
export function cleanDomicileCity(cityCandidate: string | null | undefined, defaultCity = 'Cimahi'): string {
  if (!cityCandidate) return defaultCity;
  let clean = String(cityCandidate).trim();
  
  // Hapus prefiks jalan / gang / komplek jika ada
  clean = clean.replace(/^(jl\.?|jalan|gang|gg\.?|rt\b|rw\b|blok\b|komplek\b|perumahan\b)[^,]+/i, '').trim();
  
  // Ambil bagian terakhir jika dipisah koma
  const parts = clean.split(/[,/]/).map((p) => p.trim()).filter(Boolean);
  const lastPart = parts[parts.length - 1] || defaultCity;
  const filteredCity = lastPart.replace(/^(kota\s+|kabupaten\s+|kab\.?\s+)/i, '').trim();
  
  return filteredCity || defaultCity;
}

// ---------------------------------------------------------------------------
// 2. Shopee-Grade Strict Contact Detection & Censorship Engine
// ---------------------------------------------------------------------------

// Ejaan angka dalam bahasa Indonesia
const SPELLED_NUMBERS = [
  'nol', 'kosong', 'satu', 'dua', 'tiga', 'empat',
  'lima', 'enam', 'tujuh', 'delapan', 'sembilan'
];

/**
 * Pola regex deteksi nomor telepon:
 * - 08xxxxxxxxxx
 * - +62xxxxxxxxxx / 628xxxxxxxxxx
 * - Angka berspasi: 0 8 1 2 3 4 5 6
 * - Angka bertitik / berstrip: 0812-3456-7890 / 0812.3456.7890
 */
const PHONE_PATTERN = /(\+?62|08|021|022|\b0[1-9])[\s.-]*(\d[\s.-]*){7,12}\d/gi;

/**
 * Pola regex email dan variasinya (e.g. name [at] domain dot com)
 */
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+(\s*@\s*|\s*\[at\]\s*|\s*\(at\)\s*)[a-zA-Z0-9.-]+(\s*\.\s*|\s*dot\s*)[a-zA-Z]{2,})/gi;

/**
 * Kata kunci sosmed & channel kontak luar yang dilarang keras (Shopee Standard)
 */
const EXTERNAL_CHANNEL_PATTERNS = [
  /\b(wa|whatsapp|watsap|w\.a|w\s+a)\b/gi,
  /\b(tele|telegram|t\.me)\b/gi,
  /\b(ig|instagram|instgrm)\b/gi,
  /\b(fb|facebook|fesbuk)\b/gi,
  /\b(tiktok|tik\s*tok)\b/gi,
  /\b(line\s*id|id\s*line|lineapp)\b/gi,
  /\b(michat|mi\s*chat|wechat)\b/gi,
  /\b(linkedin|linkdn)\b/gi,
  /\b(twitter|x\.com)\b/gi,
  /\b(wa\.me|chat\.whatsapp\.com|bit\.ly|t\.co)\b/gi,
  /\b(japri|pm\s*wa|hubungi\s*wa|chat\s*wa|no\s*hp|nomor\s*hp|nomor\s*wa|save\s*nomor)\b/gi,
  /\b(transfer\s*langsung|bayar\s*di\s*luar|transaksi\s*luar|rek\s*bca|rek\s*bri|rek\s*mandiri|rekening)\b/gi,
];

export interface SensorValidationResult {
  hasViolation: boolean;
  censoredText: string;
  violations: string[];
  warningMessage: string | null;
}

/**
 * Periksa dan sensor teks pesan secara real-time (Shopee Policy)
 */
export function censorStrictContent(rawText: string): SensorValidationResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      hasViolation: false,
      censoredText: '',
      violations: [],
      warningMessage: null,
    };
  }

  let text = rawText;
  const violations: string[] = [];

  // 1. Deteksi Nomor Telepon / WA (Semua format)
  if (PHONE_PATTERN.test(text)) {
    violations.push('Nomor Telepon / WhatsApp');
    text = text.replace(PHONE_PATTERN, ' [🔒 NOMOR KONTAK DISENSOR SISTEM LOXER] ');
  }

  // 2. Deteksi Angka Tersamar (e.g. "o 8 1 2" atau "kosong delapan satu dua")
  const lowerText = text.toLowerCase();
  let spelledCount = 0;
  for (const word of SPELLED_NUMBERS) {
    const matches = lowerText.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) spelledCount += matches.length;
  }
  if (spelledCount >= 4) {
    violations.push('Penyebutan Angka Telepon Tersamar');
    text = text.replace(
      new RegExp(`\\b(${SPELLED_NUMBERS.join('|')})\\b`, 'gi'),
      '*'
    ) + ' [🔒 NOMOR DIEJA DISENSOR SISTEM]';
  }

  // 3. Deteksi Email
  if (EMAIL_PATTERN.test(text)) {
    violations.push('Alamat Email Pribadi');
    text = text.replace(EMAIL_PATTERN, ' [🔒 EMAIL DISENSOR SISTEM LOXER] ');
  }

  // 4. Deteksi Akun Sosial Media / Link Luar
  for (const pattern of EXTERNAL_CHANNEL_PATTERNS) {
    if (pattern.test(text)) {
      violations.push('Kanal Kontak / Sosial Media Luar');
      text = text.replace(pattern, ' [🔒 CHANNEL LUAR DISENSOR] ');
    }
  }

  // Bersihkan spasi ganda
  text = text.replace(/\s{2,}/g, ' ').trim();

  const hasViolation = violations.length > 0;
  const uniqueViolations = Array.from(new Set(violations));

  const warningMessage = hasViolation
    ? `⛔ Kebijakan Privasi & Keamanan Shopee/LOXER: Terdeteksi upaya membagikan ${uniqueViolations.join(
        ', '
      )}. Semua percakapan, negosiasi gaji, dan penawaran kerja wajib dilakukan 100% di dalam Aplikasi LOXER demi perlindungan garansi kerja dan keamanan data pribadi.`
    : null;

  return {
    hasViolation,
    censoredText: text,
    violations: uniqueViolations,
    warningMessage,
  };
}

/**
 * Validasi cepat untuk form typing (memberikan peringatan visual sebelum pesan terkirim)
 */
export function validateMessageSafety(text: string): { isRisky: boolean; alertText: string | null } {
  if (!text || text.trim().length < 3) {
    return { isRisky: false, alertText: null };
  }

  // Cek nomor digit berurutan >= 6 angka
  const hasDigitSequence = /\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d/.test(text);
  // Cek kata kunci channel kontak luar
  const hasExternalKeywords = EXTERNAL_CHANNEL_PATTERNS.some((p) => p.test(text));
  // Cek email
  const hasEmail = EMAIL_PATTERN.test(text);

  if (hasDigitSequence || hasExternalKeywords || hasEmail) {
    return {
      isRisky: true,
      alertText:
        '⚠️ Sensor Keamanan LOXER (Shopee Standard): Pesan mengandung nomor HP, email, atau sosial media. Kontak akan otomatis disensor demi keamanan privasi.',
    };
  }

  return { isRisky: false, alertText: null };
}
