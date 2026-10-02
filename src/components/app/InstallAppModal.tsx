import { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  Zap,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  Lock,
} from 'lucide-react';

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
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const handleDownloadApk = () => {
    setDownloadStarted(true);
    // Trigger download of official release APK
    const link = document.createElement('a');
    link.href = '/downloads/loxer-app.apk';
    link.setAttribute('download', 'loxer-app.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            Aplikasi Resmi Android (APK)
          </div>
          <span className="text-xs text-slate-400">Web Browser Hanya View-Only</span>
        </div>

        {/* Title & App Icon */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/30 shrink-0">
            <Smartphone className="w-6 h-6" strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
              Gunakan Aplikasi Mobile APK untuk Akses Penuh
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Untuk mengakses fitur <strong className="text-cyan-300 font-semibold">{actionTitle}</strong>, mendaftar akun, dan melamar lowongan, wajib menggunakan <strong>Aplikasi Resmi Android LOXER (APK)</strong>.
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
              Lamar pekerjaan instan langsung dari ponsel Android.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-[11px] font-bold">Chat &amp; Beli Aman</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Kontak WhatsApp penjual &amp; rekrutmen terverifikasi resmi.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-sky-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[11px] font-bold">Data Terenkripsi</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Perlindungan privasi data profil &amp; kredensial pengguna.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-[11px] font-bold">Sangat Ringan</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Hanya 1.6 MB, hemat kuota dan responsif di smartphone.
            </p>
          </div>
        </div>

        {/* Download & Installation CTAs */}
        <div className="space-y-3 mt-5">
          {/* Primary APK Download Button */}
          <button
            type="button"
            onClick={handleDownloadApk}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-500/30 active:scale-[0.98] transition cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>Download APK Resmi Android (1.6 MB)</span>
          </button>

          {/* Download Notification Alert */}
          {downloadStarted && (
            <div className="p-3.5 rounded-xl bg-cyan-950/70 border border-cyan-400/40 text-xs text-cyan-200 flex items-start gap-2.5 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">File APK sedang diunduh!</span>
                Buka file <strong className="text-cyan-300">loxer-app.apk</strong> di smartphone Android Anda, izinkan instalasi sumber ini jika diminta, lalu buka aplikasi untuk akses penuh tanpa batas.
              </div>
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
