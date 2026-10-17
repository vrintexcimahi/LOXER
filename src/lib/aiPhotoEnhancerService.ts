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
        customPrompt: params.customPrompt,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.ok && data.photo_url) {
        return {
          ok: true,
          photo_url: data.photo_url,
          message: data.message || 'Berhasil diproses dengan AI Imagen HD',
        };
      }
    }
  } catch (backendErr) {
    console.warn('[callAiPhotoEnhancer] Backend proxy error, falling back to direct API:', backendErr);
  }

  // 2. Direct Fallback to Imagen API (https://img.vrintex.web.id)
  const genderDesc = detectedGender === 'wanita' ? 'wanita Indonesia' : 'pria Indonesia';

  if (mode === 'enhance' && params.imageUrl) {
    const prompt = params.customPrompt ||
      `Pas foto formal studio profesional ultra HD kualitas 4K, sangat tajam dan jernih untuk pelamar kerja ${genderDesc}, nama: ${cleanName}, posisi: ${cleanHeadline}. Tingkatkan kejernihan wajah, mata tajam, hilangkan blur, pencahayaan studio rapi, busana formal rapi, latar belakang studio formal polos.`;

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
            message: 'Foto profil berhasil dipertajam dengan AI Imagen HD!',
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
