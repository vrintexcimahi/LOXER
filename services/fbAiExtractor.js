import fs from 'node:fs';
import path from 'node:path';

const ROUTER_BASE_URL = process.env.VITE_9ROUTER_URL || process.env.ROUTER_BASE_URL || 'http://192.168.1.14:20128/v1';
const ROUTER_API_KEY = process.env.VITE_9ROUTER_KEY || process.env.ROUTER_API_KEY || 'sk-8a5519a24dcaa639-lak6mu-729b8007';
const ROUTER_MODEL = process.env.ROUTER_VISION_MODEL || 'ag/gemini-3.8-flash-high';

/**
 * Detect image MIME type from Buffer magic bytes or default to image/jpeg
 */
function detectMimeType(buffer, defaultType = 'image/jpeg') {
  if (!buffer || buffer.length < 4) return defaultType;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  return defaultType;
}

/**
 * Clean model response text to extract raw JSON
 */
function cleanJsonOutput(text) {
  if (!text) return null;
  let cleaned = text.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');
  }
  // Try to find the outermost JSON object bounds
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }
  return cleaned;
}

/**
 * Extract structured information from a Facebook post (text + images) using AI Vision.
 *
 * @param {Object} options
 * @param {string} options.postText Caption or raw text of the post
 * @param {Array<Buffer|string>} options.imageBuffers List of image Buffers or local file paths
 * @param {string} [options.postUrl] Facebook post URL/permalink
 * @returns {Promise<Object>} Structured classification and extracted candidate/job data
 */
export async function extractPostWithAI({ postText = '', imageBuffers = [], postUrl = '' }) {
  const contentParts = [];

  // System instruction prompt
  const systemPrompt = `Anda adalah asisten AI Senior untuk analisis dan OCR postingan Facebook Grup lowongan kerja (LOKER CIMAHI BANDUNG / LOXER).
Tugas Anda:
1. Menganalisis teks caption Facebook dan MEMBACA SELURUH TEKS DALAM GAMBAR (poster loker, foto CV, lamaran kerja, sertifikat, atau flyer) menggunakan kemampuan OCR multimodal Anda.
2. Mengklasifikasikan postingan ke salah satu kategori:
   - "PELAMAR_KERJA": Orang yang mencari kerja, membagikan CV / ijazah, memohon lowongan kerja, atau mempromosikan keahlian pribadi.
   - "IKLAN_LOKER": Perusahaan, toko, pemilik usaha, atau perorangan yang membuka dan merekrut lowongan pekerjaan.
   - "SPAM": Postingan pinjaman online (pinjol), judi online, investasi bodong, hoax, atau konten di luar konteks loker/kerja.
3. Mengekstrak data sedetail mungkin. Jika teks pada gambar CV mencantumkan nama, nomor HP/WA, domisili, sekolah/ijazah, pengalaman, atau keahlian, WAJIB dimasukkan ke properti "candidate".
4. Menghasilkan output HANYA berupa JSON murni tanpa markdown, tanpa backtick \`\`\`, sesuai skema berikut:

{
  "category": "PELAMAR_KERJA" | "IKLAN_LOKER" | "SPAM",
  "confidence_score": 90,
  "candidate": {
    "full_name": "Nama lengkap pelamar (baca dari poster CV)",
    "phone": "Nomor WhatsApp/HP",
    "email": "Email pelamar",
    "domicile_city": "Kota domisili (contoh: Cimahi, Bandung)",
    "headline": "Posisi/bidang yang diminati",
    "education": [{"school_name": "Nama Sekolah/Kampus", "degree": "SMP/SMA/S1"}],
    "experience": [{"position": "Nama Pekerjaan", "period": "Tahun/Durasi"}],
    "skills": ["Skill 1", "Skill 2"]
  },
  "job_posting": {
    "title": "Judul Posisi Lowongan",
    "company_name": "Nama Usaha/Perusahaan",
    "contact_phone": "Nomor WhatsApp pelamar/admin loker",
    "location_city": "Kota penempatan kerja",
    "requirements": "Kualifikasi dan syarat",
    "job_type": "full-time" | "part-time" | "freelance" | "harian"
  },
  "ai_summary": "Ringkasan analisis AI mengenai isi postingan"
}`;

  contentParts.push({
    type: 'text',
    text: `${systemPrompt}\n\n--- POST CONTENT TO ANALYZE ---\nPost URL: ${postUrl || 'N/A'}\nPost Caption / Text:\n"""\n${postText || '(Tidak ada teks caption)'}\n"""\n\nAnalisis teks dan gambar di bawah ini, lalu kembalikan JSON murni:`,
  });

  // Process images
  const normalizedImages = Array.isArray(imageBuffers) ? imageBuffers : [imageBuffers];
  for (const img of normalizedImages) {
    if (!img) continue;
    let buf = null;
    let mime = 'image/jpeg';

    if (Buffer.isBuffer(img)) {
      buf = img;
      mime = detectMimeType(buf);
    } else if (typeof img === 'string') {
      if (img.startsWith('data:image/')) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: img },
        });
        continue;
      }
      // Check if it's a file path
      if (fs.existsSync(img)) {
        buf = fs.readFileSync(img);
        const ext = path.extname(img).toLowerCase();
        if (ext === '.png') mime = 'image/png';
        else if (ext === '.webp') mime = 'image/webp';
        else mime = 'image/jpeg';
      } else {
        // Maybe base64 string directly
        try {
          buf = Buffer.from(img, 'base64');
          mime = detectMimeType(buf);
        } catch {
          console.warn('[fbAiExtractor] Invalid image string skipped');
          continue;
        }
      }
    }

    if (buf && buf.length > 0) {
      const base64Str = buf.toString('base64');
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${mime};base64,${base64Str}`,
        },
      });
    }
  }

  // Send request to 9Router OpenAI-compatible endpoint with retry
  const endpoint = `${ROUTER_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const maxRetries = 2;
  let lastErr = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      if (attempt > 0) {
        console.log(`[fbAiExtractor] Mencoba ulang request AI (Percobaan ${attempt + 1}/${maxRetries + 1})...`);
        await new Promise((r) => setTimeout(r, 2000));
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: ROUTER_MODEL,
          stream: false,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: contentParts,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`9Router API error [${response.status}]: ${errText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      const cleaned = cleanJsonOutput(rawContent);

      if (!cleaned) {
        throw new Error(`AI response did not contain valid JSON content: ${rawContent.slice(0, 200)}`);
      }

      const parsed = JSON.parse(cleaned);

      // Validate and guarantee expected fallback structure
      return {
        category: ['PELAMAR_KERJA', 'IKLAN_LOKER', 'SPAM'].includes(parsed.category)
          ? parsed.category
          : 'PELAMAR_KERJA',
        confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 85,
        candidate: {
          full_name: parsed.candidate?.full_name || '',
          phone: parsed.candidate?.phone || '',
          email: parsed.candidate?.email || '',
          domicile_city: parsed.candidate?.domicile_city || 'Cimahi/Bandung',
          headline: parsed.candidate?.headline || '',
          education: Array.isArray(parsed.candidate?.education) ? parsed.candidate.education : [],
          experience: Array.isArray(parsed.candidate?.experience) ? parsed.candidate.experience : [],
          skills: Array.isArray(parsed.candidate?.skills) ? parsed.candidate.skills : [],
        },
        job_posting: {
          title: parsed.job_posting?.title || '',
          company_name: parsed.job_posting?.company_name || '',
          contact_phone: parsed.job_posting?.contact_phone || '',
          location_city: parsed.job_posting?.location_city || 'Cimahi/Bandung',
          requirements: parsed.job_posting?.requirements || '',
          job_type: parsed.job_posting?.job_type || 'full-time',
        },
        ai_summary: parsed.ai_summary || 'Ekstraksi otomatis oleh AI Vision Loxer',
        raw_ai_response: rawContent,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      console.warn(`[fbAiExtractor] Percobaan ${attempt + 1} gagal:`, err.message);
    }
  }

  console.error('[fbAiExtractor] Seluruh percobaan ekstraksi AI gagal:', lastErr?.message);
  throw lastErr;
}
