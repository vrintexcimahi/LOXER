import { useState, useEffect } from 'react';
import { Database, Zap, ShieldCheck, CheckCircle2, X, HardDrive, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'loxer_browser_cache_consent';
const STORAGE_TIMESTAMP_KEY = 'loxer_browser_cache_timestamp';
const DISMISS_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days cooldown if dismissed

export default function BrowserCachePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGranted, setIsGranted] = useState(false);
  const [storageUsage, setStorageUsage] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has already granted or dismissed recently
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

      if (consent === 'granted') {
        return;
      }

      if (consent === 'dismissed' && timestamp) {
        const elapsed = Date.now() - parseInt(timestamp, 10);
        if (elapsed < DISMISS_COOLDOWN_MS) {
          return;
        }
      }

      // Delay prompt appearance politely after initial page interactive state
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1800);

      return () => clearTimeout(timer);
    } catch {
      // Ignore localStorage access issues in restricted sandboxes
    }
  }, []);

  // Listen to manual request to open cache settings (e.g. from footer/settings)
  useEffect(() => {
    const handleManualOpen = () => {
      setIsOpen(true);
      fetchStorageEstimate();
    };

    window.addEventListener('loxer:open-cache-settings', handleManualOpen);
    return () => {
      window.removeEventListener('loxer:open-cache-settings', handleManualOpen);
    };
  }, []);

  const fetchStorageEstimate = async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          const mb = (estimate.usage / (1024 * 1024)).toFixed(1);
          setStorageUsage(`${mb} MB`);
        }
      }
    } catch {
      // Storage estimate not supported or denied
    }
  };

  const handleGrantCache = async () => {
    setIsProcessing(true);

    try {
      // 1. Request persistent storage from browser if supported
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log('[CachePrompt] Persistent storage permission:', isPersisted ? 'granted' : 'default');
      }

      // 2. Pre-cache essential core assets if Cache API is available
      if ('caches' in window) {
        try {
          const cache = await caches.open('loxer-pwa-v1.2.0');
          await cache.addAll([
            '/',
            '/index.html',
            '/site.webmanifest',
            '/branding/icon32.png',
            '/branding/icon192.png',
          ]);
        } catch (cacheErr) {
          console.warn('[CachePrompt] Pre-caching partial assets:', cacheErr);
        }
      }

      // 3. Save consent
      localStorage.setItem(STORAGE_KEY, 'granted');
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());

      // 4. Dispatch event so other components know cache is allowed
      window.dispatchEvent(
        new CustomEvent('loxer:cache-consent-changed', {
          detail: { granted: true },
        })
      );

      setIsGranted(true);
      await fetchStorageEstimate();

      // Auto close after showing success state
      setTimeout(() => {
        setIsOpen(false);
      }, 2200);
    } catch (err) {
      console.error('[CachePrompt] Error granting cache:', err);
      // Still mark as granted so user is not stuck
      localStorage.setItem(STORAGE_KEY, 'granted');
      setIsGranted(true);
      setTimeout(() => setIsOpen(false), 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
    } catch {
      // Ignore storage errors
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Permintaan Izin Cache Browser"
      role="dialog"
      aria-modal="false"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:right-auto md:left-6 md:max-w-md z-50 animate-fade-up select-none"
    >
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl text-white">
        {/* Glow ambient accent */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          aria-label="Tutup permintaan cache"
        >
          <X className="w-4 h-4" />
        </button>

        {isGranted ? (
          <div className="flex items-center gap-3.5 py-1">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Izin Cache Browser Aktif!</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Penyimpanan lokal dioptimalkan untuk browsing super cepat dan hemat kuota data.
                {storageUsage && ` (${storageUsage} terpakai)`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Header with Icon and Badge */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30 text-slate-950">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0 pr-6">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 mb-1">
                  <Zap className="w-3 h-3 text-cyan-400" /> Akses Cepat &amp; Hemat Kuota
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                  Izinkan Cache di Browser?
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              Izinkan browser menyimpan cache halaman &amp; aset marketplace secara lokal agar aplikasi terbuka <strong className="text-cyan-300">seketika tanpa loading berulang</strong> serta menghemat kuota internet hingga 80%.
            </p>

            {/* Value bullets */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/60 border border-white/5 px-2.5 py-1.5 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Navigasi Instan</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/60 border border-white/5 px-2.5 py-1.5 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Penyimpanan Aman</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleGrantCache}
                disabled={isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengaktifkan...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Izinkan Cache Browser</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
