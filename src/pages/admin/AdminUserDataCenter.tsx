import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Layers,
  ArrowUpDown,
  Laptop,
} from 'lucide-react';
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

export default function AdminUserDataCenter() {
  const { session } = useAuth();
  const [rows, setRows] = useState<UserDataRow[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & pagination
  const [search, setSearch] = useState('');
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        search: search.trim(),
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

      const token = session?.access_token || (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);
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
      console.error('[AdminUserDataCenter] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, role, status, deviceFilter, osFilter, browserFilter, pwaFilter, activityFilter, sort, sortOrder, session?.access_token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load user detail when selected
  useEffect(() => {
    if (!selectedUserId) {
      setDetailData(null);
      return;
    }

    let isMounted = true;
    setLoadingDetail(true);

    const token = session?.access_token || (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);
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
    if (r === 'admin') return <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30">Admin</span>;
    if (r === 'employer') return <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/30">Perusahaan</span>;
    return <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/30">Pelamar</span>;
  };

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
            Monitoring identitas, perangkat, kapabilitas layar, IP, dan aktivitas user secara real-time.
          </p>
        </div>
        <button
          onClick={() => loadData()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Segarkan
        </button>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 min-[1800px]:grid-cols-7 gap-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-slate-400">Total User</div>
            <div className="mt-1 text-xl font-bold text-white">{stats.totalUsers}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-emerald-400">User Aktif</div>
            <div className="mt-1 text-xl font-bold text-white">{stats.activeUsers}</div>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Online (5m)
            </div>
            <div className="mt-1 text-xl font-bold text-cyan-300">{stats.onlineUsers}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-slate-400">Mobile</div>
            <div className="mt-1 text-xl font-bold text-white">{stats.mobileUsers}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-slate-400">Tablet</div>
            <div className="mt-1 text-xl font-bold text-white">{stats.tabletUsers}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-slate-400">Desktop</div>
            <div className="mt-1 text-xl font-bold text-white">{stats.desktopUsers}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-slate-400">PWA Mode</div>
            <div className="mt-1 text-xl font-bold text-white">{stats.pwaUsers}</div>
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

      {/* Table & Responsive Mobile Cards */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                <th className="px-3.5 py-3 font-semibold">Resolusi</th>
                <th className="px-3.5 py-3 font-semibold">UI Mode</th>
                <th className="px-3.5 py-3 font-semibold">PWA</th>
                <th className="px-3.5 py-3 font-semibold">Timezone</th>
                <th className="px-3.5 py-3 font-semibold">Aktif Terakhir</th>
                <th className="px-3.5 py-3 font-semibold">Terdaftar</th>
                <th className="px-3.5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={17} className="px-4 py-4 text-center text-slate-500">
                      Memuat data pengguna & device...
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data pengguna yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3.5 py-3 font-mono text-slate-500">{u.index}</td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white border border-white/10">
                          {u.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="truncate max-w-[140px] font-medium text-white" title={u.name}>
                          {u.name || '—'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 truncate max-w-[150px] text-slate-400" title={u.email}>
                      {u.email || '—'}
                    </td>
                    <td className="px-3.5 py-3">{getRoleBadge(u.role)}</td>
                    <td className="px-3.5 py-3">
                      {u.isBanned ? (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <XCircle className="h-3.5 w-3.5" /> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5 capitalize text-slate-200">
                        {getDeviceIcon(u.deviceType)}
                        <span>{u.deviceType || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 truncate max-w-[120px]" title={u.deviceModel || ''}>
                      {u.deviceModel || '—'}
                    </td>
                    <td className="px-3.5 py-3">{u.os || '—'}</td>
                    <td className="px-3.5 py-3 truncate max-w-[110px]" title={u.browser || ''}>
                      {u.browser || '—'}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[11px] text-cyan-300/90">
                      {u.lastIp || u.maskedIp || '—'}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-400">{u.resolution || '—'}</td>
                    <td className="px-3.5 py-3 text-[11px] text-slate-400">{u.uiProfile || '—'}</td>
                    <td className="px-3.5 py-3">
                      {u.pwa ? (
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300 font-bold border border-cyan-500/30">
                          PWA
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Browser</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-slate-400 truncate max-w-[90px]" title={u.timezone || ''}>
                      {u.timezone || '—'}
                    </td>
                    <td className="px-3.5 py-3">
                      {u.isOnline ? (
                        <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="text-slate-400">{formatRelativeTime(u.lastActive || undefined)}</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        onClick={() => setSelectedUserId(u.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-white/10">
          {loading ? (
            <div className="p-6 text-center text-slate-500 text-sm">Memuat data pengguna...</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">Tidak ada data pengguna.</div>
          ) : (
            rows.map((u) => (
              <div key={u.id} className="p-4 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white border border-white/10">
                      {u.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{u.name}</div>
                      <div className="text-slate-400">{u.email}</div>
                    </div>
                  </div>
                  {getRoleBadge(u.role)}
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950/60 p-3 text-[11px] border border-white/5">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    {getDeviceIcon(u.deviceType)}
                    <span>{u.deviceModel || u.deviceType || '—'}</span>
                  </div>
                  <div className="text-right text-slate-400">{u.os || '—'} • {u.browser || '—'}</div>
                  <div className="font-mono text-cyan-400">{u.lastIp || u.maskedIp || '—'}</div>
                  <div className="text-right">
                    {u.isOnline ? (
                      <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="text-slate-400">{formatRelativeTime(u.lastActive || undefined)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    Daftar: {new Date(u.createdAt).toLocaleDateString('id-ID')}
                  </span>
                  <button
                    onClick={() => setSelectedUserId(u.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-300 font-medium"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Buka Detail
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
          <div>
            Menampilkan <span className="font-semibold text-white">{rows.length}</span> dari{' '}
            <span className="font-semibold text-white">{total}</span> pengguna
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/10 p-1.5 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-white/10 p-1.5 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Detail Modal / Bottom Sheet */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-fade-up">
            {/* Visual drag handle for mobile bottom sheet */}
            <div className="sm:hidden flex justify-center pt-1 pb-2">
              <div className="bottom-sheet-handle" />
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Detail Pengguna & Device</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedUserId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-slate-400">Memuat profil dan riwayat perangkat...</div>
            ) : detailData ? (
              <div className="space-y-6 text-sm">
                {/* Account Info */}
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Informasi Akun</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Nama Lengkap:</span>
                      <p className="font-semibold text-white">{detailData.user.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Email:</span>
                      <p className="font-semibold text-white">{detailData.user.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Role:</span>
                      <p className="mt-0.5">{getRoleBadge(detailData.user.role)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Nomor HP:</span>
                      <p className="font-semibold text-white">{detailData.user.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Kota Domisili:</span>
                      <p className="font-semibold text-white">{detailData.user.city || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tanggal Daftar:</span>
                      <p className="font-semibold text-white">
                        {new Date(detailData.user.createdAt).toLocaleString('id-ID')}
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
                        <p className="font-semibold text-white capitalize">{String(detailData.currentDevice.device_type || '—')}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">UI Profile:</span>
                        <p className="font-semibold text-cyan-300">{String(detailData.currentDevice.ui_profile || '—')}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">OS:</span>
                        <p className="font-semibold text-white">
                          {String(detailData.currentDevice.os_name || '—')} {String(detailData.currentDevice.os_version || '')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Browser:</span>
                        <p className="font-semibold text-white">
                          {String(detailData.currentDevice.browser_name || '—')} {String(detailData.currentDevice.browser_version || '')}
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
                        <p className="font-mono text-white">{String(detailData.currentDevice.pixel_ratio || 1)}x</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Touch Support:</span>
                        <p className="font-semibold text-white">
                          {detailData.currentDevice.touch ? `Ya (${detailData.currentDevice.max_touch_points || 1} poin)` : 'Tidak'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Mode PWA:</span>
                        <p className="font-semibold text-white">{detailData.currentDevice.pwa ? 'Aktif' : 'Browser'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Timezone:</span>
                        <p className="font-semibold text-white">{String(detailData.currentDevice.timezone || '—')}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">IP Terakhir:</span>
                        <p className="font-mono text-cyan-300">{String(detailData.currentDevice.last_ip || '—')}</p>
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
                          <span className="text-[11px] text-slate-400">{formatRelativeTime(a.created_at)}</span>
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
