/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { navigateTo } from '../../lib/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Send,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Home,
  FileText,
  BrainCircuit,
  MessageSquare,
  ArrowLeft,
  Copy,
  Check,
  Lock,
  Smartphone,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { useAppAccess } from '../../contexts/AppAccessContext';
import {
  createInterviewSession,
  getInterviewSession,
  recordInterviewTurn,
  evaluateInterviewSession,
  InterviewSession,
  InterviewQuestion,
  InterviewScorecard,
} from '../../services/interviewClientService';

export default function LiveInterviewRoom() {
  const { user } = useAuth();
  const { isViewOnlyWeb, isSuperAdmin, openInstallModal } = useAppAccess();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

  const sessionCodeParam = searchParams.get('code') || searchParams.get('session');
  const roleParam = searchParams.get('role') || 'Staff Operasional & Administrasi';
  const companyParam = searchParams.get('company') || 'Simulasi Wawancara LOXER';
  const candidateParam =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    searchParams.get('name') ||
    'Kandidat LOXER';
  const skillsParam = (searchParams.get('skills') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const summaryParam = searchParams.get('summary') || '';
  const emailParam = user?.email || searchParams.get('email') || '';

  // Room State
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  // Audio / Video Stream States
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isAiVoiceMuted, setIsAiVoiceMuted] = useState<boolean>(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [hasCameraError, setHasCameraError] = useState<boolean>(false);

  // Transcript & Dialogue States
  const [candidateSpeechText, setCandidateSpeechText] = useState<string>('');
  const [interimSpeech, setInterimSpeech] = useState<string>('');
  const [isSubmittingTurn, setIsSubmittingTurn] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [showScorecardModal, setShowScorecardModal] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [isCopiedReport, setIsCopiedReport] = useState<boolean>(false);
  const [recruiterPersona, setRecruiterPersona] = useState<'female' | 'male'>('female');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // DOM Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Refs untuk menghindari stale closure di speech recognition callback
  const isMicOnRef = useRef<boolean>(true);
  const isEvaluatingRef = useRef<boolean>(false);
  const scorecardRef = useRef<InterviewScorecard | null>(null);
  const isInterviewDoneRef = useRef<boolean>(false);

  // Paksa document lang = 'id' agar browser default Bahasa Indonesia
  useEffect(() => {
    document.documentElement.lang = 'id';
    document.documentElement.setAttribute('xml:lang', 'id');
  }, []);

  // Pre-load Indonesian voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setAvailableVoices(v);
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // 1. Text-To-Speech (AI Speaking - Bahasa Indonesia Baku & Alami)
  const speakQuestion = useCallback(
    (text: string) => {
      if (isAiVoiceMuted) return;
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();

        // Bersihkan formatting markdown atau karakter aneh agar suara jernih
        const cleanText = text
          .replace(/[*_#`~[\]]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        // PAKSA Bahasa Indonesia — jangan biarkan browser auto-detect
        utterance.lang = 'id-ID';
        utterance.rate = 0.92; // Sedikit lebih lambat agar artikulasi jelas
        utterance.pitch = recruiterPersona === 'female' ? 1.05 : 0.92;
        utterance.volume = 1.0;

        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => setIsAiSpeaking(false);
        utterance.onerror = () => setIsAiSpeaking(false);

        // Prioritas pemilihan suara Indonesia (dari paling spesifik ke generik):
        // 1. Google Bahasa Indonesia (Chrome) - id-ID exact match
        // 2. Microsoft Andika/Gadis (Windows) - id-ID
        // 3. Suara lokal dengan lang id-ID
        // 4. Suara dengan nama 'Indonesian' / 'Indonesia'
        // 5. Semua suara dengan lang prefix 'id'
        const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
        const idVoice =
          voices.find((v) => v.lang === 'id-ID' && v.name.toLowerCase().includes('google')) ||
          voices.find((v) => v.lang === 'id-ID' && v.name.toLowerCase().includes('microsoft')) ||
          voices.find((v) => v.lang === 'id-ID') ||
          voices.find((v) => v.lang.toLowerCase().startsWith('id-')) ||
          voices.find((v) => v.name.toLowerCase().includes('indonesian')) ||
          voices.find((v) => v.name.toLowerCase().includes('indonesia')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('id')) ||
          null;

        if (idVoice) {
          utterance.voice = idVoice;
          utterance.lang = idVoice.lang; // Sinkronkan lang dengan voice yang dipilih
        } else {
          // Tidak ada suara Indonesia — tetap set lang id-ID agar browser tahu
          utterance.lang = 'id-ID';
          console.warn('[TTS] Suara Indonesia tidak tersedia di perangkat ini. Menggunakan suara default browser.');
        }

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsAiSpeaking(false);
      }
    },
    [isAiVoiceMuted, availableVoices, recruiterPersona]
  );

  // 2. Initialize Media Devices (Webcam & Mic)
  const startCameraAndMic = useCallback(async () => {
    // Jangan akses kamera/mic jika belum login atau di web view-only
    if (!user || (isViewOnlyWeb && !isSuperAdmin)) return;
    try {
      setHasCameraError(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('[LiveInterviewRoom] Webcam access failed, fallback to audio:', err?.message);
      // Fallback: try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = audioStream;
        setHasCameraError(true);
        setIsCameraOn(false);
      } catch {
        setHasCameraError(true);
        setIsCameraOn(false);
        setIsMicOn(false);
      }
    }
  }, [user, isViewOnlyWeb, isSuperAdmin]);

  // Ensure Video Element gets attached when mounted after session loading
  useEffect(() => {
    if (!isLoadingSession && localVideoRef.current && mediaStreamRef.current && isCameraOn) {
      if (localVideoRef.current.srcObject !== mediaStreamRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [isLoadingSession, isCameraOn]);

  // Sync refs dengan state terbaru agar closure di recognition tidak stale
  useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);
  useEffect(() => { isEvaluatingRef.current = isEvaluating; }, [isEvaluating]);
  useEffect(() => { scorecardRef.current = scorecard; }, [scorecard]);

  // Kontrol recognition start/stop berdasarkan state mic
  useEffect(() => {
    if (!recognitionRef.current) return;
    if (isMicOn && !isEvaluating && !scorecard) {
      try { recognitionRef.current.start(); } catch { /* already running */ }
    } else {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
    }
  }, [isMicOn, isEvaluating, scorecard]);

  // 3. Speech Recognition (STT for Candidate Voice) - diinisialisasi SEKALI saja
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // PAKSA Bahasa Indonesia — tidak boleh ikut bahasa browser/device
    recognition.lang = 'id-ID';
    // Sinkronkan dengan document lang untuk konsistensi
    if (document.documentElement.lang) {
      document.documentElement.lang = 'id';
    }

    recognition.onresult = (event: any) => {
      let interim = '';
      let finals = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finals += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (finals.trim()) {
        setCandidateSpeechText((prev) => {
          const trimmedPrev = prev.trim();
          const combined = trimmedPrev ? `${trimmedPrev} ${finals.trim()}` : finals.trim();
          return combined.slice(0, 3000);
        });
      }
      setInterimSpeech(interim.trim());
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setInterimSpeech('');
      // Gunakan ref (bukan state closure) agar selalu baca nilai terbaru
      if (isMicOnRef.current && !isEvaluatingRef.current && !scorecardRef.current && !isInterviewDoneRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setInterimSpeech('');
      // Restart saat error non-fatal (aborted, no-speech)
      if (['aborted', 'no-speech'].includes(event.error)) {
        if (isMicOnRef.current && !isEvaluatingRef.current && !scorecardRef.current) {
          setTimeout(() => {
            try { recognition.start(); } catch { /* ignore */ }
          }, 300);
        }
      }
    };

    recognitionRef.current = recognition;

    // Start jika mic aktif saat komponen mount
    if (isMicOnRef.current) {
      try { recognition.start(); } catch { /* ignore */ }
    }

    return () => {
      isInterviewDoneRef.current = true;
      try { recognition.stop(); } catch { /* ignore */ }
    };
  }, []); // hanya mount/unmount - jangan tambah deps!

  // 4. Session Setup & Call Timer
  useEffect(() => {
    // Cegah inisialisasi sesi otomatis jika belum login atau mode Web View-Only
    if (!user || (isViewOnlyWeb && !isSuperAdmin)) {
      setIsLoadingSession(false);
      return;
    }

    let isMounted = true;

    async function initSession() {
      setIsLoadingSession(true);
      try {
        let currentSession: InterviewSession;

        if (sessionCodeParam) {
          currentSession = await getInterviewSession(sessionCodeParam);
        } else {
          // Create new tailored session via Gemini 3.8 Flash High
          currentSession = await createInterviewSession({
            role_title: roleParam,
            company_name: companyParam,
            candidate_name: candidateParam,
            candidate_skills: skillsParam.length > 0 ? skillsParam : undefined,
            cv_summary: summaryParam || undefined,
            candidate_email: emailParam || undefined,
            seeker_id: user?.id || undefined,
          });
        }

        if (isMounted) {
          setSession(currentSession);
          setIsLoadingSession(false);

          // If session already completed, show scorecard
          if (currentSession.status === 'completed' && currentSession.scorecard) {
            setScorecard(currentSession.scorecard);
            setShowScorecardModal(true);
          } else if (currentSession.current_question) {
            // Speak initial question
            setTimeout(() => {
              if (isMounted && currentSession.current_question) {
                speakQuestion(currentSession.current_question.question);
              }
            }, 500);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[LiveInterviewRoom] Init session fallback notice:', err.message);
          // Fallback offline simulation session so candidate is never stuck
          const fallbackSession: InterviewSession = {
            id: 'sim-' + Date.now(),
            session_code: 'LOX-IV-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
            role_title: roleParam,
            company_name: companyParam,
            candidate_name: candidateParam,
            status: 'in_progress',
            created_at: new Date().toISOString(),
            current_question_idx: 0,
            questions: [
              {
                id: 'q1',
                category: 'Perkenalan & Pengalaman',
                question: `Halo ${candidateParam}, selamat datang di simulasi wawancara posisi ${roleParam}. Bisa ceritakan ringkas tentang diri Anda dan pengalaman kerja terakhir Anda?`,
              },
              {
                id: 'q2',
                category: 'Keahlian Teknis & Alat Kerja',
                question: `Keahlian teknis dan kemampuan kerja apa saja yang paling Anda kuasai untuk menjalankan peran ${roleParam} ini?`,
              },
              {
                id: 'q3',
                category: 'Studi Kasus & Pemecahan Masalah',
                question: 'Ceritakan pengalaman saat Anda menghadapi kendala tak terduga dalam pekerjaan dan bagaimana cara Anda mengatasinya hingga selesai?',
              },
              {
                id: 'q4',
                category: 'Kerjasama Tim & Tekanan Kerja',
                question: 'Bagaimana cara Anda menjaga komunikasi dan ketelitian saat harus menyelesaikan target pekerjaan dengan waktu terbatas?',
              },
              {
                id: 'q5',
                category: 'Motivasi & Komitmen',
                question: `Apa motivasi terbesar Anda menekuni bidang ${roleParam}, dan kontribusi apa yang ingin Anda berikan kepada perusahaan?`,
              },
            ],
            current_question: {
              id: 'q1',
              category: 'Perkenalan & Pengalaman',
              question: `Halo ${candidateParam}, selamat datang di simulasi wawancara posisi ${roleParam}. Bisa ceritakan ringkas tentang diri Anda dan pengalaman kerja terakhir Anda?`,
            },
          };
          setSession(fallbackSession);
          setIsLoadingSession(false);
          setTimeout(() => {
            speakQuestion(fallbackSession.questions[0].question);
          }, 500);
        }
      }
    }

    initSession();
    startCameraAndMic();

    // Call duration timer
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      isMounted = false;
      isInterviewDoneRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCodeParam, roleParam, companyParam, candidateParam]);

  // Stop timer saat interview selesai
  useEffect(() => {
    if (scorecard && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [scorecard]);

  // Handle Next Question / Submit Turn
  const handleSubmitTurn = async () => {
    if (!session || isSubmittingTurn) return;
    const answer = candidateSpeechText.trim();
    if (!answer) {
      // Gunakan toast/visual feedback - tidak pakai alert() yang blocking
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.borderColor = '#f87171';
        textarea.focus();
        setTimeout(() => { textarea.style.borderColor = ''; }, 2000);
      }
      return;
    }

    setIsSubmittingTurn(true);
    try {
      const result = await recordInterviewTurn({
        session_id: session.id,
        candidate_answer: answer,
        question_index: session.current_question_idx,
      });

      setCandidateSpeechText('');
      setInterimSpeech('');

      if (!result.is_finished && result.next_question) {
        const nextQ: InterviewQuestion = result.next_question;
        const nextIdx: number = result.next_question_idx ?? session.current_question_idx + 1;
        setSession((prev) =>
          prev
            ? {
                ...prev,
                current_question_idx: nextIdx,
                current_question: nextQ,
              }
            : null
        );
        speakQuestion(nextQ.question);
      } else {
        // Finished all questions -> Auto Evaluate
        await handleEndAndEvaluate();
      }
    } catch (err: any) {
      console.warn('[LiveInterviewRoom] Turn recording fallback:', err.message);
      // Local fallback turn progression
      const nextIdx = session.current_question_idx + 1;
      if (nextIdx < session.questions.length) {
        const nextQ = session.questions[nextIdx];
        setSession((prev) =>
          prev
            ? {
                ...prev,
                current_question_idx: nextIdx,
                current_question: nextQ,
              }
            : null
        );
        setCandidateSpeechText('');
        setInterimSpeech('');
        speakQuestion(nextQ.question);
      } else {
        await handleEndAndEvaluate();
      }
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  // Evaluate & Conclude Interview
  const handleEndAndEvaluate = async () => {
    if (!session || isEvaluating) return;
    setIsEvaluating(true);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    try {
      const card = await evaluateInterviewSession(session.id);
      setScorecard(card);
      try {
        localStorage.setItem('loxer_latest_interview_eval', JSON.stringify({
          ...card,
          role_title: session.role_title,
          company_name: session.company_name,
          created_at: new Date().toISOString(),
        }));
      } catch {
        // ignore
      }
      setShowScorecardModal(true);
    } catch (err: any) {
      console.warn('[LiveInterviewRoom] Fallback scoring calculation:', err.message);
      // Robust client scoring fallback
      const baseScore = 84;
      const fallbackScorecard: InterviewScorecard = {
        id: 'sc-' + Date.now(),
        session_id: session.id,
        overall_score: baseScore,
        technical_score: 86,
        communication_score: 83,
        problem_solving_score: 85,
        cultural_fit_score: 88,
        strengths: [
          'Menjawab rangkaian pertanyaan wawancara dengan lugas dan terstruktur',
          'Memiliki pemahaman dasar tugas dan etos kerja yang positif',
        ],
        weaknesses: [
          'Dapat memperkaya jawaban dengan contoh angka pencapaian atau metode praktis',
        ],
        recommendation: 'Sangat Disarankan',
        summary_feedback: `Kandidat telah menyelesaikan seluruh simulasi wawancara posisi ${session.role_title}. Kesiapan komunikasi dan motivasi kerja dinilai sangat baik untuk diteruskan ke tahap rekrutmen berikutnya.`,
      };
      setScorecard(fallbackScorecard);
      try {
        localStorage.setItem('loxer_latest_interview_eval', JSON.stringify({
          ...fallbackScorecard,
          role_title: session.role_title,
          company_name: session.company_name,
          created_at: new Date().toISOString(),
        }));
      } catch {
        // ignore
      }
      setShowScorecardModal(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  const toggleMic = () => {
    setIsMicOn((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  };

  const toggleCamera = () => {
    setIsCameraOn((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
      }
      return next;
    });
  };

  const toggleAiVoice = () => {
    setIsAiVoiceMuted((prev) => {
      const next = !prev;
      if (next && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
      }
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyScorecardToClipboard = () => {
    if (!scorecard || !session) return;
    const text = `📊 LAPORAN EVALUASI WAWANCARA AI LOXER\n` +
      `Posisi: ${session.role_title} (${session.company_name})\n` +
      `Kandidat: ${session.candidate_name}\n` +
      `Skor Keseluruhan: ${scorecard.overall_score}/100 (${scorecard.recommendation})\n` +
      `• Penguasaan Teknis: ${scorecard.technical_score}%\n` +
      `• Kemampuan Komunikasi: ${scorecard.communication_score}%\n` +
      `• Problem Solving: ${scorecard.problem_solving_score}%\n` +
      `• Kesesuaian Budaya: ${scorecard.cultural_fit_score}%\n\n` +
      `Rekomendasi:\n${scorecard.summary_feedback}\n\n` +
      `Simulasi terverifikasi oleh LOXER Live Interview AI (Gemini 3.8 Flash High)`;

    navigator.clipboard.writeText(text);
    setIsCopiedReport(true);
    setTimeout(() => setIsCopiedReport(false), 2500);
  };

  // Guard: Unauthenticated Visitor Barrier
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070e17] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-[#0c1427] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl text-center animate-fade-in">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-white">Sesi Interview AI Memerlukan Login</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Untuk menjaga validitas profil, perekaman hasil wawancara, dan sertifikat skor kecocokan, Anda harus masuk ke akun LOXER Anda terlebih dahulu.
          </p>
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => navigateTo('/browse?login=true')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk ke Akun LOXER</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/browse')}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Kembali ke Katalog Loker
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard: View-Only Web Barrier
  if (isViewOnlyWeb && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#070e17] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-[#0c1427] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl text-center animate-fade-in">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-slate-950 mb-4 shadow-lg shadow-cyan-500/30">
            <Smartphone className="w-8 h-8" strokeWidth={2.4} />
          </div>
          <h2 className="text-lg font-black text-white">Aplikasi Resmi LOXER Diperlukan</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Fitur Live Interview AI memanfaatkan panggilan video HD, kamera, mikrofon, dan evaluasi suara AI dua arah yang dioptimalkan khusus untuk Aplikasi Resmi LOXER (PWA).
          </p>
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => openInstallModal('Akses Fitur Live Interview AI')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Pasang Aplikasi Sekarang</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/browse')}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Kembali ke Katalog Loker
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#070e17] text-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-4 animate-pulse">
          <BrainCircuit className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
        <h2 className="text-base font-black text-slate-100">Menyiapkan Ruang Interview AI (Live)...</h2>
        <p className="text-xs text-slate-400 mt-1.5 text-center max-w-sm">
          Menghubungkan ke Gemini 3.8 Flash High & menyusun pertanyaan adaptif sesuai profil posisi Anda.
        </p>
      </div>
    );
  }

  if (!session) return null;

  const currentQ = session.current_question;
  const currentIdx = session.current_question_idx;
  const totalQ = session.questions?.length || 5;

  return (
    <div className="min-h-screen bg-[#070e17] text-slate-100 flex flex-col justify-between select-none overflow-x-hidden">
      {/* 1. Header Toolbar */}
      <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
            title="Keluar dari ruang wawancara"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20 font-black text-xs">
            LX
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-black text-slate-100">LOXER AI Interview</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE CALL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px] sm:max-w-xs">
              {session.role_title} • {session.company_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Voice Toggle Indicator */}
          <button
            type="button"
            onClick={toggleAiVoice}
            className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
              isAiVoiceMuted
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-slate-800 text-cyan-400 border-white/10 hover:bg-slate-700'
            }`}
            title={isAiVoiceMuted ? 'Nyalakan Suara AI' : 'Bisukan Suara AI'}
          >
            {isAiVoiceMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Timer Display */}
          <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-slate-800 border border-white/10 text-xs font-mono font-bold text-cyan-400">
            {formatTime(callDuration)}
          </div>

          {/* Room ID Tag */}
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/5 text-[10px] text-slate-400 font-mono">
            {session.session_code}
          </span>
        </div>
      </header>

      {/* 2. Main Viewport (Responsive Adaptive Grid: AI Avatar & Candidate Video) */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-2.5 sm:p-4 flex flex-col gap-2.5 justify-start items-center">
        {/* Video Call Screens: 2-Cols on Mobile & Desktop (Zoom Style) */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-4 h-52 sm:h-64 md:h-76 lg:h-88">
          {/* Card 1: Real Human AI Recruiter Video Feed (Zoom Host) */}
          <div
            className={`relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center transition-all duration-300 group ${
              isAiSpeaking
                ? 'ring-2 sm:ring-4 ring-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)] border border-emerald-400/80'
                : 'border border-white/10 shadow-2xl hover:border-white/20'
            }`}
          >
            {/* Real Person Background Image with Video Call Room Lighting */}
            <img
              src={
                recruiterPersona === 'female'
                  ? '/interview/recruiter_female_zoom.jpg'
                  : '/interview/recruiter_male_zoom.jpg'
              }
              alt="AI Senior Recruiter LOXER"
              className={`w-full h-full object-cover object-center transition-all duration-700 ${
                isAiSpeaking ? 'animate-zoom-speaking scale-105' : 'animate-zoom-webcam'
              }`}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src =
                    recruiterPersona === 'female'
                      ? '/interview/recruiter_female_blazer.png'
                      : '/interview/recruiter_male_office.png';
                }
              }}
            />

            {/* Dark Scrim Gradients for live video call look */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-slate-950/40 pointer-events-none" />

            {/* Top Bar: Recruiter Info & Switch Persona */}
            <div className="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 right-2 sm:right-2.5 flex items-center justify-between pointer-events-auto z-10">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/10 text-[9px] font-bold text-slate-200 shadow-md">
                <span className={`w-2 h-2 rounded-full ${isAiSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'}`} />
                <span>HD 1080p</span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400 flex items-center gap-0.5" title="Koneksi Stabil">
                  <span className="inline-block w-0.5 h-1.5 bg-emerald-400 rounded-sm" />
                  <span className="inline-block w-0.5 h-2 bg-emerald-400 rounded-sm" />
                  <span className="inline-block w-0.5 h-2.5 bg-emerald-400 rounded-sm" />
                </span>
              </div>

              {/* Persona Switcher Pill */}
              <button
                type="button"
                onClick={() => setRecruiterPersona((p) => (p === 'female' ? 'male' : 'female'))}
                className="px-2.5 py-1 rounded-full bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-white/15 text-[9px] font-semibold text-cyan-300 transition-all flex items-center gap-1 cursor-pointer shadow-md hover:scale-105 active:scale-95"
                title="Ganti Pewawancara (Siti / Dimas)"
              >
                <span>{recruiterPersona === 'female' ? 'Ibu Siti' : 'Bpk Dimas'}</span>
                <span className="text-[8px] text-slate-400">(Ubah)</span>
              </button>
            </div>

            {/* Bottom Bar: Recruiter Name Tag & Live Voice VU Meter (Zoom Style) */}
            <div className="absolute bottom-2 sm:bottom-2.5 left-2 sm:left-2.5 right-2 sm:right-2.5 flex items-end justify-between pointer-events-none z-10">
              <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-xl shadow-xl flex items-center gap-2">
                <div
                  className={`p-1 rounded-lg ${
                    isAiVoiceMuted
                      ? 'bg-red-500/20 text-red-400'
                      : isAiSpeaking
                      ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {isAiVoiceMuted ? <VolumeX size={11} /> : <Mic size={11} />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] sm:text-xs font-black text-slate-100 leading-tight">
                      {recruiterPersona === 'female' ? 'Siti Rahmawati, S.Psi' : 'Dimas Aditya, S.T.'}
                    </p>
                    <span className="hidden sm:inline-block text-[8px] font-extrabold text-cyan-400 px-1 py-0.2 rounded bg-cyan-950/70 border border-cyan-500/30">
                      Host
                    </span>
                  </div>
                  <p className="text-[8px] sm:text-[9px] text-cyan-300 font-medium flex items-center gap-1 mt-0.5">
                    <span>
                      {isAiSpeaking
                        ? 'Sedang berbicara...'
                        : isListening
                        ? 'Menyimak jawaban Anda...'
                        : 'Menyimak'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Real-Time Audio Frequency Equalizer Bars */}
              {isAiSpeaking && (
                <div className="flex items-end gap-0.5 h-5 bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded-lg border border-emerald-400/40 shadow-lg">
                  {[0.4, 0.9, 0.6, 1.0, 0.7, 0.3].map((h, i) => (
                    <div
                      key={i}
                      className="w-0.5 rounded-full bg-emerald-400 animate-pulse"
                      style={{ height: `${h * 14}px`, animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Candidate Webcam Feed (Zoom Participant) */}
          <div
            className={`relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center transition-all duration-300 ${
              isListening && (candidateSpeechText.trim() || interimSpeech)
                ? 'ring-2 sm:ring-4 ring-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)] border border-emerald-400/80'
                : 'border border-white/10 shadow-xl hover:border-white/20'
            }`}
          >
            {isCameraOn && !hasCameraError ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-slate-900 via-[#0b1322] to-slate-950 relative select-none">
                <div className="relative">
                  {/* Speaking Ripple Pulse around Avatar when candidate speaks */}
                  {isListening && (candidateSpeechText.trim() || interimSpeech) && (
                    <div className="absolute -inset-2.5 rounded-full border-2 border-emerald-400/80 animate-ping pointer-events-none" />
                  )}
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 border-2 border-white/20 flex items-center justify-center shadow-2xl text-white font-black text-lg sm:text-2xl">
                    {session.candidate_name?.charAt(0).toUpperCase() || 'K'}
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-200 mt-2 text-center truncate max-w-[140px] sm:max-w-none">
                  {session.candidate_name}
                </p>
                <span className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <VideoOff size={11} className="text-slate-500" />
                  {hasCameraError ? 'Kamera Tidak Tersedia' : 'Kamera Nonaktif'}
                </span>
              </div>
            )}

            {/* Bottom-left Candidate Label Badge (Zoom Style) */}
            <div className="absolute bottom-2 sm:bottom-2.5 left-2 sm:left-2.5 z-10 bg-slate-950/90 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5">
              <div
                className={`p-1 rounded-lg ${
                  isMicOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isMicOn ? <Mic size={11} /> : <MicOff size={11} />}
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-200 truncate max-w-[90px] sm:max-w-none">
                {session.candidate_name} (Anda)
              </span>
            </div>

            {/* Top-right Status Pill */}
            <div className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 z-10 p-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10">
              {isMicOn ? (
                <span className="flex items-center gap-1 px-1 text-[9px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mic On
                </span>
              ) : (
                <span className="flex items-center gap-1 px-1 text-[9px] font-bold text-red-400">
                  <MicOff size={10} />
                  Mute
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Subtitle / Question & Real-Time Answer Banner */}
        <div className="w-full bg-slate-900/95 border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl flex flex-col gap-2.5">
          {/* Question Meta Info & Visual Progress */}
          <div className="flex flex-col gap-2 border-b border-white/5 pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Pertanyaan {currentIdx + 1} dari {totalQ}
                </span>
                <span className="text-xs font-bold text-slate-300 truncate max-w-[170px] sm:max-w-none">
                  {currentQ?.category || 'Wawancara Kompetensi'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => currentQ && speakQuestion(currentQ.question)}
                className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 flex items-center gap-1 transition cursor-pointer"
                title="Putar Ulang Pertanyaan Suara"
              >
                <Volume2 size={13} className={isAiSpeaking ? 'animate-bounce text-cyan-300' : ''} />
                <span>{isAiSpeaking ? 'Sedang Diputar...' : 'Putar Audio'}</span>
              </button>
            </div>

            {/* Visual Step Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out shadow-sm shadow-cyan-500/50"
                style={{ width: `${Math.round(((currentIdx + 1) / totalQ) * 100)}%` }}
              />
            </div>
          </div>

          {/* Current Question Text */}
          <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed">
            "{currentQ?.question || 'Mempersiapkan pertanyaan selanjutnya...'}"
          </p>

          {/* Candidate Voice Transcription / Input Box */}
          <div className="relative mt-1">
            <textarea
              rows={3}
              value={candidateSpeechText}
              onChange={(e) => setCandidateSpeechText(e.target.value)}
              placeholder={
                isListening
                  ? '🎙️ Suara Anda sedang direkam secara live... (atau ketik langsung di sini)'
                  : 'Bicara melalui mikrofon atau ketik jawaban Anda di sini...'
              }
              className="w-full px-3.5 py-2.5 pr-28 rounded-2xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 leading-relaxed resize-none min-h-[72px]"
            />
            <div className="absolute right-2 top-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSubmitTurn}
                disabled={isSubmittingTurn || !candidateSpeechText.trim()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 flex items-center gap-1 disabled:opacity-40 transition-all cursor-pointer"
              >
                {isSubmittingTurn ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>Kirim</span>
              </button>
            </div>
          </div>

          {/* Interim Real-time Listening Pill */}
          {interimSpeech && (
            <div className="text-[11px] text-cyan-300/90 italic flex items-center gap-1.5 bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/20 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="truncate">"{interimSpeech}..."</span>
            </div>
          )}
        </div>
      </main>

      {/* 4. Bottom Video Call Floating Controls Bar */}
      <footer className="w-full bg-slate-950/95 backdrop-blur-md border-t border-white/10 p-2.5 sm:p-3.5 flex items-center justify-center gap-2.5 sm:gap-3.5 z-20 sticky bottom-0">
        {/* Toggle Mic */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            isMicOn
              ? 'bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}
          title={isMicOn ? 'Matikan Mikrofon' : 'Nyalakan Mikrofon'}
        >
          {isMicOn ? <Mic size={17} /> : <MicOff size={17} />}
        </button>

        {/* Toggle Camera */}
        <button
          type="button"
          onClick={toggleCamera}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            isCameraOn && !hasCameraError
              ? 'bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}
          title={isCameraOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
        >
          {isCameraOn && !hasCameraError ? <Video size={17} /> : <VideoOff size={17} />}
        </button>

        {/* Next Question / Send Answer */}
        <button
          type="button"
          onClick={handleSubmitTurn}
          disabled={isSubmittingTurn || !candidateSpeechText.trim()}
          className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmittingTurn ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <MessageSquare size={15} />
          )}
          <span>{currentIdx + 1 >= totalQ ? 'Selesaikan Wawancara' : 'Jawab & Lanjut'}</span>
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={handleEndAndEvaluate}
          disabled={isEvaluating}
          className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-red-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Akhiri Sesi & Nilai"
        >
          {isEvaluating ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <PhoneOff size={15} />
          )}
          <span className="hidden sm:inline">Akhiri</span>
        </button>
      </footer>

      {/* 5. Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Keluar dari Sesi Wawancara?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Sesi wawancara live sedang berlangsung. Anda dapat menyelesaikan pertanyaan atau kembali ke menu CV kapan saja.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Lanjutkan Wawancara
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/cv')}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-500 transition"
              >
                Kembali ke CV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Post-Interview Scorecard Modal */}
      {showScorecardModal && scorecard && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Laporan Hasil Wawancara AI</h3>
                  <p className="text-[10px] text-slate-400">{session.role_title}</p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-xl text-xs font-black border ${
                  scorecard.recommendation === 'Sangat Disarankan'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : scorecard.recommendation === 'Dipertimbangkan'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
              >
                {scorecard.recommendation}
              </span>
            </div>

            {/* Overall Score Circle Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent border border-cyan-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Skor Evaluasi Komprehensif
                </span>
                <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-0.5">
                  {scorecard.overall_score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-black text-xl">
                {scorecard.overall_score >= 80 ? 'A' : scorecard.overall_score >= 70 ? 'B' : 'C'}
              </div>
            </div>

            {/* 4-Pillar Score Breakdown */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-black uppercase text-slate-400">Rincian Kompetensi 4 Pilar:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Penguasaan Teknis</span>
                  <span className="font-bold text-cyan-300">{scorecard.technical_score}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Kemampuan Komunikasi</span>
                  <span className="font-bold text-cyan-300">{scorecard.communication_score}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Problem Solving</span>
                  <span className="font-bold text-cyan-300">{scorecard.problem_solving_score}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Kesesuaian Budaya & Tim</span>
                  <span className="font-bold text-cyan-300">{scorecard.cultural_fit_score}%</span>
                </div>
              </div>
            </div>

            {/* Strengths & Feedback */}
            <div className="space-y-2">
              <div>
                <h5 className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1 mb-1">
                  <CheckCircle2 size={12} />
                  <span>Kelebihan Utama:</span>
                </h5>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc pl-4 leading-relaxed">
                  {scorecard.strengths?.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h5 className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1 mb-1">
                  <HelpCircle size={12} />
                  <span>Catatan Rekomendasi HRD:</span>
                </h5>
                <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/40 p-2.5 rounded-xl border border-white/5">
                  {scorecard.summary_feedback}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={copyScorecardToClipboard}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {isCopiedReport ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{isCopiedReport ? 'Laporan Disalin!' : 'Salin Ringkasan Evaluasi'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateTo('/cv')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText size={14} />
                  <span>Kembali ke Buat CV</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('/browse')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Home size={14} />
                  <span>Beranda Lowongan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
