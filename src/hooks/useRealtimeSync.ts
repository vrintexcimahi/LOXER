// ==============================================================================
// useRealtimeSync Hook
// Adaptive background polling + visibilitychange + focus + BroadcastChannel
// ==============================================================================

import { useEffect, useRef } from 'react';
import { RealtimeSyncType, subscribeSync } from '../lib/realtimeSync';

interface UseRealtimeSyncOptions {
  enabled?: boolean;
  intervalMs?: number; // default 15000ms
  filterType?: RealtimeSyncType;
}

export function useRealtimeSync(
  onSync: (isSilent?: boolean) => void | Promise<void>,
  options: UseRealtimeSyncOptions = {}
) {
  const { enabled = true, intervalMs = 15000, filterType } = options;
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 1. Listen for cross-tab & local broadcasts
    const unsubscribe = subscribeSync((payload) => {
      if (!filterType || filterType === 'all' || payload.type === 'all' || payload.type === filterType) {
        void onSyncRef.current(true);
      }
    });

    // 2. Immediate re-sync when tab becomes visible or gains focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void onSyncRef.current(true);
      }
    };

    const handleFocus = () => {
      void onSyncRef.current(true);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    // 3. Adaptive interval polling (only active when tab is visible)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void onSyncRef.current(true);
      }
    }, intervalMs);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      clearInterval(timer);
    };
  }, [enabled, intervalMs, filterType]);
}

export default useRealtimeSync;
