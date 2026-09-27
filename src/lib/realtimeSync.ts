// ==============================================================================
// LOXER Realtime Sync Engine (Cross-Tab Broadcast & Adaptive Polling)
// ==============================================================================

export type RealtimeSyncType = 'application' | 'notification' | 'job' | 'all';

export interface RealtimeSyncPayload {
  type: RealtimeSyncType;
  timestamp: number;
  data?: unknown;
}

const CHANNEL_NAME = 'loxer_realtime_sync';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Broadcast an update event across windows, tabs, and local components.
 */
export function broadcastSync(type: RealtimeSyncType = 'all', data?: unknown) {
  const payload: RealtimeSyncPayload = {
    type,
    timestamp: Date.now(),
    data,
  };

  // 1. Dispatch on current window
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('loxer:realtime-sync', { detail: payload }));
    } catch {
      // ignore
    }
  }

  // 2. Broadcast across browser tabs / iframes
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {
      // ignore
    }
  }
}

/**
 * Subscribe to realtime sync updates from any tab or local event.
 */
export function subscribeSync(callback: (payload: RealtimeSyncPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleWindow = (e: Event) => {
    const detail = (e as CustomEvent<RealtimeSyncPayload>).detail;
    if (detail) callback(detail);
  };

  const handleChannel = (event: MessageEvent<RealtimeSyncPayload>) => {
    if (event.data) callback(event.data);
  };

  window.addEventListener('loxer:realtime-sync', handleWindow);

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleChannel);
  }

  return () => {
    window.removeEventListener('loxer:realtime-sync', handleWindow);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleChannel);
    }
  };
}
