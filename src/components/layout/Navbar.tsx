import { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import AppLogo from '../ui/AppLogo';
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

export default function Navbar({ onLogin }: NavbarProps) {
  const { openSecretAdminModal } = useAppAccess();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
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
        }
        setInstallPrompt(null);
        (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
        return;
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }

    if (platform === 'playstore') {
      const link = document.createElement('a');
      link.href = '/loxer.apk';
      link.download = 'LOXER-App.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Mengunduh berkas aplikasi LOXER...');
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIos) {
        showToast("Ketuk ikon Bagikan (Share) di Safari > pilih 'Tambahkan ke Layar Utama'");
      } else {
        showToast("Buka menu browser (⋮) > pilih 'Install Aplikasi' / 'Tambahkan ke Layar Utama'");
      }
    }
  };

  const handleSkip = () => {
    if (onLogin && window.location.pathname === '/login') {
      onLogin();
      return;
    }

    const mainEl = document.getElementById('main-content') || document.querySelector('main') || document.querySelector('.max-w-7xl');
    if (mainEl) {
      mainEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 320, behavior: 'smooth' });
    }
  };

  return (
    <header className="loxer-pwa-header w-full bg-[#dff0ff] dark:bg-slate-900 border-b border-sky-100 dark:border-slate-800 transition-colors pt-safe pb-4 px-4 select-none">
      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        <div className="w-full flex items-center justify-between py-2.5">
          <div className="w-14" aria-hidden="true" />

          <div
            onClick={handleTriggerClick}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            title={isUnlocked ? 'Mode Administrator Aktif' : undefined}
          >
            <AppLogo variant="navbar" height={36} textClassName="text-2xl font-black tracking-tight text-slate-900 dark:text-white" />
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="w-14 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Lewati
          </button>
        </div>

        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mt-2.5">
          <button
            type="button"
            onClick={() => triggerInstall('playstore')}
            className="flex items-center justify-center gap-2.5 min-h-[46px] px-4 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-sky-200/90 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-xs shadow-sm hover:shadow-md hover:border-sky-300 active:scale-95 transition-all cursor-pointer"
            aria-label="Install LOXER via Play Store"
          >
            <GooglePlayIcon />
            <span className="tracking-tight">Play Store</span>
          </button>

          <button
            type="button"
            onClick={() => triggerInstall('appstore')}
            className="flex items-center justify-center gap-2.5 min-h-[46px] px-4 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-sky-200/90 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-xs shadow-sm hover:shadow-md hover:border-sky-300 active:scale-95 transition-all cursor-pointer"
            aria-label="Install LOXER via App Store"
          >
            <AppStoreIcon />
            <span className="tracking-tight">App Store</span>
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
      </div>
    </header>
  );
}
