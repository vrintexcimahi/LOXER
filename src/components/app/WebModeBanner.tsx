import { useState, useEffect } from 'react';
import { Smartphone, X, Eye } from 'lucide-react';
import { useAppAccess } from '../../contexts/AppAccessContext';
import { HIDE_INSTALL_BANNER_KEY } from '../../lib/appAccessService';

export default function WebModeBanner() {
  const { isViewOnlyWeb, openInstallModal } = useAppAccess();
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [minimized, setMinimized] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(HIDE_INSTALL_BANNER_KEY) === 'true';
      setIsDismissed(dismissed);
    }
  }, []);

  // Suppress completely if running in App, Super Admin, or user permanently dismissed
  if (!isViewOnlyWeb || isDismissed) return null;

  const handlePermanentClose = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(HIDE_INSTALL_BANNER_KEY, 'true');
    } catch {
      // ignore
    }
  };

  if (minimized) {
    return (
      <aside aria-label="Notifikasi Mode Web" className="fixed bottom-20 md:bottom-6 right-4 z-40 animate-fade-in">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-cyan-500 text-slate-950 font-bold text-xs shadow-xl shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>Mode Web (View Only)</span>
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Notifikasi Mode Web" className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-fade-up">
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/95 border border-cyan-400/40 backdrop-blur-xl shadow-2xl shadow-sky-950/60 text-white flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-white">Mode Web: View-Only</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                APK Android Wajib
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight mt-1 truncate sm:whitespace-normal">
              Melamar loker, chat penjual, &amp; daftar akun wajib melalui Aplikasi Resmi APK.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => openInstallModal('Melamar, Chat & Mendaftar')}
            className="relative overflow-hidden px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 text-xs font-extrabold shadow-md shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap group"
          >
            <span className="absolute inset-0 w-1/2 h-full bg-white/30 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 pointer-events-none" />
            Download APK
          </button>
          <button
            type="button"
            onClick={handlePermanentClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Sembunyikan permanen"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
