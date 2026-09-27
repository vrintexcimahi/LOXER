import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { applyPwaUpdate } from '../../registerSW';

export default function PwaUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setShowUpdate(true);
    };

    window.addEventListener('loxer:pwa-update-available', handleUpdate);
    return () => {
      window.removeEventListener('loxer:pwa-update-available', handleUpdate);
    };
  }, []);

  if (!showUpdate) return null;

  const handleApply = () => {
    setUpdating(true);
    setTimeout(() => {
      applyPwaUpdate();
    }, 200);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 animate-fade-up"
    >
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-white flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30">
          <Sparkles className="w-5 h-5 text-slate-950" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white tracking-tight">Pembaruan Versi LOXER</p>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            Versi terbaru LOXER sudah siap dipasang dengan peningkatan performa dan navigasi mobile.
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <button
              type="button"
              onClick={handleApply}
              disabled={updating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
              <span>{updating ? 'Memperbarui...' : 'Perbarui Sekarang'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowUpdate(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Nanti
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowUpdate(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          aria-label="Tutup notifikasi pembaruan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
