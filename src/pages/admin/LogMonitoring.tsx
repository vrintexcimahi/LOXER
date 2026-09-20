// ==============================================================================
// LOXER Admin - Log & Monitoring System (Live Tail & Error Tracker)
// ==============================================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Terminal,
  Search,
  Play,
  Pause,
  Trash2,
  Download,
  FileSpreadsheet,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Check,
  X,
  Sparkles,
  Zap,
} from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import {
  useSystemLogs,
  logger,
  exportLogsAsJson,
  exportLogsAsCsv,
  LogLevel,
  SystemLogEntry,
} from '../../lib/logService';

const LEVEL_COLORS: Record<LogLevel, { badge: string; text: string; dot: string; border: string }> = {
  INFO: {
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    text: 'text-cyan-300',
    dot: 'bg-cyan-400',
    border: 'border-cyan-500/20',
  },
  SUCCESS: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/20',
  },
  WARN: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    border: 'border-amber-500/20',
  },
  ERROR: {
    badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse',
    text: 'text-rose-400 font-semibold',
    dot: 'bg-rose-500',
    border: 'border-rose-500/30',
  },
};

export default function LogMonitoring() {
  const { logs, unresolvedErrorCount, clearLogs, resolveLog, resolveAllErrors } = useSystemLogs();

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [activeLogDetail, setActiveLogDetail] = useState<SystemLogEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [snapshotLogs, setSnapshotLogs] = useState<SystemLogEntry[]>([]);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // When paused, freeze snapshot of logs
  useEffect(() => {
    if (!isPaused) {
      setSnapshotLogs(logs);
    }
  }, [logs, isPaused]);

  // Auto-scroll when new logs arrive and autoScroll is active
  useEffect(() => {
    if (autoScroll && !isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [snapshotLogs, autoScroll, isPaused]);

  // Unique modules list for filter
  const modulesList = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.module) set.add(l.module);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return snapshotLogs.filter((log) => {
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return false;
      if (selectedModule !== 'ALL' && log.module !== selectedModule) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const msg = String(log.message || '').toLowerCase();
        const act = String(log.actor || '').toLowerCase();
        const mod = String(log.module || '').toLowerCase();
        const id = String(log.id || '').toLowerCase();
        if (!msg.includes(query) && !act.includes(query) && !mod.includes(query) && !id.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [snapshotLogs, selectedLevel, selectedModule, searchTerm]);

  // Copy Payload action
  const handleCopyPayload = () => {
    if (!activeLogDetail) return;
    navigator.clipboard.writeText(JSON.stringify(activeLogDetail, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export handlers
  const handleDownloadJson = () => {
    const data = exportLogsAsJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loxer_system_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const data = exportLogsAsCsv();
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loxer_system_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simulator triggers
  const triggerSampleInfo = () => {
    logger.info('Router', `Navigasi halaman ke rute /admin/dashboard pada timestamp ${Date.now()}`, { route: '/admin/dashboard', referrer: '/' }, 'AdminUser');
  };

  const triggerSampleSuccess = () => {
    logger.success('Database', 'Sinkronisasi SQLite berhasil dieksekusi tanpa conflict.', { affectedRows: 3, durationMs: 14 }, 'LocalDbSync');
  };

  const triggerSampleWarn = () => {
    logger.warn('API/Network', 'Respon endpoint pihak ketiga Careerjet melambat (> 1850ms)', { endpoint: '/api/jobs', latencyMs: 1852 }, 'JobProxy');
  };

  const triggerSampleError = () => {
    try {
      throw new Error('Simulated Database Constraint Failure: Duplicate primary key in company_members');
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Database', error.message, { stack: error.stack, code: 'SQLITE_CONSTRAINT_UNIQUE' }, 'AdminSimulator');
    }
  };

  return (
    <GodModeLayout
      title="Log & Monitoring System"
      description="Live tail console, interceptor error global real-time, diagnostik, dan payload inspector."
    >
      <div className="space-y-4 sm:space-y-6">
        {/* KPI & Summary Bar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg hover:border-cyan-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Total Log Terekam</p>
                <p className="mt-1 text-2xl font-bold text-white tracking-tight">{logs.length}</p>
              </div>
              <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Terminal className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 truncate">Maksimum rotasi 1.000 log terbaru</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg hover:border-rose-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Error Aktif</p>
                <p className={`mt-1 text-2xl font-bold tracking-tight ${unresolvedErrorCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {unresolvedErrorCount}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 border shrink-0 ${unresolvedErrorCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                <AlertOctagon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className={unresolvedErrorCount > 0 ? 'text-rose-300 font-medium' : 'text-emerald-400'}>
                {unresolvedErrorCount > 0 ? 'Perlu tindakan segera' : 'Sistem beroperasi normal'}
              </span>
              {unresolvedErrorCount > 0 && (
                <button
                  type="button"
                  onClick={resolveAllErrors}
                  className="text-cyan-400 hover:text-cyan-300 font-medium underline cursor-pointer"
                >
                  Selesaikan Semua
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg hover:border-purple-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Status Live Tail</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
                  <span className={`text-lg sm:text-xl font-bold ${isPaused ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {isPaused ? 'PAUSED' : 'STREAMING'}
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400 border border-purple-500/20 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 truncate">Interceptor runtime &amp; network</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg hover:border-sky-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">Modul Terpantau</p>
                <p className="mt-1 text-2xl font-bold text-white tracking-tight">{modulesList.length || 1}</p>
              </div>
              <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-400 border border-sky-500/20 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 truncate">Auth, DB, Router, API, PWA, Runtime</p>
          </div>
        </div>

        {/* Simulator Bar */}
        <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/95 p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <span className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25 shrink-0 mt-0.5 sm:mt-0">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white">Simulator Test Log</h4>
                <p className="text-xs text-slate-400">Picu log simulasi untuk menguji visual live tail terminal dan kalkulasi error secara instan.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={triggerSampleInfo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                <Info className="w-3.5 h-3.5" />
                <span>+ INFO</span>
              </button>
              <button
                type="button"
                onClick={triggerSampleSuccess}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>+ SUCCESS</span>
              </button>
              <button
                type="button"
                onClick={triggerSampleWarn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>+ WARN</span>
              </button>
              <button
                type="button"
                onClick={triggerSampleError}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>+ ERROR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Terminal Window */}
        <div className="rounded-2xl border border-slate-700/60 bg-[#0b0f17] shadow-2xl overflow-hidden font-mono">
          {/* Terminal Window Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 gap-3">
            {/* macOS traffic light dots & title */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
              <div className="ml-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">loxer-live-tail.sh</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-cyan-300 font-semibold border border-slate-700">
                  {filteredLogs.length} baris
                </span>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${isPaused ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Lanjutkan' : 'Jeda'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition cursor-pointer"
                title="Ekspor JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition cursor-pointer"
                title="Ekspor CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={clearLogs}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs border border-rose-500/30 transition cursor-pointer"
                title="Bersihkan Log"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan</span>
              </button>
            </div>
          </div>

          {/* Terminal Toolbar Filter */}
          <div className="flex flex-col md:flex-row md:items-center gap-2.5 p-3 bg-slate-900/80 border-b border-slate-800 text-xs">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari pesan, aktor, modul, id log..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Level Filter */}
              <div className="min-w-[120px] flex-1 sm:flex-initial">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">Semua Level</option>
                  <option value="INFO">INFO</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>

              {/* Module Filter */}
              <div className="min-w-[130px] flex-1 sm:flex-initial">
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">Semua Modul</option>
                  {modulesList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-scroll toggle */}
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white cursor-pointer select-none shrink-0 transition">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-medium">Auto-scroll</span>
              </label>
            </div>
          </div>

          {/* Terminal Console Stream Body */}
          <div className="h-[460px] sm:h-[500px] overflow-y-auto overflow-x-auto p-3 sm:p-4 space-y-1.5 text-[11.5px] sm:text-[12px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 select-text">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-8 text-center">
                <Terminal className="w-10 h-10 opacity-30 text-cyan-400" />
                <p className="font-semibold text-slate-400">Tidak ada log yang sesuai filter</p>
                <p className="text-xs text-slate-600 max-w-sm">Coba bersihkan pencarian atau ubah filter level dan modul untuk melihat riwayat aktivitas sistem.</p>
              </div>
            ) : (
              <div className="min-w-[640px] lg:min-w-0 space-y-1">
                {filteredLogs.map((log, index) => {
                  const colors = LEVEL_COLORS[log.level] || LEVEL_COLORS.INFO;
                  const timeString = new Date(log.timestamp).toLocaleTimeString('id-ID', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <div
                      key={log.id || index}
                      onClick={() => setActiveLogDetail(log)}
                      className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/70 transition cursor-pointer border border-transparent hover:${colors.border}`}
                    >
                      {/* Timestamp */}
                      <span className="text-slate-500 shrink-0 font-mono text-[11px] select-none">
                        [{timeString}]
                      </span>

                      {/* Level Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider border shrink-0 w-16 text-center ${colors.badge}`}
                      >
                        {log.level}
                      </span>

                      {/* Module Tag */}
                      <span className="text-slate-300 shrink-0 text-[11px] font-semibold">
                        [{log.module}]
                      </span>

                      {/* Actor */}
                      <span className="text-slate-400 shrink-0 text-[11px] hidden md:inline">
                        @{log.actor}:
                      </span>

                      {/* Message */}
                      <span className={`flex-1 truncate font-mono ${colors.text}`} title={log.message}>
                        {log.message}
                      </span>

                      {/* Indicator for details / error resolution */}
                      {log.details ? (
                        <span className="text-[10px] text-cyan-400/80 group-hover:text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 shrink-0 select-none transition">
                          payload »
                        </span>
                      ) : null}

                      {log.level === 'ERROR' && !log.resolved ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold shrink-0 border border-rose-500/40">
                          UNRESOLVED
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Terminal Footer Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-800 bg-slate-950/80 px-4 py-2.5 text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-300">Live listener aktif</span>
              <span className="text-slate-700">•</span>
              <span>Buffer memori: <strong className="text-slate-200">{logs.length}</strong> / 1.000</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <span>💡 Klik baris log untuk memeriksa payload detail &amp; stack trace</span>
            </div>
          </div>
        </div>

        {/* Modal Detail Log */}
        {activeLogDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-4 sm:p-6 text-white font-mono scrollbar-thin scrollbar-thumb-slate-700">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${LEVEL_COLORS[activeLogDetail.level].badge}`}
                  >
                    {activeLogDetail.level}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      {activeLogDetail.module} - {activeLogDetail.id}
                    </h3>
                    <p className="text-xs text-slate-400">{activeLogDetail.timestamp}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveLogDetail(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="my-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400">Pesan:</span>
                  <p className="mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-sans text-sm">
                    {activeLogDetail.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-500">Aktor / Trigger:</span>
                    <p className="font-semibold text-slate-200 mt-0.5">{activeLogDetail.actor}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-500">Status Error:</span>
                    <p className="font-semibold mt-0.5">
                      {activeLogDetail.level === 'ERROR' ? (
                        activeLogDetail.resolved ? (
                          <span className="text-emerald-400">Terselesaikan (Resolved)</span>
                        ) : (
                          <span className="text-rose-400">Belum Diselesaikan</span>
                        )
                      ) : (
                        <span className="text-slate-400">Normal / Informational</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Payload / Details */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">Payload / Details / Stack Trace:</span>
                    <button
                      type="button"
                      onClick={handleCopyPayload}
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin!' : 'Salin Payload'}</span>
                    </button>
                  </div>
                  <pre className="max-h-60 overflow-y-auto rounded-xl bg-black/90 p-4 border border-slate-800 text-xs text-cyan-300 scrollbar-thin scrollbar-thumb-slate-700">
                    {typeof activeLogDetail.details === 'object'
                      ? JSON.stringify(activeLogDetail.details, null, 2)
                      : activeLogDetail.details || '(Tidak ada payload tambahan)'}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                {activeLogDetail.level === 'ERROR' && !activeLogDetail.resolved && (
                  <button
                    type="button"
                    onClick={() => {
                      resolveLog(activeLogDetail.id);
                      setActiveLogDetail({ ...activeLogDetail, resolved: true });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tandai Selesai</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveLogDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
