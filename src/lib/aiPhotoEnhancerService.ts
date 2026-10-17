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

export const BASE_UPSCALE_4K_PROMPT_CONFIG = {
  task: "image_restoration_and_4k_upscale",
  language: "id",
  input_reference: "gunakan gambar asli sebagai satu-satunya referensi",
  goal: "Pulihkan gambar yang sangat blur menjadi foto yang lebih tajam, natural, realistis dan berkualitas 4K tanpa mengubah identitas orang pada gambar.",
  output: {
    quality: "ultra_high",
    resolution: "4K",
    preserve_aspect_ratio: true,
    format: "PNG",
    style: "realistic_photography"
  },
  restoration: {
    deblur: "maximum",
    remove_motion_blur: true,
    remove_gaussian_blur: true,
    recover_facial_details: true,
    recover_hair_details: true,
    recover_clothing_details: true,
    reduce_noise: true,
    remove_compression_artifacts: true,
    improve_edge_definition: true,
    improve_dynamic_range: true,
    correct_exposure: true,
    correct_white_balance: true,
    natural_skin_texture: true,
    sharpening: "high_but_natural"
  },
  face_restoration: {
    priority: "very_high",
    preserve_original_identity: true,
    preserve_face_shape: true,
    preserve_eye_shape: true,
    preserve_nose_shape: true,
    preserve_lip_shape: true,
    preserve_skin_tone: true,
    preserve_hairstyle: true,
    preserve_expression: true,
    do_not_beautify_excessively: true,
    do_not_generate_new_facial_features: true,
    instruction: "Rekonstruksi hanya detail yang secara logis berasal dari struktur gambar asli. Jangan mengganti wajah, jangan membuat wajah baru, dan jangan mengubah ciri khas subjek."
  },
  detail_enhancement: {
    eyes: "clear and natural",
    eyebrows: "restore realistic individual strands",
    hair: "restore natural individual hair strands",
    skin: "realistic pores and subtle texture",
    lips: "natural texture without artificial gloss",
    clothing: "restore fabric texture and original shape",
    background: "clean and sharpen moderately while keeping original appearance"
  },
  ui_and_text: {
    preserve_original_layout: true,
    preserve_existing_labels: true,
    preserve_existing_colors: true,
    do_not_add_new_text: true,
    do_not_change_interface_elements: true
  },
  camera_look: {
    appearance: "high-end smartphone or professional camera",
    focus: "sharp face",
    depth: "natural",
    contrast: "balanced",
    saturation: "natural",
    hdr: "subtle",
    oversharpening: false
  },
  negative_prompt: [
    "different person",
    "changed identity",
    "face swap",
    "new face",
    "altered facial proportions",
    "plastic skin",
    "over-smoothed skin",
    "AI beauty filter",
    "anime",
    "cartoon",
    "painting",
    "fake eyelashes",
    "unrealistic eyes",
    "extra facial features",
    "distorted face",
    "warped hair",
    "oversharpening",
    "halo artifacts",
    "excessive HDR",
    "unnatural skin color",
    "invented text",
    "changed clothing",
    "changed background",
    "watermark"
  ],
  final_instruction: "Hasil akhir harus terlihat seperti foto asli yang sejak awal diambil menggunakan kamera berkualitas tinggi dalam kondisi fokus sempurna, bukan seperti gambar AI. Pertahankan komposisi, identitas, pose, pakaian, warna, background dan seluruh elemen asli. Tingkatkan hanya kualitas, kejernihan dan resolusinya hingga 4K."
};

export function buildUpscale4kPromptJson(fullName?: string, headline?: string, gender?: string): string {
  const promptObj = {
    ...BASE_UPSCALE_4K_PROMPT_CONFIG,
    ...(fullName ? {
      subject_context: {
        name: fullName,
        profession: headline || 'Staff Profesional',
        gender: gender || 'pria/wanita'
      }
    } : {})
  };
  return JSON.stringify(promptObj, null, 2);
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

  // Generate structured 4K upscale prompt JSON
  const upscale4kPromptJson = params.customPrompt || buildUpscale4kPromptJson(cleanName, cleanHeadline, detectedGender);

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
        customPrompt: upscale4kPromptJson,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.ok && data.photo_url) {
        return {
          ok: true,
          photo_url: data.photo_url,
          message: data.message || 'Berhasil di-upscale ke 4K Ultra HD dengan AI Imagen',
        };
      }
    }
  } catch (backendErr) {
    console.warn('[callAiPhotoEnhancer] Backend proxy error, falling back to direct API:', backendErr);
  }

  // 2. Direct Fallback to Imagen API (https://img.vrintex.web.id)
  const genderDesc = detectedGender === 'wanita' ? 'wanita Indonesia' : 'pria Indonesia';

  if (mode === 'enhance' && params.imageUrl) {
    const prompt = upscale4kPromptJson;

    try {
      const resp = await fetch(`${IMAGEN_PUBLIC_ENDPOINT}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': IMAGEN_API_KEY,
        },
        body: JSON.stringify({
          prompt,
          image: params.imageUrl,
          model: IMAGEN_MODEL,
          response_format: 'url',
          n: 1,
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        const url = json?.data?.[0]?.url;
        if (url) {
          return {
            ok: true,
            photo_url: url,
            message: 'Foto profil berhasil di-upscale ke 4K Ultra HD!',
          };
        }
      }
    } catch (directEnhanceErr) {
      console.warn('[callAiPhotoEnhancer] Direct /v1/images/generations failed, attempting /generate fallback:', directEnhanceErr);
    }
  }

  // 3. Fallback to /generate (clean new portrait variation)
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
