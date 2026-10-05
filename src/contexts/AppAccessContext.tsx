import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  detectIsAppClient,
  detectIsSuperAdminBypass,
  verifySecretPasskey,
  unlockSuperAdminBypass,
  lockSuperAdminBypass,
} from '../lib/appAccessService';
import { useAuth } from './useAuth';
import { isDefaultAdminEmail } from '../lib/constants';

export interface AppAccessContextType {
  isApp: boolean;
  isSuperAdmin: boolean;
  isViewOnlyWeb: boolean;
  installModalOpen: boolean;
  installModalAction: string;
  secretAdminModalOpen: boolean;
  requireApp: (actionTitle?: string) => boolean;
  openInstallModal: (actionTitle?: string) => void;
  closeInstallModal: () => void;
  openSecretAdminModal: () => void;
  closeSecretAdminModal: () => void;
  unlockSuperAdmin: (passkey: string) => boolean;
  lockSuperAdmin: () => void;
}

const AppAccessContext = createContext<AppAccessContextType | undefined>(undefined);

export function AppAccessProvider({ children }: { children: ReactNode }) {
  const { user, userMeta } = useAuth();

  // Smart Deteksi: Apakah client menggunakan Aplikasi Resmi
  const [isApp, setIsApp] = useState<boolean>(() => detectIsAppClient());

  // Smart Deteksi: Apakah Super Admin Bypass sedang aktif
  const [isSuperAdminBypass, setIsSuperAdminBypass] = useState<boolean>(() => detectIsSuperAdminBypass());

  // Modal Popups State
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  const [installModalAction, setInstallModalAction] = useState<string>('Mendaftar & Mengakses Layanan');
  const [secretAdminModalOpen, setSecretAdminModalOpen] = useState<boolean>(false);

  // Check if current authenticated user is an actual Admin / Super Admin
  const isActualAdminUser = Boolean(
    isDefaultAdminEmail(user?.email) ||
    userMeta?.role === 'admin' ||
    userMeta?.role === 'superadmin'
  );

  const isSuperAdmin = isSuperAdminBypass || isActualAdminUser;
  // User via Web biasa hanya bisa View Only KECUALI Super Admin (dengan akses rahasia) atau Aplikasi
  const isViewOnlyWeb = !isApp && !isSuperAdmin;

  // Sync detection on mount & event listeners
  useEffect(() => {
    const checkAppClient = () => {
      const detected = detectIsAppClient();
      setIsApp(detected);
      setIsSuperAdminBypass(detectIsSuperAdminBypass());
      if (detected) {
        setInstallModalOpen(false);
      }
    };

    checkAppClient();

    // Listen to changes in navigation or storage
    window.addEventListener('storage', checkAppClient);
    window.addEventListener('popstate', checkAppClient);
    window.addEventListener('hashchange', checkAppClient);

    // Secret Global Keyboard Shortcut: Ctrl + Shift + A or Cmd + Shift + A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setSecretAdminModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Check if current route is /admin-secret or /secret-admin
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p === '/admin-secret' || p === '/secret-admin') {
        setSecretAdminModalOpen(true);
      }
    }

    return () => {
      window.removeEventListener('storage', checkAppClient);
      window.removeEventListener('popstate', checkAppClient);
      window.removeEventListener('hashchange', checkAppClient);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openInstallModal = useCallback((actionTitle?: string) => {
    // Never open modal if app is detected
    if (detectIsAppClient()) return;
    setInstallModalAction(actionTitle || 'Mengakses Layanan Lengkap');
    setInstallModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setInstallModalOpen(false);
  }, []);

  const openSecretAdminModal = useCallback(() => {
    setSecretAdminModalOpen(true);
  }, []);

  const closeSecretAdminModal = useCallback(() => {
    setSecretAdminModalOpen(false);
  }, []);

  /**
   * Gateway Utama:
   * Mengembalikan TRUE jika aksi diperbolehkan (karena via Aplikasi atau Super Admin).
   * Mengembalikan FALSE dan memunculkan Popup Install jika via Web (View Only).
   */
  const requireApp = useCallback(
    (actionTitle?: string): boolean => {
      if (isApp || isSuperAdmin || detectIsAppClient()) {
        return true;
      }
      openInstallModal(actionTitle);
      return false;
    },
    [isApp, isSuperAdmin, openInstallModal]
  );

  const unlockSuperAdmin = useCallback((passkey: string): boolean => {
    const isValid = verifySecretPasskey(passkey);
    if (isValid) {
      unlockSuperAdminBypass();
      setIsSuperAdminBypass(true);
      setSecretAdminModalOpen(false);
      setInstallModalOpen(false);
      return true;
    }
    return false;
  }, []);

  const lockSuperAdmin = useCallback(() => {
    lockSuperAdminBypass();
    setIsSuperAdminBypass(false);
  }, []);

  const value: AppAccessContextType = {
    isApp,
    isSuperAdmin,
    isViewOnlyWeb,
    installModalOpen,
    installModalAction,
    secretAdminModalOpen,
    requireApp,
    openInstallModal,
    closeInstallModal,
    openSecretAdminModal,
    closeSecretAdminModal,
    unlockSuperAdmin,
    lockSuperAdmin,
  };

  return (
    <AppAccessContext.Provider value={value}>
      {children}
    </AppAccessContext.Provider>
  );
}

export function useAppAccess(): AppAccessContextType {
  const context = useContext(AppAccessContext);
  if (!context) {
    throw new Error('useAppAccess must be used within an AppAccessProvider');
  }
  return context;
}
