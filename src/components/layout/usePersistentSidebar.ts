import { useEffect, useState } from 'react';

interface UsePersistentSidebarResult {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapsed: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

export default function usePersistentSidebar(storageKey: string): UsePersistentSidebarResult {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === 'collapsed') {
        setIsCollapsed(true);
      }
    } catch {
      // Ignore localStorage read issues; sidebar still works with in-memory state.
    }
  }, [storageKey]);

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
