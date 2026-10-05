/**
 * LOXER Smart CV & Biodata Extractor Service
 * Powered by 9Router Gemini 3.8 (ag/gemini-3.8-flash-high / gemini/gemini-3.8-flash)
 *
 * Extracts candidate CV documents (PDF, JPG, PNG, WEBP, or raw text resume),
 * structuring the biodata into standard LOXER Talent & Candidate Marketplace format.
 */

const ROUTER_BASE_URL = process.env.VITE_9ROUTER_URL || process.env.ROUTER_BASE_URL || 'http://192.168.1.14:20128/v1';
const ROUTER_API_KEY = process.env.VITE_9ROUTER_KEY || process.env.ROUTER_API_KEY || 'sk-vrintex-2026-fixed';
const PRIMARY_MODEL = process.env.ROUTER_VISION_MODEL || 'ag/gemini-3.8-flash-high';
const FALLBACK_MODEL = 'gemini/gemini-3.8-flash';

const STANDARD_TALENT_CATEGORIES = [
  'Teknologi & IT',
  'Servis Elektronik & Komputer',
  'Bengkel & Otomotif',
  'Pijat, Refleksi & Terapi Kesehatan',
  'Kebersihan & Cleaning Service',
  'Pertukangan & Renovasi Bangunan',
  'Salon, Barbershop & Perawatan',
  'Pengantaran, Logistik & Angkut Barang',
  'Les Privat & Kursus Mandiri',
  'Fotografi & Multimedia',
  'Desain, Percetakan & Sablon',
  'Teknologi & IT Mandiri',
  'Keuangan & Akuntansi',
  'Pemasaran & Digital',
  'Operasional & Logistik',
  'Umum & Jasa',
];

/**
 * Clean JSON output from LLM responses (strips markdown code fences)
 */
function cleanJsonOutput(text) {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');
  }
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }
  return cleaned;
}

/**
 * Match a raw category string to standard LOXER talent categories
 */
function matchStandardTalentCategory(rawCategory) {
  if (!rawCategory) return 'Umum & Jasa';
  const rawLower = rawCategory.toLowerCase();
  for (const cat of STANDARD_TALENT_CATEGORIES) {
    if (rawLower.includes(cat.toLowerCase()) || cat.toLowerCase().includes(rawLower)) {
      return cat;
    }
  }
  if (rawLower.includes('software') || rawLower.includes('developer') || rawLower.includes('programmer') || rawLower.includes('frontend') || rawLower.includes('backend') || rawLower.includes('fullstack') || rawLower.includes('it')) {
    return 'Teknologi & IT';
  }
  if (rawLower.includes('gudang') || rawLower.includes('packing') || rawLower.includes('logistik') || rawLower.includes('kurir') || rawLower.includes('driver')) {
    return 'Operasional & Logistik';
  }
  if (rawLower.includes('akuntan') || rawLower.includes('pajak') || rawLower.includes('keuangan') || rawLower.includes('finance')) {
    return 'Keuangan & Akuntansi';
  }
  if (rawLower.includes('desain') || rawLower.includes('grafis') || rawLower.includes('ui/ux') || rawLower.includes('video')) {
    return 'Desain, Percetakan & Sablon';
  }
  if (rawLower.includes('marketing') || rawLower.includes('sales') || rawLower.includes('pemasaran')) {
    return 'Pemasaran & Digital';
  }
  if (rawLower.includes('mekanik') || rawLower.includes('otomotif') || rawLower.includes('motor') || rawLower.includes('mobil')) {
    return 'Bengkel & Otomotif';
  }
  if (rawLower.includes('komputer') || rawLower.includes('laptop') || rawLower.includes('elektronik') || rawLower.includes('hp')) {
    return 'Servis Elektronik & Komputer';
  }
  if (rawLower.includes('bersih') || rawLower.includes('cleaning') || rawLower.includes('ob') || rawLower.includes('housekeeping')) {
    return 'Kebersihan & Cleaning Service';
  }
  return 'Umum & Jasa';
}

/**
 * Bersihkan domisili dari detail jalan/RT/RW agar hanya menyisakan nama kota/kabupaten
 */
export function cleanDomicileCity(rawCity) {
  if (!rawCity) return 'Cimahi';
  let str = String(rawCity).trim();
  if (str.includes(',') || str.includes('/')) {
    const parts = str.split(/,|\//).map((p) => p.trim()).filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (lastPart && !/\b(jl|jalan|rt|rw|no|gang|blok)\b/i.test(lastPart)) {
      str = lastPart;
    }
  }
  str = str.replace(/^(jl\.?|jalan|gang|gg\.?|komplek|perumahan)\s+[^,]+/i, '').trim();
  str = str.replace(/^[,\s-]+/, '').trim();
  return str || 'Cimahi';
}

/**
 * Extract candidate CV & Biodata using 9Router Gemini 3.8 Multimodal
 * @param {Object} options
 * @param {string} [options.imageBase64] - Base64 image data URL (from JPG/PNG or rendered PDF page canvas)
 * @param {string} [options.cvText] - Raw text extracted from PDF or pasted by user
 * @param {string} [options.fileName] - Name of uploaded file
 */
export async function extractSmartCv({ imageBase64, cvText, fileName }) {
  const systemInstruction = `Anda adalah Asisten Pakar HR Talent & AI Multimodal CV Parser TERTINGGI LOXER (Platform Bursa Kerja & Rekrutmen Terpercaya).
Tugas Anda adalah membaca, menganalisis, dan mengekstrak data dari berkas CV / Biodata pelamar kerja (baik visual scan/gambar/foto CV maupun teks) dengan LEVEL KEAHLIAN MAKSIMAL (LEVEL MAX SKILL & ACCURACY).

EKSTRAKSI SELURUH DATA DENGAN PRESISI MAKSIMAL KE DALAM BAHASA INDONESIA:
1. "full_name": Nama lengkap pencari kerja yang benar. Bersihkan dari kata awalan seperti "Nama :", "Curriculum Vitae", "Biodata", atau judul dokumen. Tuliskan dengan kapitalisasi nama yang tepat.
2. "headline": Headline profesi target yang sangat spesifik, relevan, dan memiliki daya jual tinggi di industri kerja Indonesia (contoh: "Staff Administrasi Online & Customer Service", "Teknisi Otomotif & Mekanik Sepeda Motor", "Operator Warehouse, Packing & Logistik", "Fullstack Web & Mobile Developer"). JANGAN gunakan headline generik seperti "Pencari Kerja" jika ada keahlian yang tertera.
3. "category": Kategori keahlian standar LOXER (Pilih salah satu yang paling cocok dari 16 kategori resmi:
   - "Teknologi & IT"
   - "Servis Elektronik & Komputer"
   - "Bengkel & Otomotif"
   - "Pijat, Refleksi & Terapi Kesehatan"
   - "Kebersihan & Cleaning Service"
   - "Pertukangan & Renovasi Bangunan"
   - "Salon, Barbershop & Perawatan"
   - "Pengantaran, Logistik & Angkut Barang"
   - "Les Privat & Kursus Mandiri"
   - "Fotografi & Multimedia"
   - "Desain, Percetakan & Sablon"
   - "Teknologi & IT Mandiri"
   - "Keuangan & Akuntansi"
   - "Pemasaran & Digital"
   - "Operasional & Logistik"
   - "Umum & Jasa"
).
4. "availability": Status ketersediaan kerja ("fulltime", "freelance", "parttime", atau "remote"). Default "fulltime".
5. "experience_years": Estimasi total pengalaman kerja nyata dalam tahun (angka bulat, minimal 0). Hitung dari rentang tahun pada riwayat pengalaman kerja. Jika fresh graduate, isi 0.
6. "expected_salary": 0 (WAJIB bernilai 0. Bagian tarif dikosongkan/diisi 0 untuk pelamar yang ditambahkan admin).
7. "rate_type": Tipe tarif ("monthly" untuk bulanan, "hourly" per jam, "project" per proyek). Default "monthly".
8. "domicile_city": HANYA nama Kota atau Kabupaten tempat tinggal kandidat (contoh: "Bandung Barat", "Kota Cimahi", "Kota Bandung", "Jakarta Selatan", "Surabaya", "Bekasi", "Tangerang"). ATURAN KETAT: JANGAN mencantumkan nama jalan, RT/RW, nama desa/kelurahan/kecamatan, atau kode pos!
9. "whatsapp_number": Nomor WhatsApp / HP kandidat yang valid (format terstandar diawali 08... tanpa spasi atau tanda minus, contoh: "087820070258").
10. "email": Alamat email aktif kandidat (koreksi typo OCR jika ada, contoh: ".con" menjadi ".com", "gmai.com" menjadi "gmail.com").
11. "bio": Paragraf ringkasan profil profesional kandidat yang meyakinkan, berbobot, ramah, dan berdaya pikat tinggi bagi perusahaan perekrut (2-3 kalimat padat). Soroti pengalaman utama, etos kerja (disiplin, teliti, adaptif, komunikatif), dan kesiapan memberikan kontribusi positif.
12. "skills": Array 6 sampai 12 keahlian spesifik kandidat (kombinasi hard skill dan soft skill relevan, contoh: ["Administrasi Online", "Pelayanan Pelanggan", "Pengelolaan Dokumen", "Komunikasi Efektif", "Manajemen Waktu", "Ketelitian & Akurasi", "Kerja Tim"]).
13. "educations": Array riwayat pendidikan terstruktur: [{"school_name": "...", "degree": "SMA / SMK / D3 / S1", "major": "...", "start_year": 2018, "end_year": 2021}].
14. "experiences": Array riwayat pengalaman kerja: [{"company_name": "...", "position": "...", "period": "2021 - 2023", "description": "..."}].
15. "portfolio_url": Tautan LinkedIn, GitHub, atau portfolio jika tercantum.
16. "badge": Label badge kandidat ("SIAP KERJA", "TOP TALENT", "FREELANCER", atau "TERVERIFIKASI").
17. "ai_notes": Catatan singkat evaluasi kecocokan AI: kelebihan utama pelamar, etos kerja, dan kesiapan penempatan kerja.
18. "confidence_score": Nilai keyakinan kelengkapan data (angka 85 - 99).
19. "photo_box": Koordinat kotak pembatas (bounding box) SANGAT PRESISI DAN KETAT dari PAS FOTO / FOTO WAJAH FORMAL kandidat pelamar pada lembar CV dalam format [ymin, xmin, ymax, xmax] skala 0 sampai 1000 (contoh: [50, 60, 310, 240]).
   *** FILTER KETAT & ATURAN KRUSIAL PAS FOTO ***:
   - BINGKAI LINGKARAN / BULAT / CANVA BADGE: Jika pas foto diletakkan di dalam bingkai lingkaran (circle mask) atau stiker bulat, photo_box WAJIB dipusatkan dan dipotong KETAT DI BAGIAN DALAM LINGKARAN (inscribed inner crop / zoom in ke area kepala & bahu) sehingga TIDAK MENGIKUTSERTAKAN sudut kertas luar, garis bingkai melengkung, atau warna background dokumen luar sama sekali!
   - KOMPOSISI WAJAH FORMAL: Jangan biarkan kepala terlalu kecil atau jauh di bawah. Pusatkan kepala sehingga wajah mengisi 45-55% tinggi frame pas foto.
   - JANGAN PERNAH menyertakan teks CV, judul dokumen, atau margin luar kertas.
   - Jika berkas tidak memuat foto wajah/pas foto, isi null.
20. "face_box": Koordinat kotak pembatas KETAT dari WAJAH kandidat (dari puncak rambut/dahi hingga dagu) dalam format [ymin, xmin, ymax, xmax] skala 0 sampai 1000. Jika tidak ada foto wajah, isi null.
21. "contact_boxes": Array kotak pembatas [ [ymin, xmin, ymax, xmax], ... ] dari SELURUH AREA KONTAK pelamar pada lembar CV (bagian nomor HP, WhatsApp, email, alamat rumah detail, media sosial, barcode/QR, atau blok kolom 'KONTAK'). Skala integer 0 sampai 1000 (contoh: [[340, 70, 520, 410]]). Berikan batas sedikit lebih longgar agar tidak ada 1 digit nomor HP atau karakter email yang bocor tanpa sensor privasi.
22. "gender": Jenis kelamin pelamar ("pria" atau "wanita") berdasarkan analisis foto visual wajah, nama pelamar, atau teks biodata CV.
23. "photo_rotation": Sudut putar searah jarum jam (0, 90, 180, atau 270) yang dibutuhkan agar pas foto berdiri tegak lurus sempurna (kepala di atas, dagu/bahu di bawah). Jika posisi foto pada dokumen miring ke samping (sideways / landscape), deteksi arah kemiringannya dan tentukan sudut putar yang tepat (90, 180, atau 270) agar pas foto terkoreksi tegak. Jika pas foto sudah tegak lurus normal atau tidak ada foto, isi 0.
24. "photo_quality": Kualitas ketajaman foto ("hd" jika tajam dan jelas, "blurry" jika buram/pecah/beresolusi rendah).

Format output WAJIB HANYA JSON murni tanpa markdown, tanpa backtick:
{
  "full_name": "...",
  "headline": "...",
  "category": "...",
  "availability": "fulltime",
  "experience_years": 1,
  "expected_salary": 0,
  "rate_type": "monthly",
  "domicile_city": "...",
  "whatsapp_number": "...",
  "email": "...",
  "bio": "...",
  "skills": ["...", "..."],
  "educations": [
    { "school_name": "...", "degree": "...", "major": "...", "start_year": 2018, "end_year": 2021 }
  ],
  "experiences": [
    { "company_name": "...", "position": "...", "period": "...", "description": "..." }
  ],
  "portfolio_url": "",
  "badge": "SIAP KERJA",
  "ai_notes": "...",
  "confidence_score": 95,
  "photo_box": [50, 60, 310, 240],
  "face_box": [75, 90, 230, 210],
  "contact_boxes": [[340, 70, 520, 410]],
  "gender": "wanita",
  "photo_rotation": 0,
  "photo_quality": "hd"
}`;

  const userContent = [];
  userContent.push({
    type: 'text',
    text: `${systemInstruction}\n\n--- DOKUMEN CV / BIODATA PELAMAR DARI ADMIN LOXER ---\n` +
      `Nama Berkas: ${fileName || 'Dokumen CV'}\n` +
      (cvText ? `Teks Berkas CV / Biodata:\n"""\n${cvText}\n"""\n` : '') +
      (imageBase64 ? 'Periksa dan baca seluruh teks, tata letak, dan foto profil kandidat pada gambar/halaman CV yang dilampirkan menggunakan OCR visual multimodal Anda.\n' : '') +
      'Kembalikan sekarang HANYA objek JSON yang valid:',
  });

  if (imageBase64 && typeof imageBase64 === 'string') {
    let formattedUrl = null;
    if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
      try {
        const imgResp = await fetch(imageBase64);
        if (imgResp.ok) {
          const arrayBuf = await imgResp.arrayBuffer();
          const mime = imgResp.headers.get('content-type') || 'image/jpeg';
          const b64 = Buffer.from(arrayBuf).toString('base64');
          formattedUrl = `data:${mime};base64,${b64}`;
        }
      } catch (err) {
        console.warn('[smartCvExtractorService] Failed to fetch image URL for inline_data:', err.message);
      }
    } else if (imageBase64.startsWith('data:image/')) {
      formattedUrl = imageBase64;
    } else if (/^[A-Za-z0-9+/=]+$/.test(imageBase64.slice(0, 100))) {
      formattedUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    if (formattedUrl) {
      userContent.push({
        type: 'image_url',
        image_url: { url: formattedUrl },
      });
    }
  }

  const endpoint = `${ROUTER_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const candidateModels = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError = null;

  for (const model of candidateModels) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65000);

    try {
      console.log(`[smartCvExtractorService] Mengirim request ke 9Router dengan model ${model}...`);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: userContent,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`9Router [${resp.status}]: ${errText}`);
      }

      const data = await resp.json();
      const rawText = data.choices?.[0]?.message?.content || '';
      const cleanedJson = cleanJsonOutput(rawText);

      if (!cleanedJson) {
        throw new Error(`9Router tidak mengembalikan format JSON valid: ${rawText.slice(0, 150)}`);
      }

      const parsed = JSON.parse(cleanedJson);

      const parsedPhotoBox = Array.isArray(parsed.photo_box) && parsed.photo_box.length === 4
        ? parsed.photo_box.map((n) => Math.max(0, Math.min(1000, parseInt(n, 10) || 0)))
        : null;

      const parsedFaceBox = Array.isArray(parsed.face_box) && parsed.face_box.length === 4
        ? parsed.face_box.map((n) => Math.max(0, Math.min(1000, parseInt(n, 10) || 0)))
        : null;

      const parsedContactBoxes = Array.isArray(parsed.contact_boxes)
        ? parsed.contact_boxes
            .filter((b) => Array.isArray(b) && b.length === 4)
            .map((b) => b.map((n) => Math.max(0, Math.min(1000, parseInt(n, 10) || 0))))
        : [];

      const result = {
        full_name: (parsed.full_name || 'Pelamar Kerja').trim(),
        headline: (parsed.headline || 'Pencari Kerja Aktif').trim(),
        category: matchStandardTalentCategory(parsed.category),
        availability: ['fulltime', 'freelance', 'parttime', 'remote'].includes(parsed.availability)
          ? parsed.availability
          : 'fulltime',
        experience_years: typeof parsed.experience_years === 'number' ? parsed.experience_years : parseInt(parsed.experience_years || '0', 10) || 0,
        expected_salary: 0, // Dikosongkan untuk user yang ditambahkan admin tanpa akun
        rate_type: ['monthly', 'hourly', 'project'].includes(parsed.rate_type) ? parsed.rate_type : 'monthly',
        domicile_city: cleanDomicileCity(parsed.domicile_city),
        whatsapp_number: (parsed.whatsapp_number || '').trim(),
        email: (parsed.email || '').trim(),
        bio: (parsed.bio || '').trim(),
        skills: Array.isArray(parsed.skills) && parsed.skills.length > 0 ? parsed.skills : ['Komunikasi', 'Kerja Tim', 'Disiplin'],
        educations: Array.isArray(parsed.educations) ? parsed.educations : [],
        experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
        portfolio_url: (parsed.portfolio_url || '').trim(),
        badge: ['TOP TALENT', 'SIAP KERJA', 'FREELANCER', 'TERVERIFIKASI'].includes(parsed.badge) ? parsed.badge : 'SIAP KERJA',
        photo_box: parsedPhotoBox,
        face_box: parsedFaceBox,
        contact_boxes: parsedContactBoxes,
        raw_image_url: imageBase64 ? imageBase64 : '',
        photo_url: '', // Akan diisi pas foto hasil crop di frontend / canvas
        gender: parsed.gender && /^(pria|male|laki)/i.test(String(parsed.gender).trim()) ? 'male' : 'female',
        photo_rotation: [0, 90, 180, 270].includes(parseInt(parsed.photo_rotation, 10)) ? parseInt(parsed.photo_rotation, 10) : 0,
        photo_quality: parsed.photo_quality === 'blurry' ? 'blurry' : 'hd',
        ai_notes: (parsed.ai_notes || 'Biodata diekstrak secara otomatis oleh Agen AI Gemini 3.8 LOXER (Kontak terproteksi privasi)').trim(),
        confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 92,
        extracted_at: new Date().toISOString(),
        ai_model_used: model,
      };

      return result;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      console.warn(`[smartCvExtractorService] Percobaan model ${model} gagal:`, err.message);
    }
  }

  throw lastError || new Error('Gagal mengekstrak biodata CV dari berkas.');
}
