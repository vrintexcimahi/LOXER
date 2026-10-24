import { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import AppLogo from '../ui/AppLogo';
import ThemeToggle from '../ui/ThemeToggle';
import { useAdminEasterEgg } from '../../hooks/useAdminEasterEgg';
import { useAppAccess } from '../../contexts/AppAccessContext';
import { UserRole } from '../../lib/types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Store icons removed for clean header

export interface NavbarProps {
  onLogin?: () => void;
  onRegister?: (role?: UserRole) => void;
}

export default function Navbar({ onLogin: _onLogin }: NavbarProps) {
  const { openSecretAdminModal } = useAppAccess();
  const [, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined') {
      return (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null;
    }
    return null;
  });
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

  // store buttons removed for clean header

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

        {/* welcome-store-row removed for clean minimalist header */}

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
