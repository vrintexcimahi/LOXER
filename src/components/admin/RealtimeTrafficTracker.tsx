import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Laptop,
  Maximize2,
  Monitor,
  Navigation,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Tablet,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { resolveAdminToken } from '../../lib/adminUtils';

export interface TrafficLogItem {
  id: string;
  visitorId: string;
  sessionId: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string;
  isGuest: boolean;
  path: string;
  pageTitle: string;
  referrer: string | null;
  deviceType: string;
  browser: string;
  os: string;
  screenRes: string;
  ip: string;
  maskedIp: string;
  city: string;
  country: string;
  network: string;
  language: string;
  timezone: string;
  pixelRatio: string;
  durationSeconds: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  isOnline: boolean;
}

export interface TrafficStatsData {
  stats: {
    totalPv: number;
    totalUv: number;
    guestUv: number;
    registeredUv: number;
    onlineNow: number;
    onlineGuests: number;
    onlineRegistered: number;
    todayPv: number;
    todayUv: number;
    todayGuests: number;
  };
  trend: Array<{
    date: string;
    pv: number;
    uv: number;
    guest_uv: number;
    registered_uv: number;
  }>;
  topPages: Array<{
    path: string;
    title: string | null;
    views: number;
    unique_visitors: number;
    avg_duration: number;
  }>;
  devices: Array<{
    device: string;
    count: number;
  }>;
  os: Array<{
    os_name: string;
    count: number;
  }>;
  browsers: Array<{
    browser_name: string;
    count: number;
  }>;
  logs: TrafficLogItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '< 5 detik';
  if (seconds < 60) return `${seconds} dtk`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} menit`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}j ${remMins}m`;
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return 'Baru saja';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 15) return 'Baru saja';
    if (diffSec < 60) return `${diffSec} detik lalu`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  } catch {
    return dateStr;
  }
}

export default function RealtimeTrafficTracker({
  onToast,
}: {
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}) {
  const { session } = useAuth();

  // Polling & Auto-refresh State
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(5);
  const [countdown, setCountdown] = useState<number>(5);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date>(new Date());

  // Privacy: Mask vs Unmask IP
  const [showFullIp, setShowFullIp] = useState<boolean>(true);

  // Filters & Search
  const [filterType, setFilterType] = useState<'all' | 'online' | 'guest' | 'registered' | 'mobile' | 'desktop'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Selected Log for Deep Inspection Modal
  const [selectedLog, setSelectedLog] = useState<TrafficLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Data State
  const [data, setData] = useState<TrafficStatsData | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data
  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setIsRefreshing(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          filter: filterType,
          search: debouncedSearch.trim(),
        });

        let token = session?.access_token;
        if (!token) {
          try {
            token = await resolveAdminToken();
          } catch {
            token = typeof window !== 'undefined'
              ? (localStorage.getItem('loxer_local_auth_token_admin') || localStorage.getItem('loxer_local_auth_token'))
              : null;
          }
        }

        const res = await fetch(`/api/admin/traffic/stats?${params.toString()}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const payload: TrafficStatsData = await res.json();
          setData(payload);
          setLastFetchedAt(new Date());
        }
      } catch (err) {
        console.error('[RealtimeTrafficTracker] Fetch error:', err);
      } finally {
        setIsRefreshing(false);
        setInitialLoading(false);
      }
    },
    [page, pageSize, filterType, debouncedSearch, session?.access_token]
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval timer
  useEffect(() => {
    if (!isLiveActive || refreshIntervalSec <= 0) return;

    setCountdown(refreshIntervalSec);
    const ticker = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData(true);
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [isLiveActive, refreshIntervalSec, fetchData]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (onToast) onToast('info', 'Teks disalin ke clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    if (!data?.logs?.length) return;
    const blob = new Blob([JSON.stringify(data.logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loxer-traffic-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onToast) onToast('success', 'File JSON log pengunjung berhasil diunduh');
  };

  const handleExportCsv = () => {
    if (!data?.logs?.length) return;
    const headers = [
      'Waktu',
      'Status Online',
      'IP Address',
      'Kota',
      'Negara',
      'Role',
      'Email',
      'Path',
      'Page Title',
      'Perangkat',
      'Browser',
      'OS',
      'Resolusi',
      'Durasi Detik',
      'Referrer',
      'Visitor ID',
      'Session ID',
    ];
    const rows = data.logs.map((l) => [
      `"${l.createdAt}"`,
      l.isOnline ? 'ONLINE' : 'OFFLINE',
      `"${l.ip}"`,
      `"${l.city || '—'}"`,
      `"${l.country || 'ID'}"`,
      `"${l.userRole}"`,
      `"${l.userEmail || 'Guest'}"`,
      `"${l.path}"`,
      `"${(l.pageTitle || '').replace(/"/g, '""')}"`,
      `"${l.deviceType}"`,
      `"${l.browser}"`,
      `"${l.os}"`,
      `"${l.screenRes}"`,
      l.durationSeconds,
      `"${(l.referrer || '').replace(/"/g, '""')}"`,
      `"${l.visitorId}"`,
      `"${l.sessionId}"`,
    ]);

    const csvContent = '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loxer-traffic-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onToast) onToast('success', 'File CSV log pengunjung berhasil diunduh');
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-amber-400" />;
      default:
        return <Monitor className="w-4 h-4 text-sky-400" />;
    }
  };

  const getRoleBadge = (log: TrafficLogItem) => {
    if (log.isGuest) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <Users className="w-3 h-3 text-slate-400" />
          Tamu Publik
        </span>
      );
    }
    if (log.userRole === 'employer') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Shield className="w-3 h-3 text-purple-400" />
          Perusahaan (HR)
        </span>
      );
    }
    if (log.userRole === 'admin' || log.userRole === 'superadmin') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Zap className="w-3 h-3 text-amber-400" />
          Administrator
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <UserCheck className="w-3 h-3 text-emerald-400" />
        Pencari Kerja
      </span>
    );
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* 1. Header Toolbar with Real-time Status & Live Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-gradient-to-br from-white via-slate-50 to-sky-50/30 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-950 p-5 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              {isLiveActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  isLiveActive ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </span>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-sky-900 to-cyan-900 dark:from-white dark:via-sky-200 dark:to-cyan-200 bg-clip-text text-transparent">
              Deteksi Trafik & Pengunjung Real-time
            </h2>
            <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {isLiveActive ? 'LIVE ACTIVE' : 'PAUSED'}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>
              Memantau setiap pengunjung yang mengakses <strong className="text-sky-600 dark:text-sky-400 font-medium">https://loxer.web.id</strong> secara langsung dengan detail IP, perangkat, rute halaman, dan durasi aktif.
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              · Update: {lastFetchedAt.toLocaleTimeString('id-ID')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Play / Pause Button */}
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              isLiveActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
            title={isLiveActive ? 'Jeda pembaruan otomatis' : 'Mulai pembaruan otomatis'}
          >
            {isLiveActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLiveActive ? `Live (${countdown}s)` : 'Jeda'}</span>
          </button>

          {/* Interval Selector */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 p-0.5 text-xs">
            {[3, 5, 10, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setRefreshIntervalSec(sec);
                  setCountdown(sec);
                }}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-all ${
                  refreshIntervalSec === sec
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchData(false)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
            title="Segarkan data sekarang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          {/* IP Mask Toggle */}
          <button
            onClick={() => setShowFullIp(!showFullIp)}
            className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
            title={showFullIp ? 'Sensor 2 oktet terakhir IP' : 'Tampilkan IP address publik penuh'}
          >
            {showFullIp ? <Eye className="w-3.5 h-3.5 text-sky-500" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{showFullIp ? 'IP Penuh' : 'IP Sensor'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all"
              title="Unduh data log ke CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all"
              title="Unduh data log ke JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-time Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Online Now */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Online Sekarang</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-300">
            {data?.stats?.onlineNow ?? 0}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {data?.stats?.onlineGuests ?? 0} tamu · {data?.stats?.onlineRegistered ?? 0} member
          </div>
        </div>

        {/* Card 2: Today PV */}
        <div className="rounded-2xl border border-sky-500/20 bg-white dark:bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Kunjungan Hari Ini</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {data?.stats?.todayPv?.toLocaleString('id-ID') ?? 0}
          </div>
          <div className="mt-1 text-[10px] text-sky-600 dark:text-sky-400 font-medium">
            {data?.stats?.todayUv ?? 0} pengunjung unik
          </div>
        </div>

        {/* Card 3: Total Page Views */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Total Page Views</span>
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {data?.stats?.totalPv?.toLocaleString('id-ID') ?? 0}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Akumulasi seluruh rute
          </div>
        </div>

        {/* Card 4: Total Unique Visitors */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Total Pengunjung</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {data?.stats?.totalUv?.toLocaleString('id-ID') ?? 0}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Berdasarkan Visitor ID
          </div>
        </div>

        {/* Card 5: Tamu Publik (Guest) */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Pengunjung Tamu</span>
            <Globe className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {data?.stats?.guestUv?.toLocaleString('id-ID') ?? 0}
          </div>
          <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            {data?.stats?.totalUv
              ? Math.round(((data.stats.guestUv || 0) / (data.stats.totalUv || 1)) * 100)
              : 0}
            % dari total
          </div>
        </div>

        {/* Card 6: Member Terdaftar */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Pengguna Login</span>
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {data?.stats?.registeredUv?.toLocaleString('id-ID') ?? 0}
          </div>
          <div className="mt-1 text-[10px] text-purple-600 dark:text-purple-400 font-medium">
            {data?.stats?.totalUv
              ? Math.round(((data.stats.registeredUv || 0) / (data.stats.totalUv || 1)) * 100)
              : 0}
            % dari total
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-sm">
        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Semua Kunjungan', icon: Activity },
            { id: 'online', label: '🟢 Online Sekarang', icon: Radio },
            { id: 'guest', label: 'Tamu (Guest)', icon: Users },
            { id: 'registered', label: 'Pengguna Terdaftar', icon: UserCheck },
            { id: 'mobile', label: 'Mobile (HP)', icon: Smartphone },
            { id: 'desktop', label: 'Desktop / PC', icon: Laptop },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterType(tab.id as typeof filterType);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari IP, rute path, kota, browser, email..."
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 py-2 pl-9 pr-8 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Granular Visitor Table */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">Status & Waktu</th>
                <th className="py-3 px-4">Pengunjung / Akun</th>
                <th className="py-3 px-4">Alamat IP & Kota</th>
                <th className="py-3 px-4">Halaman yang Dibuka (Path)</th>
                <th className="py-3 px-4">Perangkat & Browser</th>
                <th className="py-3 px-4">Durasi Aktif</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {initialLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
                    <span>Memuat data trafik pengunjung...</span>
                  </td>
                </tr>
              ) : !data?.logs?.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">Belum ada data kunjungan yang cocok.</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => {
                  const displayIp = showFullIp ? log.ip : log.maskedIp;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 1. Status & Waktu */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            {log.isOnline && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            )}
                            <span
                              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                log.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            />
                          </span>
                          <div>
                            <span
                              className={`font-semibold ${
                                log.isOnline
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {log.isOnline ? 'Online Sekarang' : formatRelativeTime(log.createdAt)}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Pengunjung & Akun */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {getRoleBadge(log)}
                            {log.userEmail && (
                              <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[150px]">
                                {log.userEmail}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <span>ID: {log.visitorId.slice(0, 14)}...</span>
                            <button
                              onClick={() => copyToClipboard(log.visitorId, `vis-${log.id}`)}
                              className="hover:text-sky-500"
                              title="Salin Visitor ID"
                            >
                              {copiedId === `vis-${log.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 3. Alamat IP & Kota */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                            <span>{displayIp}</span>
                            <button
                              onClick={() => copyToClipboard(log.ip, `ip-${log.id}`)}
                              className="text-slate-400 hover:text-sky-500"
                              title="Salin IP Publik"
                            >
                              {copiedId === `ip-${log.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span>🇮🇩 {log.city && log.city !== '—' ? log.city : 'Indonesia'}</span>
                            {log.network && log.network !== '—' && (
                              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.2 text-[9px] uppercase font-bold text-slate-500">
                                {log.network}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Halaman yang Dibuka (Path) */}
                      <td className="py-3 px-4">
                        <div className="max-w-[200px] lg:max-w-[260px] space-y-0.5">
                          <a
                            href={log.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 truncate"
                            title={`Buka rute: ${log.path}`}
                          >
                            <span className="truncate">{log.path}</span>
                          </a>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={log.pageTitle}>
                            {log.pageTitle || 'Beranda LOXER'}
                          </div>
                          {log.referrer && (
                            <div className="text-[9px] text-slate-400 truncate" title={`Referrer: ${log.referrer}`}>
                              Ref: {log.referrer.replace(/^https?:\/\//, '')}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Perangkat & Browser */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5">
                            {getDeviceIcon(log.deviceType)}
                          </div>
                          <div className="space-y-0.5 text-[11px]">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {log.browser}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {log.os} · {log.screenRes}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 6. Durasi Aktif */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDuration(log.durationSeconds)}</span>
                          </div>
                          <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(10, (log.durationSeconds / 300) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Aksi Inspeksi */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 hover:border-sky-300 dark:hover:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-all"
                        >
                          <Maximize2 className="w-3 h-3 text-sky-500" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-4 py-3 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.pagination.total)} dari {data.pagination.total} log pengunjung
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <span className="font-semibold px-2 text-slate-700 dark:text-slate-300">
                Hal {page} / {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page >= data.pagination.totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Summary Widgets: Top Pages & Device Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Widget 1: Top Visited Pages */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-sky-500" />
              Halaman Terpopuler (Top Pages)
            </h3>
            <span className="text-[10px] text-slate-400">Diurutkan berdasarkan views</span>
          </div>

          <div className="space-y-2">
            {data?.topPages?.slice(0, 5).map((page, idx) => (
              <div
                key={page.path}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 p-2.5 text-xs border border-slate-100 dark:border-white/5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {page.path}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {page.title || 'Beranda'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {page.views.toLocaleString('id-ID')}
                    </div>
                    <div className="text-[9px] text-slate-400">views</div>
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatDuration(Math.round(page.avg_duration || 0))}
                    </div>
                    <div className="text-[9px] text-slate-400">rata-rata</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 2: Device & Browser Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
              Distribusi Perangkat
            </h3>
            <div className="space-y-2">
              {data?.devices?.map((d) => {
                const total = data.devices.reduce((acc, curr) => acc + curr.count, 0) || 1;
                const pct = Math.round((d.count / total) * 100);
                return (
                  <div key={d.device} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                        {d.device}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {d.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-500" />
              Browser Teratas
            </h3>
            <div className="space-y-1.5">
              {data?.browsers?.slice(0, 4).map((b) => (
                <div key={b.browser_name} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                    {b.browser_name}
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white font-semibold">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Deep Inspection Modal / Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {selectedLog.isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      selectedLog.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Inspeksi Detail Kunjungan Pengunjung
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Summary Pill */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 border border-slate-100 dark:border-white/5 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Alamat IP</span>
                <strong className="font-mono text-sky-600 dark:text-sky-400">{selectedLog.ip}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Lokasi Kota</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedLog.city || 'Indonesia'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Perangkat</span>
                <strong className="text-slate-800 dark:text-slate-200 capitalize">{selectedLog.deviceType}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Durasi Dwell</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{formatDuration(selectedLog.durationSeconds)}</strong>
              </div>
            </div>

            {/* Granular Field List */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 dark:border-white/5 p-3 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Identitas Pengunjung</span>
                  <div><strong>Visitor ID:</strong> <span className="font-mono">{selectedLog.visitorId}</span></div>
                  <div><strong>Session ID:</strong> <span className="font-mono">{selectedLog.sessionId}</span></div>
                  <div><strong>Tipe Akun:</strong> {selectedLog.isGuest ? 'Tamu Publik' : `Terdaftar (${selectedLog.userRole})`}</div>
                  {selectedLog.userEmail && <div><strong>Email:</strong> {selectedLog.userEmail}</div>}
                  {selectedLog.userId && <div><strong>User ID:</strong> <span className="font-mono">{selectedLog.userId}</span></div>}
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-white/5 p-3 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Lingkungan Perangkat</span>
                  <div><strong>Browser:</strong> {selectedLog.browser}</div>
                  <div><strong>Sistem Operasi:</strong> {selectedLog.os}</div>
                  <div><strong>Resolusi Layar:</strong> {selectedLog.screenRes}</div>
                  <div><strong>Skala Piksel:</strong> {selectedLog.pixelRatio}</div>
                  <div><strong>Bahasa:</strong> {selectedLog.language}</div>
                  <div><strong>Zona Waktu:</strong> {selectedLog.timezone}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-white/5 p-3 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Rute & Rujukan Navigasi</span>
                <div><strong>Path:</strong> <span className="font-mono text-sky-500">{selectedLog.path}</span></div>
                <div><strong>Judul Halaman:</strong> {selectedLog.pageTitle}</div>
                <div><strong>Referrer:</strong> {selectedLog.referrer || 'Akses Langsung (Direct)'}</div>
                <div><strong>Waktu Kunjungan:</strong> {new Date(selectedLog.createdAt).toLocaleString('id-ID')}</div>
              </div>

              {/* Raw Forensic JSON */}
              <div className="space-y-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Payload Metadata JSON</span>
                <pre className="rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-sky-300 overflow-x-auto max-h-40 border border-white/10">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                onClick={() => {
                  setSearchQuery(selectedLog.ip);
                  setSelectedLog(null);
                }}
                className="rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 px-3.5 py-2 text-xs font-semibold"
              >
                Filter Seluruh Aktivitas IP Ini
              </button>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-2 text-xs font-semibold hover:opacity-90"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
