// ==============================================================================
// LOXER PWA - Offline Application Sync Queue (with Tenant & User Isolation)
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

export function getQueuedApplications(seekerId?: string): QueuedApplication[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list: QueuedApplication[] = Array.isArray(parsed) ? parsed : [];

    // Auto-deduplicate queue to ensure high data integrity
    const seen = new Set<string>();
    const deduplicated: QueuedApplication[] = [];
    for (const item of list) {
      if (!item || !item.jobId || !item.seekerId) continue;
      const key = `${item.jobId}::${item.seekerId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(item);
      }
    }

    if (deduplicated.length !== list.length) {
      try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(deduplicated));
      } catch {
        // ignore
      }
    }

    if (seekerId) {
      return deduplicated.filter((item) => item.seekerId === seekerId);
    }
    return deduplicated;
  } catch {
    return [];
  }
}

export function pruneStaleQueueItems(confirmedJobIds: string[], seekerId: string): QueuedApplication[] {
  if (typeof window === 'undefined' || !seekerId || !Array.isArray(confirmedJobIds) || confirmedJobIds.length === 0) {
    return getQueuedApplications();
  }
  const current = getQueuedApplications();
  const confirmedSet = new Set(confirmedJobIds);
  const filtered = current.filter((item) => !(item.seekerId === seekerId && confirmedSet.has(item.jobId)));
  if (filtered.length !== current.length) {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('loxer:offline-queue-changed', { detail: filtered }));
    } catch {
      // ignore
    }
  }
  return filtered;
}

export function queueApplicationOffline(
  data: Omit<QueuedApplication, 'queuedAt'>
): QueuedApplication[] {
  if (typeof window === 'undefined') return [];
  const current = getQueuedApplications();

  // Prevent duplicate queuing for the same job by the same seeker
  if (current.some((item) => item.jobId === data.jobId && item.seekerId === data.seekerId)) {
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

export function removeQueuedApplication(jobId: string, seekerId?: string): QueuedApplication[] {
  if (typeof window === 'undefined') return [];
  const current = getQueuedApplications();
  const updated = current.filter((item) => {
    if (item.jobId !== jobId) return true;
    if (seekerId && item.seekerId !== seekerId) return true;
    return false;
  });
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('loxer:offline-queue-changed', { detail: updated }));
  } catch {
    // ignore
  }
  return updated;
}

export function clearQueuedApplications(seekerId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (seekerId) {
      const remaining = getQueuedApplications().filter((item) => item.seekerId !== seekerId);
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
      window.dispatchEvent(new CustomEvent('loxer:offline-queue-changed', { detail: remaining }));
    } else {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('loxer:offline-queue-changed', { detail: [] }));
    }
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
  client: unknown,
  activeSeekerId?: string
): Promise<{ synced: number; failed: number }> {
  if (!client || typeof client !== 'object' || !('from' in client) || typeof window === 'undefined') {
    return { synced: 0, failed: 0 };
  }

  const supabaseClient = client as MinimalSupabaseClient;
  const queue = getQueuedApplications();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  // Tenant / User Isolation Guard: only sync items that belong to active user
  const eligibleItems = activeSeekerId
    ? queue.filter((item) => item.seekerId === activeSeekerId)
    : queue;

  if (eligibleItems.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of eligibleItems) {
    try {
      const { error } = await supabaseClient.from('applications').insert({
        job_id: item.jobId,
        seeker_id: item.seekerId,
        status: 'applied',
      });

      const errStr = String((error as { message?: string })?.message || '');
      const isDuplicate = errStr.includes('UNIQUE') || errStr.includes('duplicate') || (error as { code?: string })?.code === '23505';

      if (!error || isDuplicate) {
        removeQueuedApplication(item.jobId, item.seekerId);
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
        detail: { synced, remaining: getQueuedApplications().length },
      })
    );
  }

  return { synced, failed };
}

export function useOfflineQueue(seekerId?: string) {
  const [queue, setQueue] = useState<QueuedApplication[]>(() => getQueuedApplications(seekerId));
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => {
      setQueue(getQueuedApplications(seekerId));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('loxer:offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('loxer:offline-queue-changed', handleQueueChange);
    };
  }, [seekerId]);

  const triggerSync = useCallback(
    async (client: unknown, specificSeekerId?: string) => {
      return syncQueuedApplications(client, specificSeekerId || seekerId);
    },
    [seekerId]
  );

  return {
    queue,
    queueCount: queue.length,
    isOnline,
    triggerSync,
  };
}
