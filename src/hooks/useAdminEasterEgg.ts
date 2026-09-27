import { useState, useCallback, useEffect } from 'react';

export interface UseAdminEasterEggOptions {
  totalClicks?: number;
  notifyStartClick?: number;
  onNotify?: (message: string, type: 'info' | 'success') => void;
  onUnlocked?: () => void;
}

export function useAdminEasterEgg({
  totalClicks = 15,
  notifyStartClick = 6,
  onNotify,
  onUnlocked,
}: UseAdminEasterEggOptions = {}) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      return (
        params.get('role') === 'admin' ||
        params.get('preview_role') === 'admin' ||
        params.get('dev') === 'admin' ||
        params.get('mode') === 'god' ||
        hash.includes('admin') ||
        sessionStorage.getItem('loxer_admin_unlocked') === 'true' ||
        sessionStorage.getItem('app_admin_unlocked') === 'true'
      );
    } catch {
      return false;
    }
  });

  const [clickCount, setClickCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  // Auto-dismiss toast timer
  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => {
      setToastVisible(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toastVisible, toastMessage]);

  const showInternalToast = useCallback((msg: string, type: 'info' | 'success') => {
    setToastMessage(msg);
    setToastVisible(true);
    if (onNotify) {
      onNotify(msg, type);
    }
  }, [onNotify]);

  const handleTriggerClick = useCallback((e?: React.MouseEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      // Optional: keep click scoped if needed
    }

    if (isUnlocked) {
      showInternalToast('⚡ Mode Administrator sudah aktif.', 'info');
      return;
    }

    setClickCount((prev) => {
      const next = prev + 1;

      if (next >= totalClicks) {
        setIsUnlocked(true);
        try {
          sessionStorage.setItem('loxer_admin_unlocked', 'true');
          sessionStorage.setItem('app_admin_unlocked', 'true');
        } catch {
          // ignore session storage error
        }

        const successMsg = '🎉 Mode Developer & Akses Admin Terbuka!';
        showInternalToast(successMsg, 'success');
        if (onUnlocked) {
          onUnlocked();
        }
        return totalClicks;
      } else if (next >= notifyStartClick) {
        const remaining = totalClicks - next;
        const infoMsg = `Tinggal ${remaining} langkah lagi untuk membuka akses Admin`;
        showInternalToast(infoMsg, 'info');
      }

      return next;
    });
  }, [isUnlocked, totalClicks, notifyStartClick, showInternalToast, onUnlocked]);

  const lockAdmin = useCallback(() => {
    setIsUnlocked(false);
    setClickCount(0);
    try {
      sessionStorage.removeItem('loxer_admin_unlocked');
      sessionStorage.removeItem('app_admin_unlocked');
    } catch {
      // ignore session storage error
    }
    showInternalToast('🔒 Mode Administrator dikunci kembali.', 'info');
  }, [showInternalToast]);

  return {
    isUnlocked,
    clickCount,
    handleTriggerClick,
    lockAdmin,
    toastMessage,
    toastVisible,
    setToastVisible,
  };
}
