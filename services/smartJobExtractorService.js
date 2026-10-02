/**
 * LOXER Smart Job Extractor Service
 * Powered by 9Router Gemini 3.8 (ag/gemini-3.8-flash-high / gemini/gemini-3.8-flash)
 *
 * Extracts job flyers, poster images, and Facebook post links/captions,
 * structuring the content into LOXER standard job advertising format.
 */

const ROUTER_BASE_URL = process.env.VITE_9ROUTER_URL || process.env.ROUTER_BASE_URL || 'http://192.168.1.14:20128/v1';
const ROUTER_API_KEY = process.env.VITE_9ROUTER_KEY || process.env.ROUTER_API_KEY || 'sk-vrintex-2026-fixed';
const PRIMARY_MODEL = process.env.ROUTER_VISION_MODEL || 'ag/gemini-3.8-flash-high';
const FALLBACK_MODEL = 'gemini/gemini-3.8-flash';

const STANDARD_CATEGORIES = [
  'Teknologi & IT',
  'Pemasaran & Digital',
  'Keuangan & Akuntansi',
  'Desain & Kreatif',
  'Penjualan / Sales',
  'Operasional & Logistik',
  'SDM & HRD',
  'Hukum & Legal',
  'Layanan Pelanggan (CS)',
  'Manajemen Produk',
  'Teknik & Rekayasa',
  'Analisis Data',
  'F&B & Hospitality',
  'Pendidikan & Pelatihan',
  'Kesehatan & Medis',
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
 * Match a raw category string to standard LOXER categories
 */
function matchStandardCategory(rawCategory) {
  if (!rawCategory) return 'Teknik & Rekayasa';
  const rawLower = rawCategory.toLowerCase();
  for (const cat of STANDARD_CATEGORIES) {
    if (rawLower.includes(cat.toLowerCase()) || cat.toLowerCase().includes(rawLower)) {
      return cat;
    }
  }
  if (rawLower.includes('manufaktur') || rawLower.includes('teknisi') || rawLower.includes('mesin') || rawLower.includes('mekanik')) {
    return 'Teknik & Rekayasa';
  }
  if (rawLower.includes('it') || rawLower.includes('software') || rawLower.includes('developer') || rawLower.includes('programmer')) {
    return 'Teknologi & IT';
  }
  if (rawLower.includes('sales') || rawLower.includes('marketing') || rawLower.includes('penjualan')) {
    return 'Penjualan / Sales';
  }
  if (rawLower.includes('kuliner') || rawLower.includes('waiter') || rawLower.includes('cook') || rawLower.includes('barista') || rawLower.includes('resto')) {
    return 'F&B & Hospitality';
  }
  if (rawLower.includes('gudang') || rawLower.includes('kurir') || rawLower.includes('driver') || rawLower.includes('logistik')) {
    return 'Operasional & Logistik';
  }
  return 'Teknik & Rekayasa';
}

/**
 * Fetch and extract text from an external web URL or Facebook post
 */
async function fetchLinkContent(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!resp.ok) return `URL: ${url} (HTTP ${resp.status})`;
    const html = await resp.text();
    // Quick extract title, meta description, og:description
    const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] || '';
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1] || '';
    const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    // Strip HTML tags for sample text
    const textSnippet = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 3000)
      .trim();

    return `URL: ${url}\nTitle: ${ogTitle || pageTitle}\nMeta Description: ${ogDesc}\nPage Text Snippet:\n${textSnippet}`;
  } catch (err) {
    return `URL: ${url} (Gagal mengambil konten web: ${err.message})`;
  }
}

/**
 * Main function: Extract and structure a Job Ad using 9Router Gemini 3.8
 *
 * @param {Object} options
 * @param {string} [options.imageBase64] Base64 image data URI (data:image/...) or pure base64
 * @param {string} [options.postUrl] Facebook post URL or job flyer link
 * @param {string} [options.postText] Raw text caption from FB post or flyer
 * @returns {Promise<Object>} Formatted job ad structure matching LOXER web schema
 */
export async function extractSmartJobAd({ imageBase64 = '', postUrl = '', postText = '' }) {
  let linkContext = '';
  if (postUrl && postUrl.startsWith('http')) {
    linkContext = await fetchLinkContent(postUrl);
  }

  const systemInstruction = `Anda adalah agen AI Senior LOXER (Portal Lowongan Kerja Cimahi, Bandung & Sekitarnya).
Tugas Anda adalah membaca poster/flyer loker (OCR visual multimodal) atau postingan Facebook Grup lowongan kerja, lalu menyusun dan menyesuaikan konten tersebut ke dalam struktur resmi iklan lowongan kerja web LOXER.

Ketentuan Penyesuaian Konten LOXER:
1. "title": Judul posisi lowongan kerja yang jelas, spesifik, dan profesional (misal: "Technician Maintenance", "Staff Administrasi Gudang", "Barista & Kasir").
2. "company_name": Nama perusahaan, instansi, gerai, atau pemilik usaha (misal: "Staffinc", "PT Sumber Berkah", "Kopi Kenangan").
3. "category": Pilih salah satu kategori standar berikut:
   ["Teknologi & IT", "Pemasaran & Digital", "Keuangan & Akuntansi", "Desain & Kreatif", "Penjualan / Sales", "Operasional & Logistik", "SDM & HRD", "Hukum & Legal", "Layanan Pelanggan (CS)", "Manajemen Produk", "Teknik & Rekayasa", "Analisis Data", "F&B & Hospitality", "Pendidikan & Pelatihan", "Kesehatan & Medis"].
4. "location_city": Kota atau kabupaten penempatan (utamakan area Cimahi, Kota Bandung, Kab. Bandung, Kab. Bandung Barat, atau kota yang tertera di poster).
5. "job_type": Tipe kontrak kerja ("full-time", "part-time", "contract", "freelance", atau "internship").
6. "salary_min" & "salary_max": Nominal gaji dalam angka murni (contoh: 3500000). Jika tidak disebutkan di poster, isi 0.
7. "description": Buat paragraf deskripsi pekerjaan yang profesional, ramah pencari kerja, menjelaskan tanggung jawab utama posisi ini.
8. "requirements": Kualifikasi dan syarat pelamar dalam format poin-poin rapi (gunakan simbol bullet • di setiap baris).
9. "benefits": Benefit, fasilitas, atau tunjangan yang ditawarkan (misal: BPJS TK, BPJS Kesehatan, THR, Makan Siang, Insentif).
10. "quota": Estimasi jumlah kuota penerimaan (angka bulat minimal 1).
11. "application_url": Link pendaftaran online resmi (misal: website karir perusahaan atau link postingan FB).
12. "contact_phone": Nomor WhatsApp atau nomor telepon HRD/rekruter jika tercantum di poster.
13. "ai_notes": Catatan singkat analisis AI mengenai akurasi poster, keaslian (waspada penipuan/gratis), atau informasi tambahan penting.
14. "confidence_score": Estimasi keyakinan AI terhadap data yang diekstrak (angka 50 - 99).

Format output WAJIB HANYA JSON murni tanpa markdown, tanpa backtick, sesuai skema berikut:
{
  "title": "...",
  "company_name": "...",
  "category": "...",
  "location_city": "...",
  "job_type": "full-time",
  "salary_min": 0,
  "salary_max": 0,
  "description": "...",
  "requirements": "• ...\\n• ...",
  "benefits": "• ...\\n• ...",
  "quota": 1,
  "application_url": "...",
  "contact_phone": "...",
  "ai_notes": "...",
  "confidence_score": 95
}`;

  const userContent = [];
  userContent.push({
    type: 'text',
    text: `${systemInstruction}\n\n--- DATA MASUKAN DARI ADMIN LOXER ---\n` +
      `URL Postingan/Flyer: ${postUrl || 'Tidak disertakan'}\n` +
      (linkContext ? `Hasil Perayapan URL:\n"""\n${linkContext}\n"""\n` : '') +
      `Teks Caption / Catatan Tambahan:\n"""\n${postText || 'Tidak ada teks caption'}\n"""\n` +
      (imageBase64 ? 'Periksa dan baca seluruh informasi pada gambar flyer/poster yang dilampirkan menggunakan OCR visual multimodal Anda.\n' : '') +
      'Kembalikan sekarang HANYA objek JSON yang valid:',
  });

  // Attach Image if provided
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
      console.log(`[smartJobExtractorService] Mengirim request ke 9Router dengan model ${model}...`);
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

      // Normalize and sanitize all fields
      const result = {
        title: (parsed.title || 'Lowongan Kerja').trim(),
        company_name: (parsed.company_name || 'Mitra LOXER').trim(),
        category: matchStandardCategory(parsed.category),
        location_city: (parsed.location_city || 'Bandung / Cimahi').trim(),
        job_type: ['full-time', 'part-time', 'contract', 'freelance', 'internship'].includes(parsed.job_type)
          ? parsed.job_type
          : 'full-time',
        salary_min: typeof parsed.salary_min === 'number' ? parsed.salary_min : parseInt(parsed.salary_min || '0', 10) || 0,
        salary_max: typeof parsed.salary_max === 'number' ? parsed.salary_max : parseInt(parsed.salary_max || '0', 10) || 0,
        description: (parsed.description || '').trim(),
        requirements: (parsed.requirements || '').trim(),
        benefits: (parsed.benefits || '').trim(),
        quota: typeof parsed.quota === 'number' ? Math.max(1, parsed.quota) : parseInt(parsed.quota || '1', 10) || 1,
        application_url: (parsed.application_url || postUrl || '').trim(),
        contact_phone: (parsed.contact_phone || '').trim(),
        poster_url: imageBase64 ? imageBase64 : '',
        ai_notes: (parsed.ai_notes || 'Diekstrak & disesuaikan otomatis oleh Agen AI Gemini 3.8 LOXER').trim(),
        confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 90,
        extracted_at: new Date().toISOString(),
        ai_model_used: model,
      };

      return result;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      console.warn(`[smartJobExtractorService] Percobaan model ${model} gagal:`, err.message);
    }
  }

  throw lastError || new Error('Gagal mengekstrak iklan loker dari poster/link.');
}
