import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  RefreshCw,
  Wrench,
  LayoutGrid,
  Users,
  BadgeCheck,
  ShieldX,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  MapPin,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const PAGE_SIZE = 20;

function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = pageCount(total);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <p className="text-xs text-slate-400">
        Halaman <span className="font-bold text-white">{page}</span> / {pages} — {total} data
      </p>
      <div className="flex gap-1">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onChange(Math.min(pages, page + 1))} disabled={page >= pages} className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={classNames('animate-pulse rounded-xl bg-slate-800/80', className)} />;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: LucideIcon; color: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/60 p-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-white/5', color)}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white tabular-nums">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

type ToastType = 'success' | 'error' | 'info';

export interface JasaProvider {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  city?: string;
  role: string;
  is_banned?: boolean;
  created_at: string;
}

export interface JasaAd {
  id: string;
  user_id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  price_type: 'fixed' | 'nego' | 'hourly';
  city: string;
  whatsapp?: string;
  status: 'active' | 'pending' | 'rejected' | 'suspended';
  views_count: number;
  rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

function PenyediaJasaTab({ adminId, adminEmail, onToast }: { adminId: string; adminEmail: string; onToast: (type: ToastType, msg: string) => void }) {
  const [providers, setProviders] = useState<JasaProvider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [loading, setLoading] = useState(true);
  const onToastRef = useRef(onToast);
  useEffect(() => { onToastRef.current = onToast; }, [onToast]);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users_meta')
        .select('id, email, role, is_banned, created_at', { count: 'exact' })
        .or('role.eq.freelancer,role.eq.seeker')
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter === 'active') query = query.eq('is_banned', false);
      if (statusFilter === 'banned') query = query.eq('is_banned', true);
      if (search.trim()) query = query.ilike('email', `%${search.trim()}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      const ids = (data ?? []).map((u: { id: string }) => u.id);
      let profiles: Array<{ user_id: string; full_name?: string; phone?: string; domicile_city?: string }> = [];
      if (ids.length > 0) {
        const { data: prof } = await supabase.from('seeker_profiles').select('user_id, full_name, phone, domicile_city').in('user_id', ids);
        profiles = prof ?? [];
      }
      const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]));
      const enriched: JasaProvider[] = (data ?? []).map((u: { id: string; email: string; role: string; is_banned?: boolean; created_at: string }) => ({
        id: u.id, email: u.email, role: u.role, is_banned: u.is_banned ?? false, created_at: u.created_at,
        full_name: profileMap[u.id]?.full_name, phone: profileMap[u.id]?.phone, city: profileMap[u.id]?.domicile_city,
      }));
      setProviders(enriched);
      setTotal(count ?? 0);
    } catch (err) {
      onToastRef.current('error', `Gagal memuat penyedia jasa: ${(err as Error).message}`);
    } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleBan = useCallback(async (provider: JasaProvider, ban: boolean) => {
    try {
      const { error } = await supabase.from('users_meta').update({ is_banned: ban }).eq('id', provider.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({ admin_id: adminId, admin_email: adminEmail, action: ban ? 'ban_user' : 'unban_user', target_type: 'jasa_provider', target_id: provider.id, detail: `${ban ? 'Suspend' : 'Aktifkan'} penyedia jasa: ${provider.email}` });
      onToastRef.current('success', `Akun ${provider.email} berhasil ${ban ? 'disuspend' : 'diaktifkan'}`);
      fetchProviders();
    } catch (err) { onToastRef.current('error', `Gagal: ${(err as Error).message}`); }
  }, [adminId, adminEmail, fetchProviders]);

  const stats = useMemo(() => ({ total, active: providers.filter((p) => !p.is_banned).length, banned: providers.filter((p) => p.is_banned).length }), [providers, total]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Penyedia" value={stats.total} icon={Users} color="text-sky-400" />
        <StatCard label="Akun Aktif" value={stats.active} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="Disuspend" value={stats.banned} icon={ShieldX} color="text-rose-400" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Cari email penyedia jasa…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full rounded-xl border border-white/10 bg-slate-800/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'active' | 'banned'); setPage(1); }} className="rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="banned">Disuspend</option>
        </select>
        <button onClick={fetchProviders} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50">
          <RefreshCw className={classNames('h-4 w-4', loading ? 'animate-spin' : '')} /> Refresh
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-slate-900/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Pengguna</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Lokasi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Bergabung</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5"><td className="px-4 py-3" colSpan={5}><SkeletonBlock className="h-8 w-full" /></td></tr>
              ))
            ) : providers.length === 0 ? (
              <tr><td colSpan={5} className="py-16 text-center text-slate-400"><Users className="mx-auto mb-3 h-10 w-10 text-slate-600" /><p className="text-sm">Tidak ada penyedia jasa ditemukan</p></td></tr>
            ) : providers.map((provider) => (
              <tr key={provider.id} className="border-b border-white/5 hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-bold text-cyan-300 border border-cyan-500/20">
                      {(provider.full_name || provider.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate max-w-[160px]">{provider.full_name || '—'}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[160px]">{provider.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{provider.city ? <span className="flex items-center gap-1 text-xs text-slate-300"><MapPin className="h-3.5 w-3.5 text-slate-500" />{provider.city}</span> : <span className="text-xs text-slate-500">—</span>}</td>
                <td className="px-4 py-3">
                  {provider.is_banned ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300"><XCircle className="h-3 w-3" /> Suspended</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Aktif</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{new Date(provider.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3 text-right">
                  {provider.is_banned ? (
                    <button onClick={() => handleBan(provider, false)} className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"><BadgeCheck className="h-3.5 w-3.5" />Aktifkan</button>
                  ) : (
                    <button onClick={() => handleBan(provider, true)} className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"><ShieldX className="h-3.5 w-3.5" />Suspend</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} onChange={setPage} />
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: 'Aktif', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  pending: { label: 'Menunggu', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  rejected: { label: 'Ditolak', className: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  suspended: { label: 'Suspended', className: 'border-slate-500/30 bg-slate-500/10 text-slate-400' },
};
const PRICE_TYPE_LABEL: Record<string, string> = { fixed: 'Harga Pasti', nego: 'Nego', hourly: '/jam' };

function KatalogJasaTab({ adminId, adminEmail, onToast }: { adminId: string; adminEmail: string; onToast: (type: ToastType, msg: string) => void }) {
  const [ads, setAds] = useState<JasaAd[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'rejected' | 'suspended'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detailAd, setDetailAd] = useState<JasaAd | null>(null);
  const onToastRef = useRef(onToast);
  useEffect(() => { onToastRef.current = onToast; }, [onToast]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('jasa_ads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);
      const { data, error, count } = await query;
      if (error && (error as unknown as { code?: string }).code !== 'PGRST116') throw error;
      setAds((data as JasaAd[]) ?? []);
      setTotal(count ?? 0);
    } catch {
      setAds([]); setTotal(0);
    } finally { setLoading(false); }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const handleStatusChange = useCallback(async (ad: JasaAd, newStatus: JasaAd['status']) => {
    try {
      const { error } = await supabase.from('jasa_ads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', ad.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({ admin_id: adminId, admin_email: adminEmail, action: 'toggle_jasa_status', target_type: 'jasa_ad', target_id: ad.id, detail: `Ubah status iklan jasa "${ad.title}" => ${newStatus}` });
      onToastRef.current('success', `Status iklan "${ad.title}" diubah ke ${newStatus}`);
      fetchAds();
    } catch (err) { onToastRef.current('error', `Gagal ubah status: ${(err as Error).message}`); }
  }, [adminId, adminEmail, fetchAds]);

  const handleDelete = useCallback(async (ad: JasaAd) => {
    if (!window.confirm(`Hapus iklan jasa "${ad.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const { error } = await supabase.from('jasa_ads').delete().eq('id', ad.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({ admin_id: adminId, admin_email: adminEmail, action: 'delete_jasa_ad', target_type: 'jasa_ad', target_id: ad.id, detail: `Hapus iklan jasa: "${ad.title}"` });
      onToastRef.current('success', `Iklan "${ad.title}" berhasil dihapus`);
      fetchAds();
    } catch (err) { onToastRef.current('error', `Gagal hapus: ${(err as Error).message}`); }
  }, [adminId, adminEmail, fetchAds]);

  const stats = useMemo(() => ({ total, active: ads.filter((a) => a.status === 'active').length, pending: ads.filter((a) => a.status === 'pending').length }), [ads, total]);
  const categories = useMemo(() => Array.from(new Set(ads.map((a) => a.category).filter(Boolean))), [ads]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Iklan Jasa" value={stats.total} icon={LayoutGrid} color="text-violet-400" />
        <StatCard label="Iklan Aktif" value={stats.active} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="Menunggu Review" value={stats.pending} icon={Clock} color="text-amber-400" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Cari judul iklan jasa…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full rounded-xl border border-white/10 bg-slate-800/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'active' | 'pending' | 'rejected' | 'suspended'); setPage(1); }} className="rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none">
          <option value="all">Semua Status</option><option value="active">Aktif</option><option value="pending">Menunggu</option><option value="rejected">Ditolak</option><option value="suspended">Suspended</option>
        </select>
        {categories.length > 0 && (
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none">
            <option value="all">Semua Kategori</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button onClick={fetchAds} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50">
          <RefreshCw className={classNames('h-4 w-4', loading ? 'animate-spin' : '')} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-48 w-full" />)}</div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Wrench className="mb-4 h-12 w-12 text-slate-600" />
          <p className="text-base font-medium">Belum ada iklan jasa</p>
          <p className="mt-1 text-sm text-slate-500">{total === 0 ? 'Tabel jasa_ads belum tersedia atau belum ada data.' : 'Tidak ada iklan yang cocok dengan filter.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ads.map((ad) => {
            const statusInfo = STATUS_LABEL[ad.status] ?? STATUS_LABEL['pending'];
            return (
              <div key={ad.id} className="group relative rounded-2xl border border-white/8 bg-slate-900/60 p-4 hover:border-violet-500/20 hover:bg-slate-900/80 transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white line-clamp-2 leading-snug">{ad.title}</p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300"><Tag className="h-2.5 w-2.5" />{ad.category || 'Lainnya'}</span>
                      <span className={classNames('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', statusInfo.className)}>{statusInfo.label}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{ad.description || '—'}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mb-4">
                  {ad.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-500" />{ad.city}</span>}
                  {ad.rating != null && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{ad.rating.toFixed(1)} ({ad.review_count ?? 0})</span>}
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-slate-500" />{ad.views_count ?? 0} views</span>
                </div>
                <p className="mb-4 text-sm font-bold text-cyan-300">Rp {ad.price?.toLocaleString('id-ID') ?? '—'}{ad.price_type && <span className="ml-1 text-xs font-normal text-slate-400">{PRICE_TYPE_LABEL[ad.price_type]}</span>}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => setDetailAd(ad)} className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition-colors"><Eye className="h-3.5 w-3.5" />Detail</button>
                  {ad.status !== 'active' && <button onClick={() => handleStatusChange(ad, 'active')} className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"><CheckCircle2 className="h-3.5 w-3.5" />Setujui</button>}
                  {ad.status !== 'rejected' && <button onClick={() => handleStatusChange(ad, 'rejected')} className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"><XCircle className="h-3.5 w-3.5" />Tolak</button>}
                  <button onClick={() => handleDelete(ad)} className="flex items-center gap-1 rounded-lg border border-rose-700/30 bg-rose-700/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-400 hover:bg-rose-700/20 transition-colors ml-auto"><Trash2 className="h-3.5 w-3.5" />Hapus</button>
                </div>
                <p className="mt-2 text-[10px] text-slate-600">Diposting: {new Date(ad.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} total={total} onChange={setPage} />

      {detailAd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setDetailAd(null)}>
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetailAd(null)} className="absolute right-4 top-4 text-slate-400 hover:text-white"><XCircle className="h-5 w-5" /></button>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/25"><Wrench className="h-5 w-5 text-violet-400" /></div>
              <div><p className="font-bold text-white">{detailAd.title}</p><p className="text-xs text-slate-400">{detailAd.category}</p></div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Harga</span><span className="font-semibold text-cyan-300">Rp {detailAd.price?.toLocaleString('id-ID')}<span className="ml-1 text-xs font-normal text-slate-400">{PRICE_TYPE_LABEL[detailAd.price_type]}</span></span></div>
              {detailAd.city && <div className="flex justify-between"><span className="text-slate-400">Lokasi</span><span className="text-slate-200">{detailAd.city}</span></div>}
              {detailAd.whatsapp && <div className="flex justify-between"><span className="text-slate-400">WhatsApp</span><span className="font-mono text-slate-200">{detailAd.whatsapp}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={classNames('rounded-full border px-2 py-0.5 text-[11px] font-semibold', STATUS_LABEL[detailAd.status]?.className)}>{STATUS_LABEL[detailAd.status]?.label}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Views</span><span className="text-slate-200">{detailAd.views_count}</span></div>
            </div>
            {detailAd.description && <div className="mt-4"><p className="mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Deskripsi</p><p className="text-sm text-slate-300 leading-relaxed">{detailAd.description}</p></div>}
            <div className="mt-5 flex gap-2">
              {detailAd.status !== 'active' && <button onClick={() => { handleStatusChange(detailAd, 'active'); setDetailAd(null); }} className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20">Setujui Iklan</button>}
              {detailAd.status !== 'rejected' && <button onClick={() => { handleStatusChange(detailAd, 'rejected'); setDetailAd(null); }} className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20">Tolak Iklan</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type JasaSubTab = 'providers' | 'catalog';

export default function AdminJasa({ adminId, adminEmail, onToast }: { adminId: string; adminEmail: string; onToast: (type: ToastType, msg: string) => void }) {
  const [subTab, setSubTab] = useState<JasaSubTab>('providers');
  const TABS: { key: JasaSubTab; label: string; icon: LucideIcon }[] = [
    { key: 'providers', label: 'Penyedia Jasa', icon: Users },
    { key: 'catalog', label: 'Katalog Iklan Jasa', icon: LayoutGrid },
  ];
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/25">
          <Wrench className="h-5 w-5 text-violet-400" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Manajemen Jasa</h1>
          <p className="text-sm text-slate-400">Kelola penyedia jasa dan katalog iklan layanan di platform LOXER</p>
        </div>
      </div>
      <div className="flex gap-1 rounded-2xl border border-white/8 bg-slate-900/50 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSubTab(key)} className={classNames('flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all', subTab === key ? 'bg-violet-500/15 border border-violet-500/25 text-violet-300 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50')}>
            <Icon className="h-4 w-4" strokeWidth={1.8} />{label}
          </button>
        ))}
      </div>
      {subTab === 'providers' && <PenyediaJasaTab adminId={adminId} adminEmail={adminEmail} onToast={onToast} />}
      {subTab === 'catalog' && <KatalogJasaTab adminId={adminId} adminEmail={adminEmail} onToast={onToast} />}
    </section>
  );
}
