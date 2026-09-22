import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldX,
  CheckCircle2,
  XCircle,
  Laptop,
} from 'lucide-react';
import { formatRelativeTime } from '../../lib/adminUtils';
import { useAuth } from '../../contexts/useAuth';

interface DeviceRow {
  id: string;
  deviceId: string;
  userId: string | null;
  userEmail: string;
  userName: string;
  deviceType: string;
  uiProfile: string;
  deviceModel: string;
  os: string;
  browser: string;
  resolution: string;
  ip: string;
  pwa: boolean;
  isRevoked: boolean;
  isOnline: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export default function AdminDeviceManagement() {
  const { session } = useAuth();
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deviceType, setDeviceType] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        search: debouncedSearch.trim(),
        device_type: deviceType,
      });

      const token = session?.access_token || (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);
      const res = await fetch(`/api/admin/devices?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('[AdminDeviceManagement] Error loading devices:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, deviceType, session?.access_token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRevoke = async (deviceId: string) => {
    setRevokingId(deviceId);
    try {
      const token = session?.access_token || (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);
      const res = await fetch('/api/admin/devices/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ deviceId }),
      });

      if (res.ok) {
        setConfirmRevokeId(null);
        await loadData();
      }
    } catch (err) {
      console.error('[AdminDeviceManagement] Error revoking device:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getDeviceIcon = (type: string) => {
    if (type === 'mobile') return <Smartphone className="h-4 w-4 text-cyan-400" />;
    if (type === 'tablet') return <Tablet className="h-4 w-4 text-purple-400" />;
    if (type === 'desktop-touch') return <Laptop className="h-4 w-4 text-emerald-400" />;
    if (type === 'desktop') return <Monitor className="h-4 w-4 text-blue-400" />;
    return <Globe className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Smartphone className="h-6 w-6 text-cyan-400" />
            Registry Perangkat (Device Center)
          </h2>
          <p className="text-sm text-slate-400">
            Daftar seluruh perangkat yang terhubung ke LOXER, status otentikasi, dan revoke akses.
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

      {/* Search & Filter */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Device ID, user, model HP/PC, browser, OS..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <select
          value={deviceType}
          onChange={(e) => {
            setDeviceType(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">Semua Tipe Device</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
          <option value="desktop">Desktop</option>
          <option value="desktop-touch">Desktop Touch</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Device ID</th>
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">OS</th>
                <th className="px-4 py-3 font-semibold">Browser</th>
                <th className="px-4 py-3 font-semibold">IP Terakhir</th>
                <th className="px-4 py-3 font-semibold">PWA</th>
                <th className="px-4 py-3 font-semibold">Pertama Kali</th>
                <th className="px-4 py-3 font-semibold">Aktif Terakhir</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={12} className="px-4 py-4 text-center text-slate-500">
                      Memuat data registry perangkat...
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada perangkat yang terdaftar.
                  </td>
                </tr>
              ) : (
                rows.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 capitalize font-medium text-white">
                        {getDeviceIcon(d.deviceType)}
                        <span>{d.deviceType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white truncate max-w-[130px]">{d.userName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[130px]">{d.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 truncate max-w-[120px]" title={d.deviceId}>
                      {d.deviceId.slice(0, 14)}...
                    </td>
                    <td className="px-4 py-3 truncate max-w-[110px]" title={d.deviceModel}>{d.deviceModel}</td>
                    <td className="px-4 py-3">{d.os}</td>
                    <td className="px-4 py-3">{d.browser}</td>
                    <td className="px-4 py-3 font-mono text-cyan-300 text-[11px]">{d.ip}</td>
                    <td className="px-4 py-3">
                      {d.pwa ? (
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300 font-bold border border-cyan-500/30">
                          PWA
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Browser</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(d.firstSeenAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d.isOnline ? (
                        <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="text-slate-400">{formatRelativeTime(d.lastSeenAt)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.isRevoked ? (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <XCircle className="h-3.5 w-3.5" /> Dicabut
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Terhubung
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!d.isRevoked && (
                        <button
                          onClick={() => setConfirmRevokeId(d.deviceId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/20 transition-colors"
                        >
                          <ShieldX className="h-3.5 w-3.5" />
                          Cabut
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
          <div>
            Menampilkan <span className="font-semibold text-white">{rows.length}</span> dari{' '}
            <span className="font-semibold text-white">{total}</span> perangkat
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

      {/* Confirmation Modal / Bottom Sheet */}
      {confirmRevokeId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-red-500/30 bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-fade-up">
            <div className="sm:hidden flex justify-center pb-1">
              <div className="bottom-sheet-handle" />
            </div>
            <div className="flex items-center gap-3 text-red-400">
              <ShieldX className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Cabut Akses Perangkat?</h3>
            </div>
            <p className="text-sm text-slate-300">
              Perangkat dengan ID ini tidak akan lagi diizinkan mengakses sesi aktif dan akan diminta login kembali.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmRevokeId(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Batal
              </button>
              <button
                onClick={() => handleRevoke(confirmRevokeId)}
                disabled={revokingId === confirmRevokeId}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {revokingId === confirmRevokeId ? 'Mencabut...' : 'Ya, Cabut Akses'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
