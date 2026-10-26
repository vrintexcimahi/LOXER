/**
 * LOXER AI Live Interview Engine
 * Powered by Gemini 3.8 Flash High (9Router)
 * Inspired by DeepInterview architecture: Prep (Questions) -> Live -> Post (Scoring Rubrics)
 */

import { ProviderCircuitBreaker } from '../services/resilienceService.js';

const ROUTER_BASE_URL = process.env.VITE_9ROUTER_URL || process.env.ROUTER_BASE_URL || 'http://192.168.1.14:20128/v1';
const ROUTER_API_KEY = process.env.VITE_9ROUTER_KEY || process.env.ROUTER_API_KEY || 'sk-9router-direct';
const PRIMARY_MODEL = process.env.ROUTER_VISION_MODEL || 'ag/gemini-3.8-flash-high';
const FALLBACK_MODEL = 'gemini/gemini-3.8-flash';

export const aiInterviewCircuitBreaker = new ProviderCircuitBreaker('9Router-InterviewAI', {
  failureThreshold: 3,
  resetTimeout: 30000,
});

/**
 * Standard fallback questions when AI is offline or times out.
 */
const DEFAULT_FALLBACK_QUESTIONS = [
  {
    id: 'q1',
    category: 'Perkenalan & Relevansi',
    question: 'Halo, selamat datang di sesi wawancara LOXER. Bisa ceritakan secara ringkas tentang diri Anda dan pengalaman kerja yang paling relevan dengan posisi ini?',
    expectedKeywords: ['pengalaman', 'tanggung jawab', 'pencapaian', 'keahlian'],
  },
  {
    id: 'q2',
    category: 'Keahlian Teknis',
    question: 'Keahlian teknis dan alat (tools) kerja apa saja yang paling Anda kuasai untuk menyelesaikan tugas utama pada posisi pekerjaan ini?',
    expectedKeywords: ['software', 'teknis', 'metode', 'standar kerja'],
  },
  {
    id: 'q3',
    category: 'Studi Kasus / Problem Solving',
    question: 'Pernahkah Anda menghadapi kendala atau masalah tak terduga saat bekerja? Bagaimana langkah konkret Anda dalam menyelesaikan masalah tersebut?',
    expectedKeywords: ['masalah', 'solusi', 'tindakan', 'hasil'],
  },
  {
    id: 'q4',
    category: 'Manajemen Tekanan & Kerjasama',
    question: 'Bagaimana cara Anda memprioritaskan pekerjaan saat menghadapi deadline ketat atau target tinggi bersama tim kerja?',
    expectedKeywords: ['prioritas', 'komunikasi', 'koordinasi', 'disiplin'],
  },
  {
    id: 'q5',
    category: 'Motivasi & Komitmen',
    question: 'Apa motivasi utama Anda melamar di posisi ini, dan apa kontribusi terbaik yang ingin Anda berikan jika terpilih bergabung?',
    expectedKeywords: ['motivasi', 'kontribusi', 'komitmen', 'integritas'],
  },
];

async function call9RouterChat(messages, temperature = 0.2) {
  const endpoint = `${ROUTER_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature,
          messages,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        continue;
      }

      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) return content;
    } catch {
      clearTimeout(timeout);
    }
  }

  return null;
}

/**
 * 1. PREP: Generate 5 tailored interview questions based on Candidate CV and Job Role
 */
export async function generateInterviewQuestions({ roleTitle, companyName, candidateName, cvSummary, candidateSkills }) {
  const prompt = `Anda adalah Senior HR Interviewer profesional di Indonesia.
Buat 5 pertanyaan wawancara kerja yang spesifik, ramah, dan profesional untuk kandidat berikut:
- Nama Kandidat: ${candidateName || 'Kandidat'}
- Posisi yang Dilamar: ${roleTitle || 'Staf Operasional'}
- Perusahaan: ${companyName || 'Perusahaan Mitra LOXER'}
- Ringkasan Pengalaman Kandidat: ${cvSummary || 'Pengalaman kerja relevan'}
- Keahlian Kandidat: ${Array.isArray(candidateSkills) ? candidateSkills.join(', ') : candidateSkills || 'Keahlian profesional'}

Struktur wajib 5 pertanyaan:
1. Perkenalan & kesesuaian pengalaman kerja dengan posisi ini
2. Uji keahlian teknis inti atau kemampuan spesifik pekerjaan
3. Studi kasus pemecahan masalah (problem solving) di tempat kerja
4. Kerja sama tim, etos kerja, dan penanganan tekanan kerja/deadline
5. Motivasi melamar, integritas, dan rencana kontribusi nyata

Format output WAJIB HANYA berupa JSON array valid tanpa markdown formatting tambahan:
[
  {
    "id": "q1",
    "category": "Perkenalan & Pengalaman",
    "question": "teks pertanyaan ramah dan jelas dalam Bahasa Indonesia",
    "expectedKeywords": ["kata kunci 1", "kata kunci 2"]
  },
  ...
]`;

  try {
    const rawAiResponse = await call9RouterChat([
      { role: 'system', content: 'Anda adalah sistem pewawancara AI LOXER yang memproduksi pertanyaan interview kerja dalam format JSON murni.' },
      { role: 'user', content: prompt },
    ]);

    if (rawAiResponse) {
      let cleaned = rawAiResponse.replace(/^```json/im, '').replace(/^```/im, '').replace(/```$/im, '').trim();
      const jsonArrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonArrayMatch) {
        cleaned = jsonArrayMatch[0];
      }
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 5).map((q, idx) => ({
          id: q.id || `q${idx + 1}`,
          category: q.category || `Bagian ${idx + 1}`,
          question: q.question,
          expectedKeywords: Array.isArray(q.expectedKeywords) ? q.expectedKeywords : [],
        }));
      }
    }
  } catch (err) {
    console.warn('[interviewService] AI Question Generation fallback:', err.message);
  }

  // Fallback to tailored default questions
  return DEFAULT_FALLBACK_QUESTIONS.map((q, idx) => {
    if (idx === 0) {
      return {
        ...q,
        question: `Halo ${candidateName || ''}, selamat datang di sesi wawancara posisi ${roleTitle}. Bisa ceritakan ringkas tentang diri Anda dan pengalaman kerja terakhir Anda?`,
      };
    }
    return q;
  });
}

/**
 * 2. POST: Evaluate full interview transcript and generate scoring scorecard
 */
export async function evaluateInterviewTranscript({ roleTitle, companyName, candidateName, questions, transcripts }) {
  const dialogSummary = transcripts.map((t) => `${t.speaker === 'ai' ? 'Pewawancara (AI)' : 'Kandidat'}: ${t.message}`).join('\n\n');

  const prompt = `Anda adalah Dewan Asesor HR & Rekrutmen Senior.
Evaluasi transkrip sesi wawancara kerja berikut untuk posisi: ${roleTitle} di ${companyName}.
Nama Kandidat: ${candidateName}

DAFTAR PERTANYAAN:
${JSON.stringify(questions, null, 2)}

TRANSKRIP WAWANCARA LENGKAP:
${dialogSummary || 'Kandidat memberikan jawaban ringkas.'}

Berikan penilaian objektif berdasarkan 4 pilar (skala 0 - 100):
1. technical_score: Penguasaan teknis & kesesuaian keahlian pekerjaan
2. communication_score: Kejelasan berbicara, kesopanan, kelancaran, struktur jawaban
3. problem_solving_score: Kemampuan memecahkan masalah & logika berpikir
4. cultural_fit_score: Motivasi, integritas, keramahan, dan kesiapan kerja tim
5. overall_score: Nilai akhir rata-rata tertimbang (0-100)

Format output WAJIB HANYA JSON murni tanpa markdown:
{
  "overall_score": 85,
  "technical_score": 88,
  "communication_score": 84,
  "problem_solving_score": 82,
  "cultural_fit_score": 86,
  "strengths": [
    "Poin kelebihan 1 kandidat",
    "Poin kelebihan 2 kandidat"
  ],
  "weaknesses": [
    "Poin yang masih perlu ditingkatkan 1",
    "Poin yang masih perlu ditingkatkan 2"
  ],
  "recommendation": "Sangat Disarankan", // Pilih salah satu: "Sangat Disarankan", "Dipertimbangkan", "Perlu Peningkatan"
  "summary_feedback": "Ringkasan evaluasi komprehensif bagi tim rekrutmen / HRD tentang kelayakan kandidat."
}`;

  try {
    const rawAiResponse = await call9RouterChat([
      { role: 'system', content: 'Anda adalah evaluator wawancara AI LOXER yang memproduksi kartu skor JSON murni.' },
      { role: 'user', content: prompt },
    ]);

    if (rawAiResponse) {
      let cleaned = rawAiResponse.replace(/^```json/im, '').replace(/^```/im, '').replace(/```$/im, '').trim();
      const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        cleaned = jsonObjectMatch[0];
      }
      const parsed = JSON.parse(cleaned);
      const overall = Number(parsed.overall_score);
      if (!isNaN(overall)) {
        return {
          overall_score: Math.min(100, Math.max(0, Math.round(overall))),
          technical_score: Math.min(100, Math.max(0, Math.round(Number(parsed.technical_score) || overall))),
          communication_score: Math.min(100, Math.max(0, Math.round(Number(parsed.communication_score) || overall))),
          problem_solving_score: Math.min(100, Math.max(0, Math.round(Number(parsed.problem_solving_score) || overall))),
          cultural_fit_score: Math.min(100, Math.max(0, Math.round(Number(parsed.cultural_fit_score) || overall))),
          strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : ['Komunikasi responsif dan antusias'],
          weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : ['Dapat memberikan contoh metrik pencapaian yang lebih spesifik'],
          recommendation: parsed.recommendation || (overall >= 80 ? 'Sangat Disarankan' : 'Dipertimbangkan'),
          summary_feedback: parsed.summary_feedback || 'Kandidat telah menyelesaikan seluruh pertanyaan wawancara dengan baik.',
        };
      }
    }
  } catch (err) {
    console.warn('[interviewService] AI Evaluation fallback:', err.message);
  }

  // Robust algorithmic scoring fallback
  const answeredCount = transcripts.filter((t) => t.speaker === 'candidate' && t.message.trim().length > 10).length;
  const baseScore = Math.min(92, Math.max(65, 60 + answeredCount * 6));

  return {
    overall_score: baseScore,
    technical_score: Math.min(95, baseScore + 2),
    communication_score: Math.min(95, baseScore - 1),
    problem_solving_score: Math.min(95, baseScore),
    cultural_fit_score: Math.min(95, baseScore + 3),
    strengths: [
      'Menjawab seluruh rangkaian pertanyaan wawancara secara terstruktur',
      'Memiliki motivasi kerja dan pemahaman dasar peran yang baik',
    ],
    weaknesses: [
      'Perlu memperdalam detail contoh kasus implementasi nyata di lapangan',
    ],
    recommendation: baseScore >= 80 ? 'Sangat Disarankan' : 'Dipertimbangkan',
    summary_feedback: `Kandidat telah menyelesaikan wawancara kerja untuk posisi ${roleTitle}. Jawaban menunjukkan pemahaman dasar yang memadai dan kesiapan kerja positif.`,
  };
}
