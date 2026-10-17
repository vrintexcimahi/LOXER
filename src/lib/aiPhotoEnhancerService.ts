/**
 * LOXER AI Photo Enhancer Service
 * Connects to Imagen Local API (antigravity/gemini-3.1-flash-image)
 * to enhance blurry passport photos to studio HD or regenerate candidate portraits.
 */

import { resolveAdminToken } from './adminUtils';

export interface AiPhotoEnhanceParams {
  imageUrl?: string;
  fullName?: string;
  headline?: string;
  gender?: string;
  bio?: string;
  mode?: 'enhance' | 'regenerate';
  customPrompt?: string;
}

export interface AiPhotoEnhanceResult {
  ok: boolean;
  photo_url: string;
  message?: string;
}

const IMAGEN_PUBLIC_ENDPOINT = 'https://img.vrintex.web.id';
const IMAGEN_API_KEY = 'img_6e2911a86ad77d8b72ec040d95546c4392de4c8f250dda44';
const IMAGEN_MODEL = 'antigravity/gemini-3.1-flash-image';

/**
 * Detect gender from candidate name or bio
 */
export function detectCandidateGender(fullName?: string, bio?: string): 'wanita' | 'pria' {
  const text = `${fullName || ''} ${bio || ''}`.toLowerCase();
  const femalePatterns = [
    'siti', 'nur', 'wati', 'yani', 'aeni', 'tari', 'yuli', 'yusni', 'meis', 'seli',
    'indri', 'saskia', 'putri', 'dewi', 'ayu', 'lia', 'wulan', 'fitri', 'diah', 'indah',
    'rahayu', 'novi', 'kartika', 'dian', 'retno', 'dwi', 'lestari', 'tika', 'widya', 'ratna',
    'maya', 'mega', 'amelia', 'fadila', 'fatimah', 'aulia', 'safitri', 'anisa', 'annisa',
    'mutiara', 'bella', 'shinta', 'intan', 'desy', 'desi', 'vina', 'eka', 'anggi', 'nadia',
    'naysilla', 'rizky anjani', 'wanita', 'perempuan', 'hijab'
  ];

  for (const pat of femalePatterns) {
    if (text.includes(pat)) return 'wanita';
  }
  return 'pria';
}

export const SYSTEM_RESTORATION_INSTRUCTION = `You are an image restoration engine, not an image generator.

For every restoration request:
- Treat the supplied image as the absolute visual source.
- Never redesign or reinterpret the subject.
- Never replace the face.
- Never change the person's identity.
- Never change clothing, background, pose, expression, framing, colors or composition.
- Do not beautify.
- Do not create details that cannot reasonably be recovered.
- Only remove blur, noise and compression artifacts and increase resolution.
- Structural similarity and identity preservation are more important than visual perfection.
- When uncertain, preserve the original pixels instead of inventing new content.`;

export const STRICT_UPSCALE_4K_PROMPT_CONFIG = {
  task: "STRICT_IMAGE_RESTORATION_4K",
  mode: "image_to_image_restoration",
  priority: "PRESERVE_ORIGINAL_IMAGE",
  instruction: "Gunakan GAMBAR INPUT sebagai sumber visual absolut. Ini adalah tugas RESTORASI dan UPSCALE, BUKAN generate ulang, BUKAN membuat portrait baru, BUKAN mengganti wajah. Pertahankan orang, identitas, wajah, ekspresi, pose, rambut, pakaian, background, pencahayaan, framing, crop, warna, teks, badge, logo, dan seluruh komposisi gambar asli. Hanya perbaiki blur, noise, ketajaman, detail dan resolusi.",
  identity_preservation: {
    enabled: true,
    strength: "MAXIMUM",
    instruction: "Wajah hasil HARUS tetap orang yang sama persis dengan gambar input. Jangan reinterpretasi wajah. Jangan membuat bentuk mata, hidung, bibir, rahang, alis, telinga atau proporsi baru.",
    preserve: [
      "face geometry",
      "eye shape",
      "eye spacing",
      "eyebrow shape",
      "nose shape",
      "lip shape",
      "jawline",
      "face width",
      "skin tone",
      "hairline",
      "hairstyle",
      "facial expression"
    ]
  },
  scene_preservation: {
    enabled: true,
    strength: "MAXIMUM",
    preserve: [
      "original background",
      "original clothing",
      "original pose",
      "original framing",
      "original camera angle",
      "original crop",
      "original lighting direction",
      "original colors",
      "all UI overlays",
      "all labels",
      "all logos",
      "all badges"
    ],
    instruction: "Jangan mengganti background. Jangan mengganti pakaian. Jangan menambahkan studio, kantor, salon, ruangan, benda, aksesori atau elemen baru."
  },
  restoration: {
    deblur: true,
    denoise: true,
    remove_compression_artifacts: true,
    recover_edges: true,
    recover_hair_detail: true,
    recover_skin_detail: true,
    natural_skin_texture: true,
    correct_minor_exposure: true,
    correct_minor_white_balance: true,
    upscale: "4K",
    sharpening: "natural",
    detail_recovery: "conservative"
  },
  face_restoration: {
    enabled: true,
    method: "conservative",
    beautification: false,
    skin_smoothing: false,
    face_swap: false,
    face_redesign: false,
    instruction: "Perjelas informasi wajah yang memang ada pada gambar input. Jika suatu detail tidak dapat dipastikan dari sumber, jangan mengarang detail baru."
  },
  composition_lock: {
    enabled: true,
    instruction: "Posisi kepala, ukuran wajah, arah pandangan, bahu, rambut, pakaian dan semua objek harus tetap pada koordinat visual yang sama seperti gambar asli."
  },
  background_lock: {
    enabled: true,
    instruction: "Background wajib identik dengan input. Hanya boleh dibersihkan dari blur/noise ringan. Tidak boleh diganti."
  },
  color_lock: {
    enabled: true,
    instruction: "Pertahankan warna dominan gambar asli. Jangan melakukan recolor atau cinematic grading."
  },
  text_and_ui_lock: {
    enabled: true,
    instruction: "Jangan mengubah, menghapus, menambahkan atau menulis ulang teks, label, ikon, badge dan elemen UI yang sudah ada."
  },
  forbidden: [
    "generate a new person",
    "different face",
    "face replacement",
    "face swap",
    "beautification",
    "change expression",
    "change hairstyle",
    "change clothing",
    "change background",
    "change pose",
    "change camera angle",
    "change crop",
    "invent facial details",
    "add makeup",
    "make eyes larger",
    "reshape nose",
    "reshape jaw",
    "smooth plastic skin",
    "professional portrait recreation",
    "studio portrait",
    "cinematic portrait",
    "AI portrait",
    "new environment",
    "additional objects"
  ],
  negative_prompt: "different person, new face, reconstructed identity, face swap, altered facial structure, beauty filter, plastic skin, perfect model face, changed eyes, changed nose, changed lips, changed jawline, changed hairstyle, different clothes, different background, office background, salon background, studio background, cinematic background, portrait recreation, artificial lighting, new objects, different pose, different crop, hallucinated details",
  quality_target: {
    "resolution": "4K",
    "realism": "photographic",
    "identity_similarity": "maximum",
    "structural_similarity": "maximum",
    "visual_change": "minimum"
  },
  final_instruction: "OUTPUT harus terlihat seperti gambar input yang sama persis tetapi diambil dengan kamera yang lebih fokus dan beresolusi tinggi. Jika harus memilih antara membuat gambar lebih cantik atau mempertahankan gambar asli, SELALU pilih mempertahankan gambar asli."
};

export function getStrictUpscale4kPrompt(): string {
  return `${SYSTEM_RESTORATION_INSTRUCTION}\n\nSTRICT_RESTORATION_SPECIFICATION:\n${JSON.stringify(STRICT_UPSCALE_4K_PROMPT_CONFIG, null, 2)}`;
}

/**
 * Call AI Photo Enhancer with fallback strategy:
 * 1. Primary: LOXER Server backend proxy (/api/admin/ai-enhance-photo)
 * 2. Fallback: Direct call to https://img.vrintex.web.id
 */
export async function callAiPhotoEnhancer(
  params: AiPhotoEnhanceParams
): Promise<AiPhotoEnhanceResult> {
  const mode = params.mode || (params.imageUrl ? 'enhance' : 'regenerate');
  const detectedGender = params.gender || detectCandidateGender(params.fullName, params.bio);
  const cleanName = (params.fullName || 'Kandidat').trim();
  const cleanHeadline = (params.headline || 'Staff Profesional').trim();

  // Strict structured 4K upscale restoration JSON prompt + System Instruction
  const upscale4kPromptJson = params.customPrompt || getStrictUpscale4kPrompt();

  // 1. Try Backend Proxy First (Fast LAN / Reverse Proxy)
  try {
    const token = await resolveAdminToken();
    const resp = await fetch('/api/admin/ai-enhance-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        imageUrl: params.imageUrl,
        fullName: cleanName,
        headline: cleanHeadline,
        gender: detectedGender,
        mode,
        customPrompt: mode === 'enhance' ? upscale4kPromptJson : params.customPrompt,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.ok && data.photo_url) {
        return {
          ok: true,
          photo_url: data.photo_url,
          message: data.message || (mode === 'enhance' ? 'Berhasil di-upscale ke 4K Ultra HD!' : 'Foto profil baru berhasil digenerate!'),
        };
      } else if (data.message && mode === 'enhance') {
        throw new Error(data.message);
      }
    }
  } catch (backendErr) {
    console.warn('[callAiPhotoEnhancer] Backend proxy error, falling back to direct API:', backendErr);
  }

  // 2. Direct Fallback to Imagen API (https://img.vrintex.web.id)
  if (mode === 'enhance') {
    if (!params.imageUrl) {
      throw new Error('Tidak ada gambar referensi asli yang dapat di-upscale.');
    }

    const resp = await fetch(`${IMAGEN_PUBLIC_ENDPOINT}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': IMAGEN_API_KEY,
      },
      body: JSON.stringify({
        prompt: upscale4kPromptJson,
        image: params.imageUrl,
        model: IMAGEN_MODEL,
        response_format: 'url',
        n: 1,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`AI Imagen gagal melakukan 4K upscale (HTTP ${resp.status}): ${errText.slice(0, 180)}`);
    }

    const json = await resp.json();
    const url = json?.data?.[0]?.url;
    if (!url) {
      throw new Error('AI Imagen tidak mengembalikan URL gambar hasil restorasi.');
    }

    return {
      ok: true,
      photo_url: url,
      message: 'Foto profil berhasil di-upscale ke 4K Ultra HD!',
    };
  }

  // 3. Mode 'regenerate': generate studio portrait variation
  const genderDesc = detectedGender === 'wanita' ? 'wanita Indonesia' : 'pria Indonesia';
  const regenPrompt = params.customPrompt ||
    `Pas foto formal studio profesional ultra HD kualitas 4K untuk kandidat pelamar kerja ${genderDesc} bernama ${cleanName}, profesi ${cleanHeadline}. Berpenampilan rapi, busana kerja formal elegan, wajah Indonesia natural, senyum ramah profesional, pencahayaan studio tajam jernih, latar belakang studio polos formal netral.`;

  const genResp = await fetch(`${IMAGEN_PUBLIC_ENDPOINT}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IMAGEN_API_KEY,
    },
    body: JSON.stringify({
      prompt: regenPrompt,
      model: IMAGEN_MODEL,
      n: 1,
    }),
  });

  if (!genResp.ok) {
    const errText = await genResp.text().catch(() => '');
    throw new Error(`HTTP ${genResp.status} dari AI Imagen: ${errText.slice(0, 150)}`);
  }

  const genJson = await genResp.json();
  const genUrl = genJson?.images?.[0];
  if (!genUrl) {
    throw new Error('AI Imagen tidak mengembalikan URL gambar.');
  }

  return {
    ok: true,
    photo_url: genUrl,
    message: 'Foto profil baru berhasil digenerate dengan AI Imagen!',
  };
}
