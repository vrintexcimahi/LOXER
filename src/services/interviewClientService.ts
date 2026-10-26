/**
 * LOXER AI Live Interview Client Service
 * Interacts with /api/local/interview endpoints
 */

export interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  expectedKeywords?: string[];
}

export interface InterviewTranscript {
  id: string;
  session_id: string;
  speaker: 'ai' | 'candidate';
  message: string;
  question_index: number;
  created_at: string;
}

export interface InterviewScorecard {
  id: string;
  session_id: string;
  overall_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  cultural_fit_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'Sangat Disarankan' | 'Dipertimbangkan' | 'Perlu Peningkatan';
  summary_feedback: string;
  created_at?: string;
}

export interface InterviewSession {
  id: string;
  session_code: string;
  seeker_id?: string | null;
  job_id?: string | null;
  role_title: string;
  company_name: string;
  candidate_name: string;
  candidate_email?: string;
  questions: InterviewQuestion[];
  current_question_idx: number;
  current_question: InterviewQuestion | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  completed_at?: string | null;
  transcripts?: InterviewTranscript[];
  scorecard?: InterviewScorecard | null;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token =
    localStorage.getItem('loxer_local_auth_token') ||
    localStorage.getItem('loxer_auth_token') ||
    localStorage.getItem('sb-access-token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function createInterviewSession(params: {
  role_title: string;
  company_name: string;
  candidate_name: string;
  candidate_email?: string;
  cv_summary?: string;
  candidate_skills?: string[];
  seeker_id?: string | null;
  job_id?: string | null;
}): Promise<InterviewSession> {
  const resp = await fetch('/api/local/interview/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Gagal membuat sesi wawancara (${resp.status})`);
  }

  const data = await resp.json();
  return data.session;
}

export async function getInterviewSession(codeOrId: string): Promise<InterviewSession> {
  const resp = await fetch(`/api/local/interview/session?code=${encodeURIComponent(codeOrId)}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Sesi wawancara tidak ditemukan (${resp.status})`);
  }

  const data = await resp.json();
  return data.session;
}

export async function recordInterviewTurn(params: {
  session_id: string;
  candidate_answer: string;
  question_index: number;
}): Promise<{ is_finished: boolean; next_question?: InterviewQuestion; next_question_idx?: number }> {
  const resp = await fetch('/api/local/interview/record-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Gagal merekam jawaban wawancara (${resp.status})`);
  }

  return resp.json();
}

export async function evaluateInterviewSession(sessionId: string): Promise<InterviewScorecard> {
  const resp = await fetch('/api/local/interview/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Gagal mengevaluasi wawancara (${resp.status})`);
  }

  const data = await resp.json();
  return data.scorecard;
}

export async function getInterviewHistory(seekerId?: string): Promise<InterviewSession[]> {
  const url = seekerId
    ? `/api/local/interview/history?seeker_id=${encodeURIComponent(seekerId)}`
    : '/api/local/interview/history';
  const resp = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.interviews || [];
}
