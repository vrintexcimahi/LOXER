import { detectDeviceSync } from './deviceIntelligence';

const VISITOR_ID_KEY = 'loxer_visitor_id';
const SESSION_ID_KEY = 'loxer_session_id';
const LAST_ACTIVITY_KEY = 'loxer_last_activity_ts';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server_render';
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateId('vis');
    try {
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    } catch {
      // ignore storage quota / private mode errors
    }
  }
  return visitorId;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  const now = Date.now();
  const lastActivity = parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

  if (!sessionId || (lastActivity && now - lastActivity > SESSION_TIMEOUT_MS)) {
    sessionId = generateId('ses');
    try {
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    } catch {
      // ignore
    }
  }

  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    // ignore
  }

  return sessionId;
}

export interface TrackPayload {
  visitor_id: string;
  session_id: string;
  path: string;
  page_title: string;
  referrer: string;
  device_type: string;
  browser: string;
  os: string;
  screen_res: string;
  duration_seconds: number;
  is_heartbeat?: boolean;
  log_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

export class VisitorTrackerService {
  private static currentLogId: string | null = null;
  private static pageStartTime: number = Date.now();
  private static currentPath: string = '';
  private static heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private static isInitialized: boolean = false;

  public static init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // Track initial page
    this.trackCurrentPage();

    // Listen to history changes (pushState, replaceState, popstate)
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      VisitorTrackerService.trackCurrentPage();
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args);
      // For replaceState, check if path actually changed
      if (window.location.pathname !== VisitorTrackerService.currentPath) {
        VisitorTrackerService.trackCurrentPage();
      }
    };

    window.addEventListener('popstate', () => {
      this.trackCurrentPage();
    });

    // Start heartbeat
    this.startHeartbeat();

    // Dwell time flush on unload or tab hide
    const flushDwellTime = () => {
      this.flushDwell();
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushDwellTime();
      }
    });

    window.addEventListener('beforeunload', flushDwellTime);
  }

  public static trackCurrentPage() {
    if (typeof window === 'undefined') return;

    const newPath = window.location.pathname + window.location.search;
    if (this.currentPath === newPath) return; // avoid duplicate calls

    // Flush previous page dwell time if any
    if (this.currentLogId) {
      this.flushDwell();
    }

    this.currentPath = newPath;
    this.pageStartTime = Date.now();
    this.currentLogId = null;

    const visitorId = getVisitorId();
    const sessionId = getSessionId();

    let deviceType = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    try {
      const dev = detectDeviceSync();
      deviceType = dev.deviceType;
      browser = dev.browserName + (dev.browserVersion ? ` ${dev.browserVersion}` : '');
      os = dev.osName + (dev.osVersion ? ` ${dev.osVersion}` : '');
    } catch {
      // fallback
      const ua = navigator.userAgent;
      if (/Android/i.test(ua)) { deviceType = 'mobile'; os = 'Android'; }
      else if (/iPhone|iPad|iPod/i.test(ua)) { deviceType = 'mobile'; os = 'iOS'; }
      else if (/Windows/i.test(ua)) { os = 'Windows'; }
      else if (/Mac/i.test(ua)) { os = 'macOS'; }
      else if (/Linux/i.test(ua)) { os = 'Linux'; }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const payload: TrackPayload = {
      visitor_id: visitorId,
      session_id: sessionId,
      path: window.location.pathname,
      page_title: document.title || window.location.pathname,
      referrer: document.referrer || '',
      device_type: deviceType,
      browser,
      os,
      screen_res: `${window.screen.width}x${window.screen.height}`,
      duration_seconds: 0,
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
    };

    const token = localStorage.getItem('loxer_local_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/traffic/track', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.log_id) {
          this.currentLogId = data.log_id;
        }
      })
      .catch((err) => {
        console.debug('[VisitorTracker] Tracking request error:', err);
      });
  }

  private static startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.sendHeartbeat();
      }
    }, 20000); // every 20 seconds
  }

  private static sendHeartbeat() {
    if (typeof window === 'undefined' || !this.currentPath) return;

    const durationSeconds = Math.round((Date.now() - this.pageStartTime) / 1000);
    const token = localStorage.getItem('loxer_local_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/traffic/track', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        path: window.location.pathname,
        duration_seconds: durationSeconds,
        is_heartbeat: true,
        log_id: this.currentLogId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.log_id && !this.currentLogId) {
          this.currentLogId = data.log_id;
        }
      })
      .catch(() => {});
  }

  private static flushDwell() {
    if (typeof window === 'undefined' || !this.currentPath) return;

    const durationSeconds = Math.round((Date.now() - this.pageStartTime) / 1000);
    const payload = JSON.stringify({
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      path: window.location.pathname,
      duration_seconds: durationSeconds,
      is_heartbeat: true,
      log_id: this.currentLogId,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/traffic/track', blob);
    } else {
      fetch('/api/traffic/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }
}
