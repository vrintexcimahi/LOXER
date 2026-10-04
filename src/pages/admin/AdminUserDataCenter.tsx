import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Layers,
  ArrowUpDown,
  Laptop,
  Activity,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  Compass,
  UserCheck,
  UserX,
  Copy,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatRelativeTime } from '../../lib/adminUtils';
import { useAuth } from '../../contexts/useAuth';

interface UserDataRow {
  index: number;
  id: string;
  email: string;
  name: string;
  role: 'seeker' | 'employer' | 'admin';
  isBanned: boolean;
  isOnline: boolean;
  deviceId: string | null;
  deviceType: string | null;
  uiProfile: string | null;
  deviceModel: string | null;
  os: string | null;
  browser: string | null;
  lastIp: string | null;
  maskedIp: string | null;
  resolution: string | null;
  pwa: boolean;
  timezone: string | null;
  lastActive: string | null;
  createdAt: string;
}

interface SummaryStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  mobileUsers: number;
  tabletUsers: number;
  desktopUsers: number;
  pwaUsers: number;
}

interface UserDetailData {
  user: {
    id: string;
    email: string;
    role: string;
    isBanned: boolean;
    createdAt: string;
    name: string;
    phone: string;
    city: string;
  };
  currentDevice: Record<string, unknown> | null;
  devices: Array<{
    id: string;
    device_id: string;
    device_type: string;
    ui_profile: string;
    device_model: string | null;
    os_name: string | null;
    browser_name: string | null;
    last_ip: string | null;
    last_seen_at: string;
    pwa: number;
    is_revoked: number;
  }>;
  activities: Array<{
    id: string;
    event_type: string;
    created_at: string;
    ip_address: string | null;
    metadata: string | Record<string, unknown>;
  }>;
  preferences: Record<string, unknown> | null;
}

interface TrafficStatsPayload {
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
    title: string;
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
  logs: Array<{
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
    durationSeconds: number;
    createdAt: string;
    isOnline: boolean;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function AdminUserDataCenter() {
  const { session } = useAuth();

  // Tab View: 'analytics' | 'logs' | 'users'
  const [activeTab, setActiveTab] = useState<'analytics' | 'logs' | 'users'>('analytics');

  // Traffic & Analytics State
  const [trafficData, setTrafficData] = useState<TrafficStatsPayload | null>(null);
  const [loadingTraffic, setLoadingTraffic] = useState(true);
  const [trafficLogFilter, setTrafficLogFilter] = useState<'all' | 'guest' | 'registered'>('all');
  const [trafficLogSearch, setTrafficLogSearch] = useState('');
  const [debouncedLogSearch, setDebouncedLogSearch] = useState('');
  const [trafficLogPage, setTrafficLogPage] = useState(1);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Registered Users State
  const [rows, setRows] = useState<UserDataRow[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Registered Users Filters & pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [osFilter, setOsFilter] = useState('all');
  const [browserFilter, setBrowserFilter] = useState('all');
  const [pwaFilter, setPwaFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [sort, setSort] = useState('last_active');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selected user detail modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<UserDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLogSearch(trafficLogSearch);
      setTrafficLogPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [trafficLogSearch]);

  // Load Traffic Stats & Live Logs
  const loadTrafficData = useCallback(async () => {
    setLoadingTraffic(true);
    try {
      const params = new URLSearchParams({
        page: String(trafficLogPage),
        page_size: '25',
        filter: trafficLogFilter,
        search: debouncedLogSearch.trim(),
      });

      const token =
        session?.access_token ||
        (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);

      const res = await fetch(`/api/admin/traffic/stats?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data: TrafficStatsPayload = await res.json();
        setTrafficData(data);
      }
    } catch (err) {
      console.error('[AdminUserDataCenter] Error loading traffic stats:', err);
    } finally {
      setLoadingTraffic(false);
    }
  }, [trafficLogPage, trafficLogFilter, debouncedLogSearch, session?.access_token]);

  // Load Registered Users
  const loadUsersData = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        search: debouncedSearch.trim(),
        role,
        status,
        device: deviceFilter,
        os: osFilter,
        browser: browserFilter,
        pwa: pwaFilter,
        activity: activityFilter,
        sort,
        order: sortOrder,
      });

      const token =
        session?.access_token ||
        (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);

      const res = await fetch(`/api/admin/user-data?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('[AdminUserDataCenter] Error loading users data:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [
    page,
    debouncedSearch,
    role,
    status,
    deviceFilter,
    osFilter,
    browserFilter,
    pwaFilter,
    activityFilter,
    sort,
    sortOrder,
    session?.access_token,
  ]);

  // Initial & Tab triggered load
  useEffect(() => {
    loadTrafficData();
  }, [loadTrafficData]);

  useEffect(() => {
    loadUsersData();
  }, [loadUsersData]);

  // Auto-refresh traffic stats every 30 seconds for real-time monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      loadTrafficData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadTrafficData]);

  // Load user detail when selected
  useEffect(() => {
    if (!selectedUserId) {
      setDetailData(null);
      return;
    }

    let isMounted = true;
    setLoadingDetail(true);

    const token =
      session?.access_token ||
      (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);

    fetch(`/api/admin/users/detail?id=${selectedUserId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setDetailData(data);
      })
      .catch((err) => console.error('[AdminUserDataCenter] Detail error:', err))
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedUserId, session?.access_token]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getDeviceIcon = (type: string | null) => {
    if (type === 'mobile') return <Smartphone className="h-4 w-4 text-cyan-400" />;
    if (type === 'tablet') return <Tablet className="h-4 w-4 text-purple-400" />;
    if (type === 'desktop-touch') return <Laptop className="h-4 w-4 text-emerald-400" />;
    if (type === 'desktop') return <Monitor className="h-4 w-4 text-blue-400" />;
    return <Globe className="h-4 w-4 text-slate-400" />;
  };

  const getRoleBadge = (r: string) => {
    if (r === 'admin' || r === 'superadmin') {
      return (
        <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
          Admin
        </span>
      );
    }
    if (r === 'employer') {
      return (
        <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/30">
          Perusahaan
        </span>
      );
    }
    return (
      <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/30">
        Pelamar
      </span>
    );
  };

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIp(text);
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '< 5 dtk';
    if (seconds < 60) return `${seconds} dtk`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m} menit`;
  };

  const tStats = trafficData?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-cyan-400" />
            Data Pengguna & Device Intelligence
          </h2>
          <p className="text-sm text-slate-400">
            Monitoring trafik web akurat, tracking pengunjung tamu (belum daftar) dan user terdaftar secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadTrafficData();
              loadUsersData();
            }}
            disabled={loadingTraffic || loadingUsers}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingTraffic || loadingUsers ? 'animate-spin text-cyan-400' : ''}`}
            />
            Segarkan Data
          </button>
        </div>
      </div>

      {/* Primary Traffic & Visitor Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Kunjungan (PV) */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Total Kunjungan (PV)</span>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {tStats ? tStats.totalPv.toLocaleString() : '—'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-400 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>+{tStats?.todayPv || 0} hari ini</span>
          </div>
        </div>

        {/* Card 2: Pengunjung Unik (Total UV) */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Pengunjung Unik (UV)</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {tStats ? tStats.totalUv.toLocaleString() : '—'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
            <span>+{tStats?.todayUv || 0} pengunjung hari ini</span>
          </div>
        </div>

        {/* Card 3: Tamu Belum Terdaftar (Guest UV) */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-amber-300 mb-1.5">
            <span>Tamu Belum Daftar</span>
            <UserX className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300 tracking-tight">
            {tStats ? tStats.guestUv.toLocaleString() : '—'}
          </div>
          <div className="mt-2 text-[11px] text-amber-400/80 font-medium">
            {tStats && tStats.totalUv > 0
              ? `${Math.round((tStats.guestUv / tStats.totalUv) * 100)}% dari seluruh trafik`
              : 'Tercatat otomatis'}
          </div>
        </div>

        {/* Card 4: User Terdaftar (Registered UV) */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-emerald-300 mb-1.5">
            <span>User Terdaftar</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 tracking-tight">
            {tStats ? tStats.registeredUv.toLocaleString() : '—'}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/80 font-medium">
            {stats?.totalUsers || 0} akun aktif di database
          </div>
        </div>

        {/* Card 5: Online Real-Time Pulse */}
        <div className="col-span-2 lg:col-span-1 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-slate-900/80 p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-cyan-300 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              Online Sekarang
            </span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {tStats ? tStats.onlineNow : 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">perangkat aktif</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
            <span className="text-amber-300 font-semibold">{tStats?.onlineGuests || 0} Tamu</span>
            <span>•</span>
            <span className="text-emerald-300 font-semibold">{tStats?.onlineRegistered || 0} User</span>
          </div>
        </div>
      </div>

      {/* Navigation View Switcher */}
      <div className="flex items-center border-b border-white/10 gap-2 pb-px overflow-x-auto text-sm">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Analitik Trafik & Tren Pengunjung
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Activity className="h-4 w-4" />
          Log Kunjungan Real-Time (Tamu & User)
          {trafficData?.pagination?.total ? (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {trafficData.pagination.total}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Users className="h-4 w-4" />
          Database Akun Terdaftar ({total})
        </button>
      </div>

      {/* TAB 1: Analitik Trafik & Tren Pengunjung */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Traffic Growth Trend Chart */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-cyan-400" />
                  Tren Pertumbuhan Trafik & Pengunjung (14 Hari Terakhir)
                </h3>
                <p className="text-xs text-slate-400">
                  Data akurat perbandingan Kunjungan Halaman (PV), Pengunjung Unik Total (UV), dan Pengunjung Tamu.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-300">Total Kunjungan (PV)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-300">Pengunjung Unik (UV)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-slate-300">Tamu Belum Daftar</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              {trafficData?.trend && trafficData.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorGuest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(val) => {
                        const parts = val.split('-');
                        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                      }}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pv"
                      name="Total Pageviews (PV)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPv)"
                    />
                    <Area
                      type="monotone"
                      dataKey="uv"
                      name="Pengunjung Unik (UV)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorUv)"
                    />
                    <Area
                      type="monotone"
                      dataKey="guest_uv"
                      name="Tamu Belum Daftar"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorGuest)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Belum ada data grafik trafik yang cukup untuk ditampilkan.
                </div>
              )}
            </div>
          </div>

          {/* Top Pages & Device Distribution Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Visited Pages (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <Compass className="h-5 w-5 text-cyan-400" />
                Halaman Paling Populer Dikunjungi
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Distribusi kunjungan halaman, judul rute, jumlah tampilan, dan rata-rata durasi menetap.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold">Rute / Halaman</th>
                      <th className="px-3.5 py-2.5 font-semibold text-center">Tampilan (PV)</th>
                      <th className="px-3.5 py-2.5 font-semibold text-center">Pengunjung (UV)</th>
                      <th className="px-3.5 py-2.5 font-semibold text-right">Rata-rata Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {trafficData?.topPages && trafficData.topPages.length > 0 ? (
                      trafficData.topPages.map((tp, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors font-sans">
                          <td className="px-3.5 py-3">
                            <div className="font-semibold text-white font-mono text-xs text-cyan-300">
                              {tp.path}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {tp.title || '—'}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-center font-bold text-white font-mono">
                            {tp.views.toLocaleString()}
                          </td>
                          <td className="px-3.5 py-3 text-center font-semibold text-cyan-400 font-mono">
                            {tp.unique_visitors.toLocaleString()}
                          </td>
                          <td className="px-3.5 py-3 text-right text-slate-300 text-xs">
                            {formatDuration(Math.round(tp.avg_duration))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-sans">
                          Belum ada log halaman tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Device & OS Intelligence Breakdown (1 col) */}
            <div className="space-y-4">
              {/* Device Type Card */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Smartphone className="h-4 w-4 text-cyan-400" />
                  Distribusi Perangkat Pengunjung
                </h4>
                <div className="space-y-2.5 text-xs">
                  {trafficData?.devices && trafficData.devices.length > 0 ? (
                    trafficData.devices.map((d, i) => {
                      const totalCount = trafficData.devices.reduce((acc, curr) => acc + curr.count, 0);
                      const pct = totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="capitalize flex items-center gap-1.5">
                              {getDeviceIcon(d.device)}
                              {d.device}
                            </span>
                            <span className="font-mono text-cyan-400">
                              {d.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-cyan-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-500">Belum ada data perangkat.</p>
                  )}
                </div>
              </div>

              {/* OS & Browser Card */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Monitor className="h-4 w-4 text-purple-400" />
                  Sistem Operasi & Browser
                </h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1.5">
                      Top Sistem Operasi:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {trafficData?.os && trafficData.os.length > 0 ? (
                        trafficData.os.map((o, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg border border-white/5 bg-slate-800/80 px-2.5 py-1 text-slate-300 font-mono text-[11px]"
                          >
                            {o.os_name}: <strong className="text-white">{o.count}</strong>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1.5">
                      Top Browser:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {trafficData?.browsers && trafficData.browsers.length > 0 ? (
                        trafficData.browsers.map((b, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg border border-white/5 bg-slate-800/80 px-2.5 py-1 text-slate-300 font-mono text-[11px]"
                          >
                            {b.browser_name}: <strong className="text-white">{b.count}</strong>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Log Kunjungan Real-Time (Tamu & User) */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Controls & Filter */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari rute, IP, email, ID pengunjung, OS, browser..."
                  value={trafficLogSearch}
                  onChange={(e) => setTrafficLogSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Segmented Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => {
                    setTrafficLogFilter('all');
                    setTrafficLogPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    trafficLogFilter === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({trafficData?.stats?.totalPv || 0})
                </button>
                <button
                  onClick={() => {
                    setTrafficLogFilter('guest');
                    setTrafficLogPage(1);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    trafficLogFilter === 'guest'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserX className="h-3 w-3" />
                  Tamu Belum Daftar
                </button>
                <button
                  onClick={() => {
                    setTrafficLogFilter('registered');
                    setTrafficLogPage(1);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    trafficLogFilter === 'registered'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="h-3 w-3" />
                  User Terdaftar
                </button>
              </div>
            </div>
          </div>

          {/* Visitor Logs Table */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-3.5 py-3 font-semibold">Status / Waktu</th>
                    <th className="px-3.5 py-3 font-semibold">Tipe Pengunjung</th>
                    <th className="px-3.5 py-3 font-semibold">Identitas / Visitor ID</th>
                    <th className="px-3.5 py-3 font-semibold">Halaman Dikunjungi</th>
                    <th className="px-3.5 py-3 font-semibold">Perangkat & OS</th>
                    <th className="px-3.5 py-3 font-semibold">Browser & Layar</th>
                    <th className="px-3.5 py-3 font-semibold">Alamat IP</th>
                    <th className="px-3.5 py-3 font-semibold text-right">Durasi Menetap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingTraffic ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="px-4 py-4 text-center text-slate-500">
                          Memuat data log pengunjung...
                        </td>
                      </tr>
                    ))
                  ) : trafficData?.logs && trafficData.logs.length > 0 ? (
                    trafficData.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        {/* Waktu & Online Pulse */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {log.isOnline ? (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                              </span>
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                            )}
                            <span className="font-medium text-white">
                              {formatRelativeTime(log.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* Tipe Pengunjung Badge */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {log.isGuest ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                              <UserX className="h-3 w-3" />
                              Tamu Belum Daftar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                              <UserCheck className="h-3 w-3" />
                              {log.userRole === 'admin'
                                ? 'Admin'
                                : log.userRole === 'employer'
                                ? 'Perusahaan'
                                : 'User Akun'}
                            </span>
                          )}
                        </td>

                        {/* Identitas / Visitor ID */}
                        <td className="px-3.5 py-3">
                          {log.userEmail ? (
                            <div>
                              <div className="font-semibold text-white">{log.userEmail}</div>
                              <div className="font-mono text-[10px] text-slate-500 truncate max-w-[130px]">
                                ID: {log.userId}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono text-slate-400 text-xs font-semibold">
                                {log.visitorId.slice(0, 16)}...
                              </span>
                              <div className="text-[10px] text-slate-500">Tamu Anonim</div>
                            </div>
                          )}
                        </td>

                        {/* Halaman Dikunjungi */}
                        <td className="px-3.5 py-3">
                          <div className="font-mono font-semibold text-cyan-300 text-xs">
                            {log.path}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {log.pageTitle || '—'}
                          </div>
                        </td>

                        {/* Perangkat & OS */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-white">
                            {getDeviceIcon(log.deviceType)}
                            <span className="capitalize">{log.deviceType}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{log.os}</div>
                        </td>

                        {/* Browser & Layar */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="text-slate-300">{log.browser}</div>
                          <div className="font-mono text-[11px] text-slate-500">{log.screenRes}</div>
                        </td>

                        {/* Alamat IP */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-300 text-xs">
                              {log.ip || '—'}
                            </span>
                            {log.ip && (
                              <button
                                onClick={() => copyToClipboard(log.ip)}
                                className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                                title="Salin IP"
                              >
                                {copiedIp === log.ip ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Durasi Menetap */}
                        <td className="px-3.5 py-3 text-right whitespace-nowrap font-mono text-cyan-400 font-semibold">
                          <div className="flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {formatDuration(log.durationSeconds)}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Tidak ada log kunjungan yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Logs */}
            {trafficData?.pagination && trafficData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 bg-slate-950/60 text-xs text-slate-400">
                <div>
                  Halaman {trafficData.pagination.page} dari {trafficData.pagination.totalPages} (Total {trafficData.pagination.total} kunjungan)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTrafficLogPage((p) => Math.max(1, p - 1))}
                    disabled={trafficData.pagination.page <= 1}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setTrafficLogPage((p) => Math.min(trafficData.pagination.totalPages, p + 1))}
                    disabled={trafficData.pagination.page >= trafficData.pagination.totalPages}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Database Akun Terdaftar (Real Users Only) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* User Stats Mini Ribbon */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div className="text-[11px] text-slate-400">Total Akun</div>
                <div className="text-lg font-bold text-white">{stats.totalUsers}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div className="text-[11px] text-emerald-400">Akun Aktif</div>
                <div className="text-lg font-bold text-white">{stats.activeUsers}</div>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                <div className="text-[11px] text-cyan-300">Online (5m)</div>
                <div className="text-lg font-bold text-cyan-300">{stats.onlineUsers}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div className="text-[11px] text-slate-400">Mobile</div>
                <div className="text-lg font-bold text-white">{stats.mobileUsers}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div className="text-[11px] text-slate-400">Tablet</div>
                <div className="text-lg font-bold text-white">{stats.tabletUsers}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div className="text-[11px] text-slate-400">Desktop</div>
                <div className="text-lg font-bold text-white">{stats.desktopUsers}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div className="text-[11px] text-slate-400">PWA Mode</div>
                <div className="text-lg font-bold text-white">{stats.pwaUsers}</div>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari user, email, model HP/PC, browser, OS, ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">Semua Role</option>
                  <option value="seeker">Seeker</option>
                  <option value="employer">Employer</option>
                  <option value="admin">Admin</option>
                </select>

                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Active</option>
                  <option value="banned">Suspended</option>
                </select>

                <select
                  value={deviceFilter}
                  onChange={(e) => {
                    setDeviceFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">Semua Device</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                  <option value="desktop">Desktop</option>
                  <option value="desktop-touch">Desktop Touch</option>
                </select>

                <select
                  value={osFilter}
                  onChange={(e) => {
                    setOsFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">Semua OS</option>
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                  <option value="Windows">Windows</option>
                  <option value="macOS">macOS</option>
                  <option value="Linux">Linux</option>
                  <option value="Other">Lainnya</option>
                </select>

                <select
                  value={browserFilter}
                  onChange={(e) => {
                    setBrowserFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">Semua Browser</option>
                  <option value="Chrome">Chrome</option>
                  <option value="Safari">Safari</option>
                  <option value="Edge">Edge</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Samsung Internet">Samsung Internet</option>
                  <option value="Other">Lainnya</option>
                </select>

                <select
                  value={pwaFilter}
                  onChange={(e) => {
                    setPwaFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">PWA & Browser</option>
                  <option value="pwa">PWA Only</option>
                  <option value="browser">Browser Only</option>
                </select>

                <select
                  value={activityFilter}
                  onChange={(e) => {
                    setActivityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">Semua Aktivitas</option>
                  <option value="online">Online (5 Menit)</option>
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="30days">30 Hari Terakhir</option>
                  <option value="inactive">Tidak Aktif</option>
                </select>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="last_active">Urut: Aktif Terakhir</option>
                  <option value="created_at">Urut: Tanggal Daftar</option>
                  <option value="name">Urut: Nama</option>
                  <option value="email">Urut: Email</option>
                </select>

                <button
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  title="Ganti Arah Urutan"
                  className="rounded-lg border border-white/10 bg-slate-950 p-2 text-slate-300 hover:text-white"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Table View for Users */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-3.5 py-3 font-semibold">No</th>
                    <th className="px-3.5 py-3 font-semibold">User</th>
                    <th className="px-3.5 py-3 font-semibold">Email</th>
                    <th className="px-3.5 py-3 font-semibold">Role</th>
                    <th className="px-3.5 py-3 font-semibold">Status</th>
                    <th className="px-3.5 py-3 font-semibold">Device</th>
                    <th className="px-3.5 py-3 font-semibold">Model / Merk</th>
                    <th className="px-3.5 py-3 font-semibold">OS</th>
                    <th className="px-3.5 py-3 font-semibold">Browser</th>
                    <th className="px-3.5 py-3 font-semibold">IP Terakhir</th>
                    <th className="px-3.5 py-3 font-semibold">Aktif Terakhir</th>
                    <th className="px-3.5 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingUsers ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={12} className="px-4 py-4 text-center text-slate-500">
                          Memuat data pengguna & device...
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                        Tidak ada pengguna ditemukan.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-3.5 py-3 font-mono text-slate-500">{r.index}</td>
                        <td className="px-3.5 py-3 font-medium text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {r.isOnline ? (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                              </span>
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                            )}
                            <span className="truncate max-w-[140px] font-semibold">{r.name}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-slate-300 font-mono text-xs">{r.email}</td>
                        <td className="px-3.5 py-3 whitespace-nowrap">{getRoleBadge(r.role)}</td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {r.isBanned ? (
                            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-300 border border-red-500/30">
                              Suspended
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {getDeviceIcon(r.deviceType)}
                            <span className="capitalize">{r.deviceType || '—'}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-slate-300 truncate max-w-[120px]">
                          {r.deviceModel || '—'}
                        </td>
                        <td className="px-3.5 py-3 text-slate-300 truncate max-w-[100px]">{r.os || '—'}</td>
                        <td className="px-3.5 py-3 text-slate-300 truncate max-w-[100px]">
                          {r.browser || '—'}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-cyan-300 text-xs">
                          {r.lastIp || '—'}
                        </td>
                        <td className="px-3.5 py-3 text-slate-300 whitespace-nowrap">
                          {formatRelativeTime(r.lastActive)}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedUserId(r.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-slate-700 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Users */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 bg-slate-950/60 text-xs text-slate-400">
                <div>
                  Halaman {page} dari {totalPages} (Total {total} pengguna)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Selanjutnya
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-2.5 border border-cyan-500/20">
                  <User className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Detail Pengguna & Profil Perangkat</h3>
                  <p className="text-xs text-slate-400">ID: {selectedUserId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-cyan-400 mb-2" />
                Memuat detail pengguna...
              </div>
            ) : detailData ? (
              <div className="space-y-5">
                {/* Account Summary */}
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Informasi Akun
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Nama:</span>
                      <p className="font-semibold text-white">{detailData.user.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span>
                      <p className="font-mono text-cyan-300">{detailData.user.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Role:</span>
                      <div className="mt-0.5">{getRoleBadge(detailData.user.role)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Status Akun:</span>
                      <p className="font-semibold">
                        {detailData.user.isBanned ? (
                          <span className="text-red-400">Suspended</span>
                        ) : (
                          <span className="text-emerald-400">Aktif</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Nomor Telepon:</span>
                      <p className="font-semibold text-white">{detailData.user.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Terdaftar Sejak:</span>
                      <p className="font-semibold text-white">
                        {new Date(detailData.user.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current / Latest Device Specs */}
                {detailData.currentDevice && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4" />
                      Spesifikasi Device Terakhir
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400">Tipe Perangkat:</span>
                        <p className="font-semibold text-white capitalize">
                          {String(detailData.currentDevice.device_type || '—')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">UI Profile:</span>
                        <p className="font-semibold text-cyan-300">
                          {String(detailData.currentDevice.ui_profile || '—')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">OS:</span>
                        <p className="font-semibold text-white">
                          {String(detailData.currentDevice.os_name || '—')}{' '}
                          {String(detailData.currentDevice.os_version || '')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Browser:</span>
                        <p className="font-semibold text-white">
                          {String(detailData.currentDevice.browser_name || '—')}{' '}
                          {String(detailData.currentDevice.browser_version || '')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Layar Fisik:</span>
                        <p className="font-mono text-white">
                          {detailData.currentDevice.screen_width && detailData.currentDevice.screen_height
                            ? `${detailData.currentDevice.screen_width} × ${detailData.currentDevice.screen_height}`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Viewport:</span>
                        <p className="font-mono text-white">
                          {detailData.currentDevice.viewport_width && detailData.currentDevice.viewport_height
                            ? `${detailData.currentDevice.viewport_width} × ${detailData.currentDevice.viewport_height}`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Pixel Ratio:</span>
                        <p className="font-mono text-white">
                          {String(detailData.currentDevice.pixel_ratio || 1)}x
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Touch Support:</span>
                        <p className="font-semibold text-white">
                          {detailData.currentDevice.touch
                            ? `Ya (${detailData.currentDevice.max_touch_points || 1} poin)`
                            : 'Tidak'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Mode PWA:</span>
                        <p className="font-semibold text-white">
                          {detailData.currentDevice.pwa ? 'Aktif' : 'Browser'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Timezone:</span>
                        <p className="font-semibold text-white">
                          {String(detailData.currentDevice.timezone || '—')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">IP Terakhir:</span>
                        <p className="font-mono text-cyan-300">
                          {String(detailData.currentDevice.last_ip || '—')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Aktif Terakhir:</span>
                        <p className="font-semibold text-white">
                          {formatRelativeTime(detailData.currentDevice.last_seen_at as string)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Device History List */}
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Daftar Perangkat Terdaftar ({detailData.devices.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                    {detailData.devices.length === 0 ? (
                      <p className="text-slate-500">Belum ada perangkat tercatat.</p>
                    ) : (
                      detailData.devices.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/80 p-2.5"
                        >
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(d.device_type)}
                            <div>
                              <p className="font-semibold text-white">
                                {d.device_model || d.device_type} • {d.os_name} • {d.browser_name}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                ID: {d.device_id.slice(0, 18)}... | IP: {d.last_ip || '—'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-slate-400">
                              {formatRelativeTime(d.last_seen_at)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Activity Logs */}
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Aktivitas Terakhir ({detailData.activities.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                    {detailData.activities.length === 0 ? (
                      <p className="text-slate-500">Belum ada catatan aktivitas.</p>
                    ) : (
                      detailData.activities.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/60 p-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            <span className="font-semibold text-white capitalize">
                              {a.event_type.replace(/_/g, ' ')}
                            </span>
                            {a.ip_address && (
                              <span className="text-[11px] font-mono text-slate-500">({a.ip_address})</span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {formatRelativeTime(a.created_at)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-red-400">Gagal memuat detail pengguna.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
