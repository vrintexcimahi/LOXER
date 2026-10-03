import { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { TalentMarketplacePost } from '../../lib/types';
import {
  censorStrictContent,
  validateMessageSafety,
  maskPhoneNumber,
  maskEmail,
} from '../../lib/contactPrivacyService';
import { useAuth } from '../../contexts/useAuth';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'employer' | 'seeker' | 'system';
  text: string;
  timestamp: string;
  isCensored?: boolean;
  censoredViolations?: string[];
  offerDetails?: {
    positionTitle: string;
    salary: number;
    status: 'pending' | 'accepted' | 'declined';
  };
}

interface ProtectedTalentChatModalProps {
  talent: TalentMarketplacePost | null;
  isOpen: boolean;
  onClose: () => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ProtectedTalentChatModal({
  talent,
  isOpen,
  onClose,
  onToast,
}: ProtectedTalentChatModalProps) {
  const { user, userMeta } = useAuth();
  const [inputText, setInputText] = useState('');
  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showOfferDrawer, setShowOfferDrawer] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerSalary, setOfferSalary] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fullName = talent?.seeker_profiles?.full_name || talent?.headline.split(' ')[0] || 'Kandidat LOXER';
  const companyName = userMeta?.company_name || user?.email?.split('@')[0] || 'Perusahaan Terverifikasi';
  const storageKey = talent ? `loxer_chat_room_${talent.id}` : null;

  // Inisialisasi percakapan otomatis
  useEffect(() => {
    if (!isOpen || !talent || !storageKey) return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
        return;
      } catch {
        // fallback to default
      }
    }

    // Auto-generated welcome offer message
    const initialGreeting: ChatMessage = {
      id: `msg-sys-${Date.now()}`,
      senderId: 'system',
      senderName: 'Sistem Keamanan LOXER',
      senderRole: 'system',
      text: `🔒 Ruang Chat Otomatis Resmi Terbuka. Kebijakan Privasi & Sensor Ketat Shopee/LOXER Aktif. Semua transaksi, wawancara, dan penawaran kerja dilindungi garansi resmi di dalam aplikasi LOXER.`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const initialEmployerOffer: ChatMessage = {
      id: `msg-init-${Date.now()}`,
      senderId: user?.id || 'employer-active',
      senderName: companyName,
      senderRole: 'employer',
      text: `Halo ${fullName}, kami dari ${companyName} tertarik dengan keahlian Anda di posisi "${talent.headline}". Kami ingin mendiskusikan penawaran kerja sama resmi melalui aplikasi LOXER. Apakah Anda bersedia untuk tahap wawancara di platform ini?`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      offerDetails: {
        positionTitle: talent.headline,
        salary: talent.expected_salary || 3500000,
        status: 'pending',
      },
    };

    const initialList = [initialGreeting, initialEmployerOffer];
    setMessages(initialList);
    localStorage.setItem(storageKey, JSON.stringify(initialList));
    setOfferTitle(talent.headline);
    setOfferSalary(talent.expected_salary ? String(talent.expected_salary) : '3500000');
  }, [isOpen, talent, storageKey, fullName, companyName, user?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, realtimeAlert]);

  // Real-time Shopee-style safety check saat mengetik
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    const check = validateMessageSafety(val);
    setRealtimeAlert(check.alertText);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !storageKey) return;

    setIsSending(true);

    // Jalankan sensor Shopee-grade ketat
    const sensorResult = censorStrictContent(inputText);

    if (sensorResult.hasViolation) {
      onToast?.(
        'error',
        '⛔ Sensor Shopee/LOXER: Nomor kontak/email/sosmed Anda disensor otomatis demi keamanan data.'
      );
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user?.id || 'employer-active',
      senderName: companyName,
      senderRole: 'employer',
      text: sensorResult.censoredText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      isCensored: sensorResult.hasViolation,
      censoredViolations: sensorResult.violations,
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setInputText('');
    setRealtimeAlert(null);
    setIsSending(false);

    // Simulasi respon otomatis kandidat jika user employer bertanya
    setTimeout(() => {
      const candidateReply: ChatMessage = {
        id: `reply-${Date.now()}`,
        senderId: talent?.seeker_id || 'candidate-id',
        senderName: fullName,
        senderRole: 'seeker',
        text: `Terima kasih atas penawarannya Bapak/Ibu dari ${companyName}. Saya menyambut baik kesempatan ini dan siap mengikuti proses verifikasi kerja melalui LOXER. Kapan jadwal wawancara online dapat kita mulai?`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => {
        const next = [...prev, candidateReply];
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    }, 1400);
  };

  const handleCreateOffer = () => {
    if (!offerTitle.trim() || !storageKey) return;

    const offerMsg: ChatMessage = {
      id: `offer-contract-${Date.now()}`,
      senderId: user?.id || 'employer-active',
      senderName: companyName,
      senderRole: 'employer',
      text: `📄 SURAT PENAWARAN KERJA RESMI (LOXER OFFICIAL OFFER): Perusahaan mengajukan kontrak kerja untuk posisi "${offerTitle}" dengan kompensasi yang disepakati.`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      offerDetails: {
        positionTitle: offerTitle,
        salary: parseInt(offerSalary.replace(/\D/g, ''), 10) || 3500000,
        status: 'pending',
      },
    };

    const updated = [...messages, offerMsg];
    setMessages(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setShowOfferDrawer(false);
    onToast?.('success', '✨ Surat penawaran kerja resmi berhasil dikirim ke kandidat!');
  };

  if (!isOpen || !talent) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="flex flex-col h-[92vh] max-h-[760px] w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-500/40 bg-slate-900 shadow-2xl">
        {/* Header Ruang Chat */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-600/30 to-indigo-600/30">
              {talent.photo_url ? (
                <img
                  src={talent.photo_url}
                  alt={fullName}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-black text-cyan-300">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white truncate">{fullName}</h3>
                <span className="rounded-md border border-cyan-500/40 bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-cyan-300">
                  {talent.badge || 'SIAP KERJA'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{talent.headline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Sensor Shopee Aktif</span>
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title="Tutup Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Policy Banner (Shopee Standard) */}
        <div className="border-b border-white/5 bg-slate-950/40 px-4 py-2 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">
              Privasi Terjaga: Nomor WA ({maskPhoneNumber(talent.whatsapp_number)}), email (
              {maskEmail(talent.seeker_profiles?.phone)}), &amp; sosmed disensor otomatis.
            </span>
          </div>
          <button
            onClick={() => setShowOfferDrawer(!showOfferDrawer)}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline"
          >
            <DollarSign className="w-3 h-3" />
            Ajukan Tawaran Gaji
          </button>
        </div>

        {/* Quick Offer Drawer */}
        {showOfferDrawer && (
          <div className="border-b border-cyan-500/30 bg-cyan-950/40 p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Form Penawaran Kerja &amp; Kontrak Resmi
              </span>
              <button
                onClick={() => setShowOfferDrawer(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                  Posisi Lowongan yang Ditawarkan
                </label>
                <input
                  type="text"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder="Contoh: Barista & Kasir Purna Waktu"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                  Besaran Gaji / Tarif Penawaran (Rp)
                </label>
                <input
                  type="number"
                  value={offerSalary}
                  onChange={(e) => setOfferSalary(e.target.value)}
                  placeholder="Contoh: 4000000"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCreateOffer}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Kirim Surat Penawaran ke Ruang Chat
              </button>
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-900/50">
          {messages.map((msg) => {
            if (msg.senderRole === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-950/40 px-4 py-2 text-center text-[11px] text-cyan-200/90 shadow-sm max-w-md">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            const isMe = msg.senderRole === 'employer';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                  <span className="font-bold text-slate-300">{msg.senderName}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Offer Card Bubble */}
                {msg.offerDetails ? (
                  <div className="max-w-md rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-900 p-4 shadow-xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                        <Briefcase className="w-3.5 h-3.5" />
                        Penawaran Kerja Resmi
                      </span>
                      <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                        {msg.offerDetails.status === 'pending' ? 'Menunggu Konfirmasi' : 'Diterima'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        {msg.offerDetails.positionTitle}
                      </h4>
                      <p className="text-xs font-black text-cyan-300 mt-1">
                        Rp {msg.offerDetails.salary.toLocaleString('id-ID')} / bulan
                      </p>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{msg.text}</p>

                    <div className="flex items-center gap-1.5 pt-1 text-[10px] text-emerald-200/80">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Terproteksi Kontrak Kerja &amp; Pembayaran LOXER</span>
                    </div>
                  </div>
                ) : (
                  /* Standard Chat Bubble */
                  <div
                    className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-md ${
                      isMe
                        ? 'bg-cyan-600 text-white rounded-br-none border border-cyan-400/30'
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Badge Peringatan Sensor jika terdeteksi pelanggaran */}
                    {msg.isCensored && (
                      <div className="mt-2 flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-950/60 p-1.5 text-[10px] text-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Kontak pribadi disensor otomatis sesuai Kebijakan Shopee/LOXER.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Real-time Typing Alert Banner (Shopee Style) */}
        {realtimeAlert && (
          <div className="border-t border-amber-500/30 bg-amber-950/60 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-200 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{realtimeAlert}</span>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="border-t border-white/10 bg-slate-950 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOfferDrawer(!showOfferDrawer)}
              className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900 hover:bg-slate-800 p-2.5 text-cyan-400 transition"
              title="Ajukan Tawaran Kontrak / Gaji"
            >
              <Calendar className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Ketik pesan penawaran / jadwal wawancara di sini..."
              className="flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 disabled:opacity-40 p-2.5 text-slate-950 font-bold shadow-md shadow-cyan-500/20 transition cursor-pointer"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-500">
            <span>💡 Tips: Gunakan chat LOXER untuk menjadwalkan interview dan negosiasi aman.</span>
            <span className="font-semibold text-cyan-400/80">Sensor Kontak Ketat 🛡️</span>
          </div>
        </form>
      </div>
    </div>
  );
}
