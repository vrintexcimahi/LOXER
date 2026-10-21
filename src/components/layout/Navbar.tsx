import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Share2, PlusSquare, MoreVertical, X, Smartphone } from 'lucide-react';
import AppLogo from '../ui/AppLogo';
import ThemeToggle from '../ui/ThemeToggle';
import { useAdminEasterEgg } from '../../hooks/useAdminEasterEgg';
import { useAppAccess } from '../../contexts/AppAccessContext';
import { UserRole } from '../../lib/types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function GooglePlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M3.6 1.5C3.3 1.9 3.1 2.5 3.1 3.2v17.6c0 .7.2 1.3.5 1.7l9.8-9.8L3.6 1.5z" />
      <path fill="#FBBC04" d="M16.9 9.3l-3.5 3.4 3.5 3.5 3.9-2.3c.5-.3.8-.8.8-1.4s-.3-1.1-.8-1.4l-3.9-1.8z" />
      <path fill="#EA4335" d="M13.4 12.7L3.6 22.5c.3.3.8.4 1.3.3l12-6.8-3.5-3.3z" />
      <path fill="#34A853" d="M13.4 11.3l3.5-3.4L4.9 1.2C4.4 1.1 3.9 1.2 3.6 1.5l9.8 9.8z" />
    </svg>
  );
}

function AppStoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0" style={{ flexShrink: 0 }}>
      <rect width="24" height="24" rx="5.5" fill="#007AFF" />
      <path
        d="M16.5 17.5L12 8.2l-4.5 9.3h2l.9-1.9h3.2l.9 1.9h2zm-4.5-6.5l1.1 2.5h-2.2L12 11z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export interface NavbarProps {
  onLogin?: () => void;
  onRegister?: (role?: UserRole) => void;
}

export default function Navbar({ onLogin: _onLogin }: NavbarProps) {
  const { openSecretAdminModal } = useAppAccess();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined') {
      return (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [guidePlatform, setGuidePlatform] = useState<'ios' | 'android' | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isUnlocked, handleTriggerClick } = useAdminEasterEgg({
    totalClicks: 5,
    notifyStartClick: 2,
    onUnlocked: () => {
      openSecretAdminModal();
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = e as BeforeInstallPromptEvent;
    };

    const handlePwaReady = () => {
      const globalPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (globalPrompt) {
        setInstallPrompt(globalPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
      showToast('Aplikasi LOXER PWA berhasil terpasang di perangkat Anda!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('loxer:pwa-ready', handlePwaReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('loxer:pwa-ready', handlePwaReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  const triggerInstall = async (platform: 'playstore' | 'appstore') => {
    if (typeof window === 'undefined') return;

    if (isInstalled) {
      showToast('Aplikasi LOXER PWA sudah terpasang di perangkat Anda.');
      return;
    }

    const promptEvent =
      installPrompt ||
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === 'accepted') {
          setIsInstalled(true);
          showToast('Terima kasih! LOXER PWA sedang dipasang di perangkat Anda.');
        } else {
          showToast('Pemasangan PWA dibatalkan.');
        }
        setInstallPrompt(null);
        (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
        return;
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }

    // Jika prompt native belum/tidak tersedia (misal: iOS Safari atau prompt sudah pernah di-dismiss)
    // TAMPILKAN PANDUAN PWA (BUKAN DOWNLOAD APK!)
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || platform === 'appstore';
    setGuidePlatform(isIos ? 'ios' : 'android');
  };

  return (
    <header className="loxer-pwa-header w-full bg-transparent border-0 pt-safe pb-1 px-4 select-none">
      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        <div className="w-full flex items-center justify-between py-1">
          <div className="w-9" aria-hidden="true" />

          {/* Centered Brand Logo with Admin Trigger */}
          <div
            onClick={handleTriggerClick}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            title={isUnlocked ? 'Mode Administrator Aktif' : undefined}
          >
            <AppLogo variant="navbar" height={34} textClassName="text-2xl font-black tracking-tight text-slate-900 dark:text-white" />
          </div>

          {/* Top-Right Theme Toggle (Icon Only) */}
          <div className="w-9 flex items-center justify-end">
            <ThemeToggle compact className="!rounded-full !h-8 !w-8 shadow-none border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm" />
          </div>
        </div>

        <div className="welcome-store-row">
          <button
            type="button"
            onClick={() => triggerInstall('playstore')}
            className="store-install-btn"
            aria-label="Install LOXER via Play Store"
          >
            <GooglePlayIcon />
            <span>Play Store</span>
          </button>

          <button
            type="button"
            onClick={() => triggerInstall('appstore')}
            className="store-install-btn"
            aria-label="Install LOXER via App Store"
          >
            <AppStoreIcon />
            <span>App Store</span>
          </button>
        </div>

        {isInstalled && (
          <div className="mt-2 text-center animate-fade-in">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              Aplikasi LOXER Sudah Terpasang
            </span>
          </div>
        )}

        {toastMsg && (
          <div className="mt-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 text-[11px] font-medium shadow-lg animate-fade-in text-center max-w-xs">
            {toastMsg}
          </div>
        )}

        {/* PWA Direct Installation Guide Modal (No APK) */}
        {guidePlatform && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-cyan-400/30 p-5 sm:p-6 shadow-2xl text-white">
              <button
                type="button"
                onClick={() => setGuidePlatform(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Pasang LOXER PWA</h3>
                  <p className="text-[11px] text-cyan-300">Langsung di Layar Utama HP</p>
                </div>
              </div>

              {guidePlatform === 'ios' ? (
                <div className="space-y-3 text-xs text-slate-300 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px]">1</span>
                    <p className="leading-snug">
                      Buka di browser <strong className="text-white">Safari</strong>, lalu ketuk ikon <strong className="text-cyan-300 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline" /> Bagikan (Share)</strong> di bilah bawah.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px]">2</span>
                    <p className="leading-snug">
                      Gulir ke bawah dan pilih <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Tambahkan ke Layar Utama</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px]">3</span>
                    <p className="leading-snug">
                      Ketuk <strong className="text-cyan-300">Tambah</strong> di pojok kanan atas. Ikon aplikasi LOXER akan langsung terpasang di HP Anda!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-300 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px]">1</span>
                    <p className="leading-snug">
                      Ketuk ikon menu <strong className="text-cyan-300 inline-flex items-center gap-1"><MoreVertical className="w-3.5 h-3.5 inline" /> titik tiga</strong> di pojok kanan atas browser Chrome/Edge Anda.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px]">2</span>
                    <p className="leading-snug">
                      Pilih <strong className="text-white">"Install Aplikasi"</strong> atau <strong className="text-white">"Tambahkan ke Layar Utama"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px]">3</span>
                    <p className="leading-snug">
                      Aplikasi LOXER PWA langsung terpasang cepat tanpa download file APK!
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setGuidePlatform(null)}
                className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
