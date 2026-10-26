import React, { useEffect, useRef, useState, useCallback } from 'react';
import { navigateTo } from '../../lib/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  Sparkles,
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
} from 'lucide-react';
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
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

  const sessionCodeParam = searchParams.get('code') || searchParams.get('session');
  const roleParam = searchParams.get('role') || 'Staff Operasional & Administrasi';
  const companyParam = searchParams.get('company') || 'Mitra Korporat LOXER';
  const candidateParam = searchParams.get('name') || 'Kandidat LOXER';

  // Room State
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio / Video Stream States
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);

  // Transcript & Dialogue States
  const [candidateSpeechText, setCandidateSpeechText] = useState<string>('');
  const [isSubmittingTurn, setIsSubmittingTurn] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [showScorecardModal, setShowScorecardModal] = useState<boolean>(false);

  // DOM Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // 1. Text-To-Speech (AI Speaking)
  const speakQuestion = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsAiSpeaking(true);
      };
      utterance.onend = () => {
        setIsAiSpeaking(false);
      };
      utterance.onerror = () => {
        setIsAiSpeaking(false);
      };

      // Select Indonesian voice if available
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
      if (idVoice) utterance.voice = idVoice;

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsAiSpeaking(false);
    }
  }, []);

  // 2. Initialize Media Devices (Webcam & Mic)
  const startCameraAndMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('[LiveInterviewRoom] Webcam/Mic access notice:', err?.message);
      // Fallback: try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = audioStream;
      } catch {
        // Fallback to text mode
      }
    }
  }, []);

  // 3. Speech Recognition (STT for Candidate Voice)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
          setCandidateSpeechText((prev) => {
            const combined = prev ? `${prev} ${finalTranscript}` : finalTranscript;
            return combined.slice(-500); // keep reasonable buffer
          });
        }
      };

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart listening if call still active
        if (isMicOn && !isEvaluating && !scorecard) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch {
        // ignore
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [isMicOn, isEvaluating, scorecard]);

  // 4. Session Setup & Call Timer
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsLoadingSession(true);
      try {
        let currentSession: InterviewSession;

        if (sessionCodeParam) {
          currentSession = await getInterviewSession(sessionCodeParam);
        } else {
          // Create new simulated session
          currentSession = await createInterviewSession({
            role_title: roleParam,
            company_name: companyParam,
            candidate_name: candidateParam,
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
            speakQuestion(currentSession.current_question.question);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Gagal memuat sesi wawancara.');
          setIsLoadingSession(false);
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
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [sessionCodeParam, roleParam, companyParam, candidateParam, speakQuestion, startCameraAndMic]);

  // Handle Next Question / Submit Turn
  const handleSubmitTurn = async () => {
    if (!session || isSubmittingTurn) return;
    const answer = candidateSpeechText.trim();
    if (!answer) {
      alert('Silakan sampaikan atau ketik jawaban Anda terlebih dahulu.');
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
      alert(err.message || 'Gagal mengirim jawaban.');
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
      setShowScorecardModal(true);
    } catch (err: any) {
      alert(err.message || 'Evaluasi wawancara gagal.');
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-4 animate-pulse">
          <BrainCircuit className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
        <h2 className="text-base font-black text-slate-100">Menyiapkan Ruang Interview AI...</h2>
        <p className="text-xs text-slate-400 mt-1">
          Menghubungkan ke Gemini 3.8 Flash High & menyusun pertanyaan adaptif
        </p>
      </div>
    );
  }

  if (errorMessage || !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-sm font-bold text-slate-100">{errorMessage || 'Sesi tidak ditemukan'}</h2>
        <button
          type="button"
          onClick={() => navigateTo('/browse')}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950"
        >
          Kembali ke Lowongan Kerja
        </button>
      </div>
    );
  }

  const currentQ = session.current_question;
  const currentIdx = session.current_question_idx;
  const totalQ = session.questions.length || 5;

  return (
    <div className="min-h-screen bg-[#070e17] text-slate-100 flex flex-col justify-between select-none overflow-x-hidden">
      {/* 1. Header Toolbar */}
      <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20 font-black text-xs">
            LX
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-100">LOXER AI Interview</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE CALL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {session.role_title} • {session.company_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer Display */}
          <div className="px-3 py-1 rounded-xl bg-slate-800 border border-white/10 text-xs font-mono font-bold text-cyan-400">
            {formatTime(callDuration)}
          </div>
          {/* Room ID Tag */}
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/5 text-[10px] text-slate-400 font-mono">
            {session.session_code}
          </span>
        </div>
      </header>

      {/* 2. Main Video Call Viewport (Split Grid: AI Avatar & Candidate Video) */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-5 flex flex-col gap-3 justify-center items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 min-h-[380px] sm:min-h-[460px]">
          {/* Card 1: AI Interviewer Video Avatar */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 to-[#0c1827] border border-cyan-500/30 shadow-2xl flex flex-col items-center justify-center p-6 text-center">
            {/* Status Pill */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-slate-300">
              <Sparkles size={12} className="text-cyan-400" />
              <span>AI Senior Recruiter</span>
            </div>

            {/* Speaking Audio Wave Ripple Animation */}
            <div className="relative flex items-center justify-center mb-4">
              {isAiSpeaking && (
                <>
                  <div className="absolute w-36 h-36 rounded-full bg-cyan-500/20 animate-ping" />
                  <div className="absolute w-44 h-44 rounded-full bg-blue-500/10 animate-pulse" />
                </>
              )}
              {/* Avatar Monogram Frame */}
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-2xl transition-all duration-300 ${
                  isAiSpeaking ? 'scale-105 shadow-cyan-500/50' : 'scale-100'
                }`}
              >
                <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-950 flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-black bg-gradient-to-br from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                      AI
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Status Text */}
            <h3 className="text-sm font-black text-slate-100">Asesor Pewawancara LOXER</h3>
            <p className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1.5 font-semibold">
              {isAiSpeaking ? (
                <>
                  <Volume2 size={13} className="animate-bounce" />
                  <span>Sedang mengajukan pertanyaan...</span>
                </>
              ) : isListening ? (
                <span>Mendengarkan jawaban Anda...</span>
              ) : (
                <span>Menunggu tanggapan Anda...</span>
              )}
            </p>

            {/* Audio Wave Visualizer Bars */}
            <div className="flex items-center gap-1 mt-3 h-5">
              {[0.4, 0.8, 1.0, 0.6, 0.9, 0.5, 0.7].map((height, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full bg-cyan-400 transition-all duration-150 ${
                    isAiSpeaking ? 'animate-pulse' : 'opacity-40'
                  }`}
                  style={{
                    height: isAiSpeaking ? `${height * 20}px` : '4px',
                    animationDelay: `${idx * 100}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Card 2: Candidate Webcam Feed */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex items-center justify-center">
            {isCameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-slate-500">
                <VideoOff size={40} className="mb-2 text-slate-600" />
                <span className="text-xs font-bold">Kamera Dinonaktifkan</span>
              </div>
            )}

            {/* Candidate Label Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{session.candidate_name} (Anda)</span>
            </div>

            {/* Mic Status Indicator */}
            <div className="absolute top-3 right-3 p-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10">
              {isMicOn ? (
                <Mic size={14} className="text-emerald-400" />
              ) : (
                <MicOff size={14} className="text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* 3. Subtitle / Question & Real-Time Answer Banner */}
        <div className="w-full bg-slate-900/95 border border-white/10 rounded-3xl p-4 shadow-xl flex flex-col gap-3">
          {/* Question Meta Info */}
          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Pertanyaan {currentIdx + 1} dari {totalQ}
              </span>
              <span className="text-xs font-bold text-slate-300">
                {currentQ?.category || 'Wawancara Kompetensi'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => currentQ && speakQuestion(currentQ.question)}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              title="Ulangi Pertanyaan Suara"
            >
              <Volume2 size={13} />
              <span className="hidden sm:inline">Ulangi Pertanyaan</span>
            </button>
          </div>

          {/* Current Question Text */}
          <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed">
            "{currentQ?.question || 'Mempersiapkan pertanyaan selanjutnya...'}"
          </p>

          {/* Candidate Voice Transcription / Input Box */}
          <div className="relative mt-1">
            <textarea
              rows={2}
              value={candidateSpeechText}
              onChange={(e) => setCandidateSpeechText(e.target.value)}
              placeholder={
                isListening
                  ? '🎙️ Suara Anda sedang direkam secara live... (atau ketik langsung di sini)'
                  : 'Bicara melalui mic atau ketik jawaban Anda di sini...'
              }
              className="w-full px-3 py-2 pr-28 rounded-2xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 leading-relaxed resize-none"
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
        </div>
      </main>

      {/* 4. Bottom Video Call Floating Controls Bar */}
      <footer className="w-full bg-slate-950/90 backdrop-blur-md border-t border-white/10 p-3 sm:p-4 flex items-center justify-center gap-3 sm:gap-4 z-20">
        {/* Toggle Mic */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-3 rounded-2xl border transition-all ${
            isMicOn
              ? 'bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}
          title={isMicOn ? 'Matikan Mikrofon' : 'Nyalakan Mikrofon'}
        >
          {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {/* Toggle Camera */}
        <button
          type="button"
          onClick={toggleCamera}
          className={`p-3 rounded-2xl border transition-all ${
            isCameraOn
              ? 'bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}
          title={isCameraOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
        >
          {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        {/* Next Question / Send Answer */}
        <button
          type="button"
          onClick={handleSubmitTurn}
          disabled={isSubmittingTurn}
          className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmittingTurn ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <MessageSquare size={16} />
          )}
          <span>{currentIdx + 1 >= totalQ ? 'Selesaikan Wawancara' : 'Jawab & Lanjut'}</span>
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={handleEndAndEvaluate}
          disabled={isEvaluating}
          className="px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-red-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Akhiri Sesi Panggilan"
        >
          {isEvaluating ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <PhoneOff size={16} />
          )}
          <span className="hidden sm:inline">Akhiri</span>
        </button>
      </footer>

      {/* 5. Post-Interview Scorecard Modal */}
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

            {/* Strengths & Weaknesses */}
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
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo('/browse')}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Home size={14} />
                <span>Beranda Loker</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/cv')}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText size={14} />
                <span>Lihat Profil CV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
