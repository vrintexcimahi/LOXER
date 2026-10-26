import { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  CheckCircle,
  Share2,
  MoreVertical,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  actionTitle?: string;
  onClose: () => void;
}

export default function InstallAppModal({
  isOpen,
  actionTitle = 'Mendaftar & Mengakses Fitur',
  onClose,
}: InstallAppModalProps) {
  const { promptInstall } = usePWAInstall();
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [visitCount, setVisitCount] = useState(1);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = parseInt(localStorage.getItem('loxer_install_visits') || '0', 10);
        const next = stored + 1;
        localStorage.setItem('loxer_install_visits', String(next));
        setVisitCount(next);
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    // Prompt push notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }

    // 1. Coba prompt native PWA
    const success = await promptInstall();
    if (success) {
      setInstalledSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
      return;
    }

    // 2. Jika prompt native belum/tidak tersedia di browser ini
    setShowManualGuide(true);
  };

  const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-[#0c1427] border border-cyan-500/30 rounded-3xl p-5 shadow-2xl text-white text-center">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 transition cursor-pointer"
          aria-label="Tutup Popup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* App Icon Centered */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/30 mb-3.5 mt-1">
          <Smartphone className="w-7 h-7" strokeWidth={2.4} />
        </div>

        {/* Title & Concise Subtitle */}
        <h3 className="text-lg font-black text-white leading-tight">
          Pasang Aplikasi LOXER
        </h3>
        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
          Akses lowongan, melamar kerja, dan fitur <span className="text-cyan-300 font-semibold">{actionTitle}</span> lebih cepat langsung dari layar utama HP Anda.
        </p>

        {/* Micro-incentive Reward Callout */}
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-left flex items-start gap-2 text-[11px] text-cyan-200 mt-3">
          <Sparkles className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">Bonus Pasang Aplikasi:</span> Akses penuh Simulasi Wawancara AI & Review CV ATS gratis tanpa batas.
          </div>
        </div>

        {/* Re-engagement social proof on repeat visits */}
        {visitCount >= 2 && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-400/30 text-[10px] text-amber-200 mt-2 flex items-center justify-center gap-1.5 font-medium animate-fade-in">
            <span>🔥</span>
            <span>98% kandidat memasang aplikasi agar respon panggilan kerja 3x lebih cepat</span>
          </div>
        )}

        {/* Installation CTAs */}
        <div className="space-y-2.5 mt-4">
          {/* Primary 1-Click PWA Install Button */}
          <button
            type="button"
            onClick={handleInstallPwa}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Pasang Sekarang</span>
          </button>

          {/* Dismiss / Secondary Action */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Nanti Saja
          </button>

          {/* Success Notification */}
          {installedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-400/40 text-xs text-emerald-200 flex items-center justify-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Aplikasi LOXER berhasil dipasang!</span>
            </div>
          )}

          {/* Fallback Manual Guide if prompt is unavailable */}
          {showManualGuide && (
            <div className="p-3 rounded-xl bg-white/5 border border-cyan-400/30 text-[11px] text-slate-200 text-left space-y-1.5 animate-fade-in mt-2">
              <p className="font-bold text-cyan-300">Panduan Manual:</p>
              {isIos ? (
                <p className="text-slate-300">
                  Ketuk ikon <Share2 className="w-3 h-3 inline text-white" /> <strong>Bagikan</strong> di Safari, lalu pilih <strong>Tambahkan ke Layar Utama</strong>.
                </p>
              ) : (
                <p className="text-slate-300">
                  Ketuk menu <MoreVertical className="w-3 h-3 inline text-white" /> <strong>titik tiga</strong> di browser, lalu pilih <strong>Install Aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
