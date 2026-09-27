import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, UploadCloud } from 'lucide-react';
import { getQueuedApplications, syncQueuedApplications } from '../../lib/offlineSyncService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';

export default function OfflineIndicator() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedCount, setQueuedCount] = useState<number>(() => getQueuedApplications(user?.id).length);
  const [syncedBanner, setSyncedBanner] = useState<{ count: number } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger automatic sync upon connection restored
      if (supabase) {
        setIsSyncing(true);
        void syncQueuedApplications(supabase, user?.id).then(({ synced }) => {
          setIsSyncing(false);
          setQueuedCount(getQueuedApplications(user?.id).length);
          if (synced > 0) {
            setSyncedBanner({ count: synced });
            setTimeout(() => setSyncedBanner(null), 4500);
          }
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setQueuedCount(getQueuedApplications(user?.id).length);
    };

    const handleQueueChange = () => {
      setQueuedCount(getQueuedApplications(user?.id).length);
    };

    const handleSyncedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ synced: number }>;
      if (customEvent.detail && customEvent.detail.synced > 0) {
        setSyncedBanner({ count: customEvent.detail.synced });
        setTimeout(() => setSyncedBanner(null), 4500);
      }
      setQueuedCount(getQueuedApplications(user?.id).length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('loxer:offline-queue-changed', handleQueueChange);
    window.addEventListener('loxer:offline-queue-synced', handleSyncedEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('loxer:offline-queue-changed', handleQueueChange);
      window.removeEventListener('loxer:offline-queue-synced', handleSyncedEvent);
    };
  }, [user?.id]);

  const handleManualSync = async () => {
    if (!supabase || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncQueuedApplications(supabase, user?.id);
      if (res.synced > 0) {
        setSyncedBanner({ count: res.synced });
        setTimeout(() => setSyncedBanner(null), 4000);
      }
    } finally {
      setIsSyncing(false);
      setQueuedCount(getQueuedApplications(user?.id).length);
    }
  };

  // Reconnection success pill
  if (syncedBanner && isOnline) {
    return (
      <aside
        aria-label="Status Sinkronisasi Online"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-fade-down max-w-sm w-[92vw]"
      >
        <div className="bg-emerald-950/95 border border-emerald-500/40 rounded-full px-4 py-2 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-emerald-200 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Terhubung kembali. {syncedBanner.count} lamaran berhasil disinkronkan!</span>
          </div>
        </div>
      </aside>
    );
  }

  // Offline status pill/banner
  if (!isOnline) {
    return (
      <aside
        aria-label="Mode Offline"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-50 animate-fade-down max-w-md w-[92vw]"
      >
        <div className="bg-slate-950/95 border border-amber-500/40 rounded-2xl px-3.5 py-2.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <WifiOff className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white tracking-tight truncate">Mode Offline Aktif</p>
              <p className="text-[11px] text-amber-200/80 truncate">
                {queuedCount > 0
                  ? `${queuedCount} lamaran menunggu sinkronisasi`
                  : 'Aplikasi berjalan dari cache lokal'}
              </p>
            </div>
          </div>

          {queuedCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-semibold transition shrink-0 active:scale-95"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sync...' : 'Sync'}</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // If online but there are still unsynced items
  if (isOnline && queuedCount > 0) {
    return (
      <aside
        aria-label="Antrean Lamaran Offline"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-fade-down max-w-sm w-[92vw]"
      >
        <div className="bg-slate-900/95 border border-cyan-500/40 rounded-full px-4 py-2 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-cyan-200 text-xs font-medium">
          <div className="flex items-center gap-2 truncate">
            <UploadCloud className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">{queuedCount} lamaran di antrean lokal</span>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-[11px] font-bold transition shrink-0 active:scale-95"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Kirim...' : 'Kirim'}</span>
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
