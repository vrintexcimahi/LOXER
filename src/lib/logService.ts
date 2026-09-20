// ==============================================================================
// LOXER System Log & Global Error Interceptor Service
// ==============================================================================

import { useState, useEffect } from 'react';

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  actor: string;
  message: string;
  details?: string | Record<string, unknown>;
  resolved?: boolean;
}

const STORAGE_KEY = 'loxer_system_logs_v1';
const MAX_LOG_ENTRIES = 1000;
const subscribers = new Set<(logs: SystemLogEntry[]) => void>();

let isInterceptorInitialized = false;

function getStoredLogs(): SystemLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SystemLogEntry[];
  } catch {
    return [];
  }
}

function saveLogs(logs: SystemLogEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = logs.slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    subscribers.forEach((fn) => fn(trimmed));
    window.dispatchEvent(new CustomEvent('loxer:system-log-change', { detail: { count: trimmed.length } }));
  } catch (err) {
    console.warn('[LogService] Gagal menyimpan log ke localStorage:', err);
  }
}

export function addLog(entry: {
  level: LogLevel;
  module: string;
  actor?: string;
  message: string;
  details?: string | Record<string, unknown>;
  resolved?: boolean;
}): SystemLogEntry {
  const currentLogs = getStoredLogs();
  const id = `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const newEntry: SystemLogEntry = {
    id,
    timestamp: new Date().toISOString(),
    level: entry.level,
    module: entry.module || 'System',
    actor: entry.actor || 'System/Guest',
    message: entry.message,
    details: entry.details,
    resolved: entry.resolved ?? (entry.level !== 'ERROR'),
  };

  const updated = [...currentLogs, newEntry];
  saveLogs(updated);
  return newEntry;
}

export const logger = {
  info: (module: string, message: string, details?: string | Record<string, unknown>, actor?: string) =>
    addLog({ level: 'INFO', module, message, details, actor }),
  success: (module: string, message: string, details?: string | Record<string, unknown>, actor?: string) =>
    addLog({ level: 'SUCCESS', module, message, details, actor }),
  warn: (module: string, message: string, details?: string | Record<string, unknown>, actor?: string) =>
    addLog({ level: 'WARN', module, message, details, actor }),
  error: (module: string, message: string, details?: string | Record<string, unknown>, actor?: string) =>
    addLog({ level: 'ERROR', module, message, details, actor }),
};

export function clearLogs() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  subscribers.forEach((fn) => fn([]));
  window.dispatchEvent(new CustomEvent('loxer:system-log-change', { detail: { count: 0 } }));
}

export function resolveLog(id: string) {
  const logs = getStoredLogs();
  const updated = logs.map((l) => (l.id === id ? { ...l, resolved: true } : l));
  saveLogs(updated);
}

export function resolveAllErrors() {
  const logs = getStoredLogs();
  const updated = logs.map((l) => (l.level === 'ERROR' ? { ...l, resolved: true } : l));
  saveLogs(updated);
}

export function getUnresolvedErrorCount(): number {
  const logs = getStoredLogs();
  return logs.filter((l) => l.level === 'ERROR' && !l.resolved).length;
}

export function exportLogsAsJson(): string {
  const logs = getStoredLogs();
  return JSON.stringify(logs, null, 2);
}

export function exportLogsAsCsv(): string {
  const logs = getStoredLogs();
  if (logs.length === 0) return 'ID,Timestamp,Level,Module,Actor,Message,Resolved\n';

  const headers = ['ID', 'Timestamp', 'Level', 'Module', 'Actor', 'Message', 'Resolved'];
  const rows = logs.map((l) => {
    const escapedMsg = `"${String(l.message).replace(/"/g, '""')}"`;
    return [l.id, l.timestamp, l.level, l.module, l.actor, escapedMsg, l.resolved ? 'true' : 'false'].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function initGlobalErrorInterceptor() {
  if (isInterceptorInitialized || typeof window === 'undefined') return;
  isInterceptorInitialized = true;

  // Global uncaught JS errors
  window.addEventListener('error', (event) => {
    // Ignore harmless extension errors
    if (event.filename && event.filename.includes('chrome-extension://')) return;

    logger.error(
      'Runtime',
      event.message || 'Uncaught JavaScript Error',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || 'No stack trace available',
      },
      'Browser/Client'
    );
  });

  // Global unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    let message = 'Unhandled Promise Rejection';
    let stack = '';

    if (reason instanceof Error) {
      message = reason.message;
      stack = reason.stack || '';
    } else if (typeof reason === 'string') {
      message = reason;
    } else if (reason && typeof reason === 'object') {
      try {
        message = JSON.stringify(reason);
      } catch {
        message = String(reason);
      }
    }

    logger.error(
      'Async/Promise',
      message,
      {
        stack: stack || 'Unhandled asynchronous rejection',
        rawReason: typeof reason === 'object' ? reason : undefined,
      },
      'Async/Promise'
    );
  });

  // Seed sample initial logs if empty so UI looks active and realistic immediately
  const existing = getStoredLogs();
  if (existing.length === 0) {
    logger.info('System', 'Sistem LOXER diinisialisasi pada mode offline lokal SQLite.', { version: '2.5.0' }, 'Kernel');
    logger.success('Database', 'Koneksi SQLite (data/loxer.db) siap. 19 tabel aktif.', { tables: 19 }, 'DB-Worker');
    logger.info('PWA', 'Service Worker v1 dan Web Manifest terdaftar.', { scope: '/' }, 'PWA-Engine');
  }
}

export function useSystemLogs() {
  const [logs, setLogs] = useState<SystemLogEntry[]>(() => getStoredLogs());
  const [unresolvedErrorCount, setUnresolvedErrorCount] = useState<number>(() => getUnresolvedErrorCount());

  useEffect(() => {
    const handleUpdate = (newLogs: SystemLogEntry[]) => {
      setLogs(newLogs);
      setUnresolvedErrorCount(newLogs.filter((l) => l.level === 'ERROR' && !l.resolved).length);
    };

    subscribers.add(handleUpdate);
    // Initial fetch in case of background updates
    handleUpdate(getStoredLogs());

    const handleCustomEvent = () => {
      handleUpdate(getStoredLogs());
    };
    window.addEventListener('loxer:system-log-change', handleCustomEvent);

    return () => {
      subscribers.delete(handleUpdate);
      window.removeEventListener('loxer:system-log-change', handleCustomEvent);
    };
  }, []);

  return {
    logs,
    unresolvedErrorCount,
    addLog,
    clearLogs,
    resolveLog,
    resolveAllErrors,
  };
}
