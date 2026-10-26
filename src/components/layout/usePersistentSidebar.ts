import { useEffect, useState } from 'react';

interface UsePersistentSidebarResult {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapsed: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

export default function usePersistentSidebar(storageKey: string): UsePersistentSidebarResult {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(storageKey) === 'collapsed';
    } catch {
      return false;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, isCollapsed ? 'collapsed' : 'expanded');
    } catch {
      // Ignore localStorage write issues.
    }
  }, [isCollapsed, storageKey]);

  return {
    isCollapsed,
    isMobileOpen,
    toggleCollapsed: () => setIsCollapsed((current) => !current),
    toggleMobile: () => setIsMobileOpen((current) => !current),
    closeMobile: () => setIsMobileOpen(false),
  };
}
