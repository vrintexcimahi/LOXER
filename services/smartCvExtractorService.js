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
 * Extract candidate CV & Biodata using 9Router Gemini 3.8 Multimodal
 * @param {Object} options
 * @param {string} [options.imageBase64] - Base64 image data URL (from JPG/PNG or rendered PDF page canvas)
 * @param {string} [options.cvText] - Raw text extracted from PDF or pasted by user
 * @param {string} [options.fileName] - Name of uploaded file
 */
export async function extractSmartCv({ imageBase64, cvText, fileName }) {
  const systemInstruction = `Anda adalah Asisten Pakar HR Talent & AI CV Parser LOXER (Platform Bursa Kerja & Rekrutmen Terpercaya).
Tugas Anda adalah membaca dan menganalisis berkas CV / Biodata pelamar kerja (baik dari teks CV maupun visual/scan/poster CV).

Ekstrak dan susun seluruh informasi kandidat secara komprehensif, akurat, dan profesional ke dalam bahasa Indonesia:
1. "full_name": Nama lengkap pencari kerja (kapitalisasi nama orang yang tepat).
2. "headline": Posisi target atau profesi keahlian utama (contoh: "Operator Gudang & Packing", "Senior Fullstack Engineer (React & Node.js)", "Staff Administrasi & Keuangan").
3. "category": Kategori keahlian standar LOXER (Pilih salah satu yang paling cocok dari:
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
4. "availability": Status ketersediaan ("fulltime", "freelance", "parttime", atau "remote"). Default "fulltime" jika tidak disebut.
5. "experience_years": Estimasi total pengalaman kerja dalam tahun (angka bulat, minimal 0).
6. "expected_salary": Estimasi ekspektasi gaji atau tarif dalam angka murni (contoh: 4500000). Jika tidak tercantum, perkirakan nilai wajar regional UMR/pasar atau isi 0.
7. "rate_type": Tipe tarif ("monthly" untuk bulanan, "hourly" per jam, "project" per order/proyek).
8. "domicile_city": Kota domisili atau tempat tinggal kandidat (contoh: "Cimahi", "Kota Bandung", "Kabupaten Bandung", "Jakarta Selatan", dll.).
9. "whatsapp_number": Nomor telepon atau WhatsApp (format diawali 08... atau 62...).
10. "email": Alamat email kandidat jika ada.
11. "bio": Paragraf ringkasan profil profesional kandidat yang menarik, ramah, dan meyakinkan bagi calon perusahaan perekrut (2-4 kalimat).
12. "skills": Daftar 4 sampai 10 keahlian utama (array of strings, contoh: ["Packing Barang", "Stock Opname", "Microsoft Excel", "Forklift"]).
13. "educations": Array riwayat pendidikan dengan struktur [{"school_name": "...", "degree": "SMA / SMK / D3 / S1", "major": "...", "start_year": 2018, "end_year": 2021}].
14. "experiences": Array riwayat pengalaman kerja dengan struktur [{"company_name": "...", "position": "...", "period": "2021 - 2023", "description": "..."}].
15. "portfolio_url": Tautan LinkedIn, GitHub, atau portfolio jika tercantum.
16. "badge": Label badge kandidat ("SIAP KERJA", "TOP TALENT", "FREELANCER", atau "TERVERIFIKASI").
17. "ai_notes": Catatan singkat evaluasi kecocokan AI (kelebihan pelamar, kesiapan kerja, dan integritas berkas).
18. "confidence_score": Nilai keyakinan kelengkapan data (angka 70 - 99).

Format output WAJIB HANYA JSON murni tanpa markdown, tanpa backtick:
{
  "full_name": "...",
  "headline": "...",
  "category": "...",
  "availability": "fulltime",
  "experience_years": 2,
  "expected_salary": 4500000,
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
  "confidence_score": 95
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

  if (imageBase64) {
    let formattedUrl = imageBase64;
    if (!formattedUrl.startsWith('data:image/')) {
      formattedUrl = `data:image/jpeg;base64,${imageBase64}`;
    }
    userContent.push({
      type: 'image_url',
      image_url: { url: formattedUrl },
    });
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

      const result = {
        full_name: (parsed.full_name || 'Pelamar Kerja').trim(),
        headline: (parsed.headline || 'Pencari Kerja Aktif').trim(),
        category: matchStandardTalentCategory(parsed.category),
        availability: ['fulltime', 'freelance', 'parttime', 'remote'].includes(parsed.availability)
          ? parsed.availability
          : 'fulltime',
        experience_years: typeof parsed.experience_years === 'number' ? parsed.experience_years : parseInt(parsed.experience_years || '0', 10) || 0,
        expected_salary: typeof parsed.expected_salary === 'number' ? parsed.expected_salary : parseInt(String(parsed.expected_salary || '0').replace(/\D/g, ''), 10) || 0,
        rate_type: ['monthly', 'hourly', 'project'].includes(parsed.rate_type) ? parsed.rate_type : 'monthly',
        domicile_city: (parsed.domicile_city || 'Cimahi / Bandung').trim(),
        whatsapp_number: (parsed.whatsapp_number || '').trim(),
        email: (parsed.email || '').trim(),
        bio: (parsed.bio || '').trim(),
        skills: Array.isArray(parsed.skills) && parsed.skills.length > 0 ? parsed.skills : ['Komunikasi', 'Kerja Tim', 'Disiplin'],
        educations: Array.isArray(parsed.educations) ? parsed.educations : [],
        experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
        portfolio_url: (parsed.portfolio_url || '').trim(),
        badge: ['TOP TALENT', 'SIAP KERJA', 'FREELANCER', 'TERVERIFIKASI'].includes(parsed.badge) ? parsed.badge : 'SIAP KERJA',
        photo_url: imageBase64 ? imageBase64 : '',
        ai_notes: (parsed.ai_notes || 'Biodata diekstrak secara otomatis oleh Agen AI Gemini 3.8 LOXER').trim(),
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
