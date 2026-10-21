import { useState } from 'react';
import {
  X,
  Smartphone,
  Zap,
  CheckCircle,
  Sparkles,
  Lock,
  PlusSquare,
  Share2,
  MoreVertical,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  actionTitle?: string;
  onClose: () => void;
  onOpenSecretAdmin?: () => void;
}

export default function InstallAppModal({
  isOpen,
  actionTitle = 'Mendaftar & Mengakses Fitur',
  onClose,
  onOpenSecretAdmin,
}: InstallAppModalProps) {
  const { promptInstall } = usePWAInstall();
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-[#0c1427] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] my-6 text-white">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 transition cursor-pointer"
          aria-label="Tutup Popup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Smartphone className="w-3.5 h-3.5" />
            Aplikasi Resmi LOXER (PWA)
          </div>
          <span className="text-xs text-slate-400">Instalasi Instan 1-Klik</span>
        </div>

        {/* Title & App Icon */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/30 shrink-0">
            <Smartphone className="w-6 h-6" strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
              Pasang LOXER ke Layar Utama Ponsel Anda
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Untuk mengakses fitur <strong className="text-cyan-300 font-semibold">{actionTitle}</strong>, mendaftar akun, dan melamar lowongan, pasang aplikasi <strong>LOXER PWA</strong> langsung ke HP Anda.
            </p>
          </div>
        </div>

        {/* Why App is Required (Highlight Grid) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-4">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-[11px] font-bold">Lamar 1-Klik</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Lamar lowongan seketika langsung dari layar utama ponsel.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-[11px] font-bold">Resmi &amp; Terverifikasi</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Terhubung langsung dengan hiring manager perusahaan terverifikasi.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-sky-400 mb-1">
              <Smartphone className="w-4 h-4" />
              <span className="text-[11px] font-bold">Akses Offline Cepat</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Membuka katalog kerja instan tanpa jeda loading berat.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-[11px] font-bold">Instalasi Bersih</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Tanpa file APK, aman, hemat memori, dan bebas update manual.
            </p>
          </div>
        </div>

        {/* Installation CTAs */}
        <div className="space-y-3 mt-5">
          {/* Primary 1-Click PWA Install Button */}
          <button
            type="button"
            onClick={handleInstallPwa}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-500/30 active:scale-[0.98] transition cursor-pointer"
          >
            <Smartphone className="w-5 h-5" />
            <span>Pasang Aplikasi LOXER Sekarang</span>
          </button>

          {/* Success Notification */}
          {installedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-400/40 text-xs text-emerald-200 flex items-center gap-2.5 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Aplikasi LOXER PWA berhasil dipasang di layar utama!</span>
            </div>
          )}

          {/* Fallback Manual Guide if prompt is unavailable */}
          {showManualGuide && (
            <div className="p-4 rounded-2xl bg-white/5 border border-cyan-400/30 text-xs text-slate-200 space-y-2 animate-fade-in">
              <p className="font-bold text-cyan-300">Cara Memasang Langsung ke HP:</p>
              {isIos ? (
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Ketuk ikon <strong className="text-white inline-flex items-center gap-1"><Share2 className="w-3 h-3 inline" /> Bagikan</strong> di Safari.</li>
                  <li>Pilih menu <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3 h-3 inline" /> Tambahkan ke Layar Utama</strong>.</li>
                  <li>Ketuk <strong className="text-cyan-300">Tambah</strong> di pojok kanan atas. Selesai!</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Ketuk menu <strong className="text-white inline-flex items-center gap-1"><MoreVertical className="w-3 h-3 inline" /> titik tiga</strong> di pojok kanan atas browser.</li>
                  <li>Pilih <strong className="text-white">"Install Aplikasi"</strong> atau <strong className="text-white">"Tambahkan ke Layar Utama"</strong>.</li>
                  <li>Ikon aplikasi LOXER langsung tampil di layar HP Anda.</li>
                </ol>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-white/10 text-xs text-slate-400">
          <button
            type="button"
            onClick={onClose}
            className="hover:text-slate-200 transition underline underline-offset-4 cursor-pointer"
          >
            Tetap di Web (Mode View-Only)
          </button>

          {/* Secret Backdoor for Super Admin */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSecretAdmin?.();
            }}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-cyan-400 transition text-[11px] cursor-pointer"
            title="Akses Rahasia Khusus Super Administrator"
          >
            <Lock className="w-3 h-3" />
            <span>Akses Rahasia Super Admin</span>
          </button>
        </div>

      </div>
    </div>
  );
}
