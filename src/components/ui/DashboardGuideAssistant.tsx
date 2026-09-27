import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Send,
  MessageSquare,
  Sparkles,
  X,
  BookOpenText,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  GripHorizontal
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';

export interface DashboardGuideAssistantItem {
  id: string;
  label: string;
  description: string;
  href: string;
  summary: string;
  detailFunctions: string[];
  usageTips: string[];
  actionLabel?: string;
}

interface DashboardGuideAssistantProps {
  workspaceLabel: string;
  workspaceDescription: string;
  storageKey: string;
  currentGuideId?: string;
  guides: DashboardGuideAssistantItem[];
}

function readStoredGuide(storageKey: string) {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}

interface StoredPosition {
  x: number;
  y: number;
}

function readStoredPosition(): StoredPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('loxer_widget_pos');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback to default
  }
  return null;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  time: string;
}

const AI_PRESET_QUESTIONS = [
  'Bagaimana cara tawar kerja langsung di Marketplace?',
  'Bagaimana cara verifikasi profil akun saya?',
  'Apa keuntungan fitur Marketplace Pencari Kerja?',
  'Tips agar lamaran kerja cepat direspons HRD?',
];

export default function DashboardGuideAssistant({
  workspaceLabel,
  workspaceDescription,
  storageKey,
  currentGuideId,
  guides,
}: DashboardGuideAssistantProps) {
  const { user, userMeta } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bug' | 'ai' | 'guide' | 'feedback'>('bug');
  const [selectedGuideId, setSelectedGuideId] = useState(() => readStoredGuide(storageKey));

  // Draggable positioning state
  const [position, setPosition] = useState<StoredPosition | null>(() => readStoredPosition());
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  });

  // Bug Report Form State
  const [bugCategory, setBugCategory] = useState('Tampilan / UI Rusak');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugSuccess, setBugSuccess] = useState(false);
  const [bugError, setBugError] = useState('');

  // AI Chat State
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Halo! Saya LOXER AI Assistant. Ada kendala teknis atau pertanyaan seputar fitur rekrutmen dan marketplace yang bisa saya bantu?',
      time: 'Baru saja',
    },
  ]);

  // Feedback State
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Initialize Position on mount if not stored
  useEffect(() => {
    if (!position && typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      setPosition({
        x: Math.max(16, window.innerWidth - (isMobile ? 64 : 76)),
        y: Math.max(70, window.innerHeight - (isMobile ? 120 : 96)),
      });
    }
  }, [position]);

  const selectedGuide = useMemo(() => {
    return (
      guides.find((guide) => guide.id === selectedGuideId) ||
      guides.find((guide) => guide.id === currentGuideId) ||
      guides[0]
    );
  }, [currentGuideId, guides, selectedGuideId]);

  useEffect(() => {
    if (!selectedGuide && guides[0]) {
      setSelectedGuideId(guides[0].id);
      return;
    }
    if (selectedGuide?.id && selectedGuide.id !== selectedGuideId) {
      setSelectedGuideId(selectedGuide.id);
    }
  }, [guides, selectedGuide, selectedGuideId]);

  useEffect(() => {
    if (!selectedGuideId || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, selectedGuideId);
    } catch {
      // ignore
    }
  }, [selectedGuideId, storageKey]);

  // Close on Outside Click or Escape
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Window Resize Boundary Check
  useEffect(() => {
    function handleResize() {
      if (!position) return;
      const maxX = Math.max(16, window.innerWidth - 64);
      const maxY = Math.max(64, window.innerHeight - 64);
      if (position.x > maxX || position.y > maxY) {
        setPosition({
          x: Math.min(position.x, maxX),
          y: Math.min(position.y, maxY),
        });
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // ---------------------------------------------------------------------------
  // Drag Handlers (Mouse & Touch)
  // ---------------------------------------------------------------------------
  const handleDragStart = (clientX: number, clientY: number) => {
    const curX = position ? position.x : window.innerWidth - 68;
    const curY = position ? position.y : window.innerHeight - 100;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: curX,
      initialY: curY,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.startX;
    const dy = clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > 5) {
      dragStartRef.current.moved = true;
    }

    const nextX = Math.max(12, Math.min(window.innerWidth - 56, dragStartRef.current.initialX + dx));
    const nextY = Math.max(50, Math.min(window.innerHeight - 64, dragStartRef.current.initialY + dy));

    setPosition({ x: nextX, y: nextY });
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragStartRef.current.moved) {
      // Was a drag -> save position
      if (position) {
        try {
          window.localStorage.setItem('loxer_widget_pos', JSON.stringify(position));
        } catch {
          // ignore
        }
      }
    } else {
      // Was a tap/click -> toggle open
      setOpen((prev) => !prev);
    }
  };

  // Mouse Listeners
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    handleDragStart(e.clientX, e.clientY);

    const onMouseMove = (moveEv: MouseEvent) => {
      handleDragMove(moveEv.clientX, moveEv.clientY);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      handleDragEnd();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Touch Listeners
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    handleDragStart(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    handleDragMove(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  // ---------------------------------------------------------------------------
  // Bug Report Submission
  // ---------------------------------------------------------------------------
  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugDescription.trim()) {
      setBugError('Mohon tuliskan deskripsi kendala.');
      return;
    }

    setBugSubmitting(true);
    setBugError('');

    try {
      const bugId = `BUG-${Date.now().toString(36).toUpperCase()}`;
      const payload = {
        id: bugId,
        user_id: user?.id || 'guest',
        event_type: 'user_bug_report',
        route: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
        metadata: JSON.stringify({
          category: bugCategory,
          description: bugDescription,
          reported_by: user?.email || 'Tamu / Pengguna',
          role: userMeta?.role || 'visitor',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          created_at: new Date().toISOString(),
        }),
        created_at: new Date().toISOString(),
      };

      await supabase.from('user_activity_logs').insert([payload]);

      setBugSuccess(true);
      setBugDescription('');
      setTimeout(() => setBugSuccess(false), 5000);
    } catch {
      setBugError('Gagal mengirimkan laporan. Silakan coba lagi.');
    } finally {
      setBugSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LOXER AI Assistant Responses
  // ---------------------------------------------------------------------------
  const handleSendAi = (customQuery?: string) => {
    const q = (customQuery || aiInput).trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: q,
      time: 'Baru saja',
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);

    setTimeout(() => {
      let reply = 'Terima kasih atas pertanyaannya! Tim LOXER selalu siap membantu Anda mendapatkan karir dan kandidat terbaik.';
      const lower = q.toLowerCase();

      if (lower.includes('tawar kerja') || lower.includes('marketplace') || lower.includes('reverse')) {
        reply = 'Di Marketplace LOXER, perusahaan dapat langsung mencari profil talent siap kerja melalui menu "Cari Talent" (/talents), lalu klik tombol "Tawar Kerja" untuk mengirimkan penawaran resmi beserta nominal gaji dan deskripsi proyek. Semua transaksi diawasi sistem demi keamanan Anda!';
      } else if (lower.includes('verifikasi') || lower.includes('akun') || lower.includes('badge')) {
        reply = 'Untuk mendapatkan badge Terverifikasi (Shield Check) atau TOP TALENT, lengkapi profil di menu Profil Saya (data pendidikan, pengalaman kerja, dan minimal 3 keahlian). Tim kurasi LOXER akan memvalidasi data Anda dalam 1x24 jam.';
      } else if (lower.includes('keuntungan') || lower.includes('fitur')) {
        reply = 'Keuntungan LOXER: (1) Reverse Hiring - pencari kerja bisa ditemukan perusahaan secara langsung, (2) Perlindungan transaksi & kontrak resmi, (3) Agregator lowongan kerja terpercaya dari berbagai mitra resmi, (4) Notifikasi real-time via platform.';
      } else if (lower.includes('tips') || lower.includes('lamaran') || lower.includes('interview')) {
        reply = 'Tips sukses: Cantumkan portofolio aktif (GitHub, Behance, dsb), cantumkan keahlian spesifik pada headline, dan aktifkan status tayang di Marketplace Pencari Kerja agar profil Anda dapat dicari oleh ratusan perusahaan.';
      } else if (lower.includes('bug') || lower.includes('eror') || lower.includes('rusak')) {
        reply = 'Jika Anda menemukan kendala tampilan atau fungsi, Anda dapat beralih ke tab "Lapor Eror / Bug" di widget ini. Tim teknis LOXER akan langsung menerima log dan menindaklanjutinya secepatnya!';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: reply,
          time: 'Baru saja',
        },
      ]);
      setAiLoading(false);
    }, 600);
  };

  // ---------------------------------------------------------------------------
  // Feedback Submission
  // ---------------------------------------------------------------------------
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    try {
      await supabase.from('user_activity_logs').insert([
        {
          id: `FEEDBACK-${Date.now().toString(36).toUpperCase()}`,
          user_id: user?.id || 'guest',
          event_type: 'user_feedback',
          route: window.location.pathname,
          metadata: JSON.stringify({
            feedback: feedbackText,
            user: user?.email || 'Tamu',
            date: new Date().toISOString(),
          }),
          created_at: new Date().toISOString(),
        },
      ]);
      setFeedbackSuccess(true);
      setFeedbackText('');
      setTimeout(() => setFeedbackSuccess(false), 4000);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* ---------------------------------------------------------------------- */}
      {/* Draggable Compact Floating Button (Logo LOXER & Efek Geser Posisi)    */}
      {/* ---------------------------------------------------------------------- */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: position ? `${position.x}px` : undefined,
          top: position ? `${position.y}px` : undefined,
          zIndex: 130,
        }}
        className="select-none touch-none"
      >
        <button
          ref={dragRef}
          type="button"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          title="Geser posisi atau klik untuk Bantuan & LOXER AI"
          className={`group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-cyan-400/40 bg-slate-950/90 p-1.5 shadow-xl shadow-cyan-500/25 backdrop-blur-md transition-transform duration-150 hover:scale-105 active:scale-95 ${
            isDragging ? 'cursor-grabbing scale-105 ring-2 ring-cyan-400' : 'cursor-grab'
          }`}
          aria-label="Pusat Bantuan LOXER"
        >
          {/* LOXER Logo Image */}
          <img
            src="/branding/icon64.png"
            alt="LOXER"
            className="h-full w-full object-contain rounded-full drop-shadow pointer-events-none group-hover:rotate-6 transition-transform"
          />

          {/* Pulse Status Ping */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500 border border-slate-950" />
          </span>

          {/* Tiny Drag Handle Indicator */}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripHorizontal className="w-3 h-3 text-cyan-300 drop-shadow" />
          </span>
        </button>

        {/* ------------------------------------------------------------------ */}
        {/* Main Popup Modal (Pusat Bantuan, Laporan Eror/Bug & LOXER AI)     */}
        {/* ------------------------------------------------------------------ */}
        {open && (
          <div
            className={`fixed z-[140] w-[min(420px,calc(100vw-1.5rem))] max-h-[85vh] overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950/95 p-4 sm:p-5 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl text-slate-100 animate-fade-in flex flex-col ${
              position && position.x < window.innerWidth / 2
                ? 'left-4 sm:left-6 bottom-20 sm:bottom-24'
                : 'right-4 sm:right-6 bottom-20 sm:bottom-24'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-1 flex items-center justify-center shadow-md">
                  <img src="/branding/icon64.png" alt="LOXER" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    Pusat Bantuan &amp; AI
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      LOXER
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[210px]" title={workspaceDescription}>
                    {workspaceLabel} • {workspaceDescription}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-white/10 py-2.5 overflow-x-auto scrollbar-none text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('bug')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === 'bug'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Lapor Eror / Bug
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === 'ai'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Tanya LOXER AI
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === 'guide'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <BookOpenText className="w-3.5 h-3.5 text-indigo-400" />
                Panduan
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('feedback')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === 'feedback'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Saran
              </button>
            </div>

            {/* Tab Contents (Scrollable Container) */}
            <div className="flex-1 overflow-y-auto pt-3 pb-1 space-y-4 max-h-[50vh] pr-1">
              {/* TAB 1: LAPOR EROR / BUG */}
              {activeTab === 'bug' && (
                <form onSubmit={handleSubmitBug} className="space-y-3 animate-fade-in text-xs">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-rose-300 text-[11px] leading-relaxed">
                    <span className="font-bold block mb-0.5">🚨 Laporkan Masalah atau Bug Sistem</span>
                    Tim pengembang LOXER memantau laporan ini secara langsung untuk memastikan kenyamanan transaksi Anda.
                  </div>

                  {bugSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Laporan berhasil dikirim! Tim teknis LOXER akan segera menganalisis kendala ini.</span>
                    </div>
                  )}

                  {bugError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      {bugError}
                    </div>
                  )}

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Kategori Masalah
                    </label>
                    <select
                      value={bugCategory}
                      onChange={(e) => setBugCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-rose-400"
                    >
                      <option value="Tampilan / UI Rusak">Tampilan / UI Rusak atau Terpotong</option>
                      <option value="Gagal Lamar / Post Lowongan">Gagal Lamar Pekerjaan / Post Lowongan</option>
                      <option value="Kendala Marketplace Talent">Kendala Marketplace Talent &amp; Penawaran</option>
                      <option value="Autentikasi & Akun">Autentikasi, Login, atau Profil Akun</option>
                      <option value="Performa Lambat / Eror 500">Performa Lambat / Muncul Notifikasi Eror</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Deskripsi Kendala yang Dialami *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={bugDescription}
                      onChange={(e) => setBugDescription(e.target.value)}
                      placeholder="Jelaskan tombol mana yang diklik, apa yang terjadi, atau pesan error yang muncul..."
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none text-xs"
                    />
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Halaman: {typeof window !== 'undefined' ? window.location.pathname : '/'}</span>
                    <span>Pelapor: {user?.email ? user.email.slice(0, 15) + '...' : 'Tamu'}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={bugSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {bugSubmitting ? 'Mengirim Laporan...' : 'Kirim Laporan ke Tim Teknis'}
                  </button>
                </form>
              )}

              {/* TAB 2: TANYA LOXER AI */}
              {activeTab === 'ai' && (
                <div className="space-y-3 animate-fade-in flex flex-col">
                  {/* Preset Question Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {AI_PRESET_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendAi(q)}
                        className="text-[10px] font-medium px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-900/50 transition-colors text-left"
                      >
                        ⚡ {q}
                      </button>
                    ))}
                  </div>

                  {/* Chat Messages Log */}
                  <div className="space-y-2 rounded-2xl bg-slate-900/80 p-3 max-h-48 overflow-y-auto border border-white/5">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-2.5 text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-cyan-600 text-white rounded-br-none'
                              : 'bg-slate-800 text-slate-200 border border-white/5 rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.time}</span>
                      </div>
                    ))}

                    {aiLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>LOXER AI sedang mengetik...</span>
                      </div>
                    )}
                  </div>

                  {/* Input Box */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendAi();
                        }
                      }}
                      placeholder="Ketik pertanyaan untuk LOXER AI..."
                      className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendAi()}
                      className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                      title="Kirim Pertanyaan"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: SARAN & MASUKAN */}
              {activeTab === 'feedback' && (
                <form onSubmit={handleSubmitFeedback} className="space-y-3 animate-fade-in text-xs">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-300 text-[11px] leading-relaxed">
                    <span className="font-bold block mb-0.5">💡 Suara Anda Membangun LOXER</span>
                    Punya ide fitur baru atau saran tampilan agar LOXER semakin nyaman digunakan? Tuliskan di sini!
                  </div>

                  {feedbackSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Terima kasih! Masukan Anda telah kami catat untuk rilis mendatang.</span>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Saran &amp; Masukan Anda
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Contoh: Tambahkan filter kisaran gaji di marketplace, atau fitur simpan lowongan favorit..."
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kirim Masukan
                  </button>
                </form>
              )}

              {/* TAB 4: PANDUAN MENU WORKSPACE (Preserved Guides) */}
              {activeTab === 'guide' && (
                <div className="space-y-3 animate-fade-in text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Pilih menu panduan</label>
                    <select
                      value={selectedGuide.id}
                      onChange={(event) => setSelectedGuideId(event.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-indigo-400"
                    >
                      {guides.map((guide) => (
                        <option key={guide.id} value={guide.id}>
                          {guide.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Ringkasan Fungsi</p>
                    <p className="mt-1 text-sm font-bold text-white">{selectedGuide.label}</p>
                    <p className="mt-1 text-slate-300 leading-relaxed text-[11px]">{selectedGuide.summary}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
                      <BookOpenText className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Fungsi Detail</span>
                    </div>
                    {selectedGuide.detailFunctions.map((item, idx) => (
                      <div key={idx} className="rounded-lg bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300">
                        • {item}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-2.5 border border-white/10">
                    <span className="text-[11px] text-slate-300 truncate">Akses Cepat Halaman</span>
                    <a
                      href={selectedGuide.href}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                    >
                      {selectedGuide.actionLabel || 'Buka'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Information */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-cyan-400" />
                <span>Geser posisi icon untuk memindahkan</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const defaultPos = {
                    x: Math.max(16, window.innerWidth - 68),
                    y: Math.max(70, window.innerHeight - 100),
                  };
                  setPosition(defaultPos);
                  try {
                    window.localStorage.removeItem('loxer_widget_pos');
                  } catch {
                    // ignore
                  }
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                title="Reset posisi icon ke pojok kanan bawah"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Posisi
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
