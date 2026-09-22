// ==============================================================================
// LOXER PWA - Offline Application Sync Queue
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';

const QUEUE_STORAGE_KEY = 'loxer_offline_applications_queue';

export interface QueuedApplication {
  jobId: string;
  jobTitle: string;
  companyName?: string;
  seekerId: string;
  queuedAt: string;
}

export function getQueuedApplications(): QueuedApplication[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function queueApplicationOffline(
  data: Omit<QueuedApplication, 'queuedAt'>
): QueuedApplication[] {
  if (typeof window === 'undefined') return [];
  const current = getQueuedApplications();

  // Prevent duplicate queuing for the same job
  if (current.some((item) => item.jobId === data.jobId)) {
    return current;
  }

  const newItem: QueuedApplication = {
    ...data,
    queuedAt: new Date().toISOString(),
  };

  const updated = [...current, newItem];
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('loxer:offline-queue-changed', { detail: updated }));
  } catch {
    // Storage quota or private mode error
  }

  return updated;
}

export function removeQueuedApplication(jobId: string): QueuedApplication[] {
  if (typeof window === 'undefined') return [];
  const current = getQueuedApplications();
  const updated = current.filter((item) => item.jobId !== jobId);
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('loxer:offline-queue-changed', { detail: updated }));
  } catch {
    // ignore
  }
  return updated;
}

export function clearQueuedApplications(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('loxer:offline-queue-changed', { detail: [] }));
  } catch {
    // ignore
  }
}

interface MinimalSupabaseClient {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => Promise<{ error?: unknown }>;
  };
}

export async function syncQueuedApplications(
  client: unknown
): Promise<{ synced: number; failed: number }> {
  if (!client || typeof client !== 'object' || !('from' in client) || typeof window === 'undefined') {
    return { synced: 0, failed: 0 };
  }

  const supabaseClient = client as MinimalSupabaseClient;
  const queue = getQueuedApplications();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const { error } = await supabaseClient.from('applications').insert({
        job_id: item.jobId,
        seeker_id: item.seekerId,
        status: 'applied',
      });

      if (!error) {
        removeQueuedApplication(item.jobId);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  if (synced > 0) {
    window.dispatchEvent(
      new CustomEvent('loxer:offline-queue-synced', {
        detail: { synced, remaining: queue.length - synced },
      })
    );
  }

  return { synced, failed };
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedApplication[]>(() => getQueuedApplications());
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = (e: Event) => {
      const customEvent = e as CustomEvent<QueuedApplication[]>;
      setQueue(customEvent.detail || getQueuedApplications());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('loxer:offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('loxer:offline-queue-changed', handleQueueChange);
    };
  }, []);

  const triggerSync = useCallback(async (client: unknown) => {
    return syncQueuedApplications(client);
  }, []);

  return {
    queue,
    queueCount: queue.length,
    isOnline,
    triggerSync,
  };
}
