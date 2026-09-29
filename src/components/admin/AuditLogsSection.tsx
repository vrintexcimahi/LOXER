import { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  X,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuditLog } from '../../lib/types';
import { exportToCsv } from '../../lib/employerFeatures';

const ACTION_COLORS: Record<string, string> = {
  ban_user: 'bg-red-500/20 text-red-300 border-red-500/30',
  delete_user: 'bg-red-700/20 text-red-400 border-red-700/30',
  change_role: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  verify_company: 'bg-green-500/20 text-green-300 border-green-500/30',
  unverify_company: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  delete_job: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  delete_application: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  toggle_job_status: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  force_update_status: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  create_user: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  update_profile: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
};

const PAGE_SIZE = 20;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export default function AuditLogsSection() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPayload, setSelectedPayload] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      if (!supabase) return;
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false });

      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (targetFilter !== 'all') query = query.eq('target_type', targetFilter);
      if (adminFilter.trim()) query = query.ilike('admin_email', `%${adminFilter.trim()}%`);
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

      const { data, count, error } = await query.range(from, to);

      if (!isMounted) return;

      if (error) {
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setRows((data || []) as AuditLog[]);
      setTotal(count || 0);
      setLoading(false);
    };

    void fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [page, actionFilter, targetFilter, adminFilter, dateFrom, dateTo]);

  const hasActiveFilters = actionFilter !== 'all' || targetFilter !== 'all' || adminFilter || dateFrom || dateTo;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const headers = ['ID', 'Waktu', 'Admin Email', 'Admin ID', 'Aksi', 'Target Type', 'Target ID', 'Detail Payload'];
    const data = rows.map((r) => [
      r.id,
      new Date(r.created_at).toLocaleString('id-ID'),
      r.admin_email || '',
      r.admin_id,
      r.action,
      r.target_type,
      r.target_id || '',
      r.detail || '',
    ]);
    exportToCsv(`audit_logs_${new Date().toISOString().slice(0, 10)}`, headers, data);
  };

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formatted JSON helper
  const parsedDetail = useMemo(() => {
    if (!selectedPayload?.detail) return null;
    try {
      return JSON.stringify(JSON.parse(selectedPayload.detail), null, 2);
    } catch {
      return selectedPayload.detail;
    }
  }, [selectedPayload]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-up">
      {/* KPI Cards for Audit Log */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Riwayat Audit</p>
            <p className="mt-1 text-2xl font-bold text-white tracking-tight">{total.toLocaleString('id-ID')}</p>
            <p className="mt-1 text-[11px] text-slate-500">Tercatat permanen di database</p>
          </div>
          <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400 border border-cyan-500/20 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Log Ditampilkan</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300 tracking-tight">{rows.length} record</p>
            <p className="mt-1 text-[11px] text-slate-500">Halaman {page} dari {totalPages}</p>
          </div>
          <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400 border border-purple-500/20 shrink-0">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Status Keamanan</p>
            <p className="mt-1 text-base font-bold text-emerald-400 tracking-tight">Audit Trail Aktif</p>
            <p className="mt-1 text-[11px] text-slate-500">Integritas aksi admin terverifikasi</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Filter className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Filter &amp; Pencarian Audit Log</h3>
              <p className="text-[11px] text-slate-400">Telusuri riwayat perubahan data, role, dan tindakan administratif.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setActionFilter('all');
                  setTargetFilter('all');
                  setAdminFilter('');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-medium text-cyan-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh CSV ({rows.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Aksi Admin</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Semua Aksi</option>
              {Object.keys(ACTION_COLORS).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Target Entitas</label>
            <select
              value={targetFilter}
              onChange={(e) => {
                setTargetFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Semua Target</option>
              <option value="user">User</option>
              <option value="job">Job</option>
              <option value="company">Company</option>
              <option value="application">Application</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Email Admin</label>
            <input
              value={adminFilter}
              onChange={(e) => {
                setAdminFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Cari email admin..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl scrollbar-thin scrollbar-thumb-slate-700">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-xl bg-slate-800/80" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-800/80" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-800/80" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-800/80" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
            <p className="font-semibold text-slate-300 text-sm">Tidak ada riwayat audit log yang cocok</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Coba sesuaikan filter atau reset untuk melihat semua riwayat aktivitas.'
                : 'Aktivitas administratif seperti penyesuaian role, moderasi, atau perubahan entitas akan otomatis tercatat di sini.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left w-44">Waktu</th>
                <th className="px-4 py-3 text-left w-52">Admin</th>
                <th className="px-4 py-3 text-left w-44">Aksi</th>
                <th className="px-4 py-3 text-left w-32">Target</th>
                <th className="px-4 py-3 text-left">Detail Payload</th>
                <th className="px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`text-slate-300 transition-colors ${
                    idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                  }`}
                >
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap font-mono">
                    {new Date(row.created_at).toLocaleString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-200 truncate max-w-[200px]" title={row.admin_email || row.admin_id}>
                    {row.admin_email || row.admin_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={classNames(
                        'inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold border',
                        ACTION_COLORS[row.action] || 'bg-slate-500/20 text-slate-200 border-current/20'
                      )}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium">
                      {row.target_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono truncate max-w-[280px]" title={row.detail || '-'}>
                    {row.detail || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedPayload(row)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-medium transition cursor-pointer"
                      title="Lihat detail payload lengkap"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-lg text-xs text-slate-400">
        <p>
          Menampilkan <span className="text-white font-semibold">{rows.length}</span> dari{' '}
          <span className="text-white font-semibold">{total}</span> total record audit
        </p>

        <div className="flex items-center gap-2">
          <span>
            Halaman <span className="text-white font-semibold">{page}</span> dari{' '}
            <span className="text-white font-semibold">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/15 bg-slate-900 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Activity className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">Detail Payload Audit Log</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {selectedPayload.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayload(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/50 border border-white/5">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Waktu Kejadian</span>
                  <span className="text-slate-200 font-medium">
                    {new Date(selectedPayload.created_at).toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Aksi</span>
                  <span className="font-semibold text-cyan-300">{selectedPayload.action}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Admin Operator</span>
                  <span className="text-slate-200 font-medium">{selectedPayload.admin_email || selectedPayload.admin_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Target Entity</span>
                  <span className="text-slate-200 font-medium">{selectedPayload.target_type} ({selectedPayload.target_id || 'N/A'})</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 font-medium">Raw Payload (Detail JSON):</label>
                  <button
                    type="button"
                    onClick={() => handleCopyPayload(parsedDetail || '')}
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Tersalin' : 'Salin Payload'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl border border-white/10 bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                  {parsedDetail || '(Kosong)'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-5 py-3 border-t border-white/10 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition cursor-pointer"
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
