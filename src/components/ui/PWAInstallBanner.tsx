import { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const DISMISSED_KEY = 'loxer_pwa_banner_dismissed';

export default function PWAInstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';
      setIsDismissed(dismissed);
    }
  }, []);

  if (!canInstall || isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    }
  };

  const handleInstallClick = async () => {
    const success = await promptInstall();
    if (success) {
      handleDismiss();
    }
  };

  return (
    <aside
      aria-label="Promosi Pasang Aplikasi LOXER"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-subtle"
    >
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-sky-500/30 p-4 shadow-2xl text-white">
        {/* Ambient background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3.5">
          {/* Logo icon */}
          <div className="relative shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 p-0.5 shadow-lg shadow-sky-500/20">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src="/branding/icon192.png"
                alt="LOXER Icon"
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  // Fallback to Download icon if image path issue
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="text-sm font-bold text-white tracking-tight">Pasang Aplikasi LOXER</h4>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Akses cepat tanpa browser, hemat kuota &amp; lamar pekerjaan impian langsung dari layar utama HP / Desktop.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang Sekarang</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup banner pasang aplikasi"
            className="absolute top-0 right-0 p-1 text-slate-400 hover:text-white transition cursor-pointer rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
