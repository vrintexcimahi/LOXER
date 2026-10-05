import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Layers,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import BrandText from '../../components/ui/BrandText';
import { childLink, tenantPrefix, tenantRequest, type ChildTenant, type TenantMember } from '../../lib/tenantApi';
import PartnerBannerCarousel from '../../components/partner/PartnerBannerCarousel';

export default function ChildPanel({ initialTenant }: { initialTenant: ChildTenant }) {
  const [tenant, setTenant] = useState(initialTenant);
  const storageKey = `loxer:tenant-session:${initialTenant.id}`;
  const [token, setToken] = useState(() => sessionStorage.getItem(storageKey) || '');
  const [me, setMe] = useState<{ member: Pick<TenantMember, 'display_name' | 'role'>; can_manage: boolean } | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Active dashboard tab: 'members' | 'branding' | 'guide'
  const [activeTab, setActiveTab] = useState<'members' | 'branding' | 'guide'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const path = window.location.pathname.slice(tenantPrefix().length) || '/';
  const registering = path === '/register';
  const authenticating = registering || path === '/login';
  const dashboard = path === '/partner' || path === '/dashboard';
  const knownPath = ['/', '/login', '/register', '/partner', '/dashboard'].includes(path);

  const publicBranchUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${tenant.slug}`
    : `https://loxer.web.id/p/${tenant.slug}`;

  // Fetch current authenticated user in branch
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    tenantRequest<{ member: Pick<TenantMember, 'display_name' | 'role'>; can_manage: boolean }>('/me', {
      token,
      signal: controller.signal,
    })
      .then(setMe)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setMe(null);
        }
      });
    return () => controller.abort();
  }, [token]);

  // Fetch members when in dashboard
  useEffect(() => {
    if (!token || !me?.can_manage || !dashboard) return;
    const controller = new AbortController();
    tenantRequest<{ rows: TenantMember[]; total: number }>(`/members?page=${page}`, {
      token,
      signal: controller.signal,
    })
      .then((data) => {
        setMembers(data.rows);
        setTotal(data.total);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setMembers([]);
          setError(err.message);
        }
      });
    return () => controller.abort();
  }, [token, me?.can_manage, dashboard, page]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const body = {
      email: String(form.get('email')),
      password: String(form.get('password')),
      ...(registering
        ? {
            display_name: String(form.get('display_name')),
            role: String(form.get('role')),
          }
        : {}),
    };
    try {
      if (registering) {
        const result = await tenantRequest<{ message: string }>('/register', { method: 'POST', body });
        setNotice(result.message);
      } else {
        const result = await tenantRequest<{ session: { access_token: string } }>('/login', { method: 'POST', body });
        sessionStorage.setItem(storageKey, result.session.access_token);
        setToken(result.session.access_token);
        window.location.assign(childLink('/partner'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permintaan gagal.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await tenantRequest('/logout', { token, method: 'POST', body: {} });
    } catch {
      // Local state must still clear when network is unavailable
    } finally {
      sessionStorage.removeItem(storageKey);
      setToken('');
      setMe(null);
      setMembers([]);
      setBusy(false);
      window.location.assign(childLink('/'));
    }
  }

  async function saveBranding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(
      ['display_name', 'hero_title', 'description', 'logo_url', 'whatsapp'].map((key) => [
        key,
        String(form.get(key) || ''),
      ])
    );
    try {
      const data = await tenantRequest<{ tenant: ChildTenant }>('/branding', { token, method: 'PATCH', body });
      setTenant(data.tenant);
      setNotice('Tampilan cabang berhasil disimpan dan disinkronkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Perubahan gagal disimpan.');
    } finally {
      setBusy(false);
    }
  }

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicBranchUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filter members by search query and role
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      (m.display_name && m.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || m.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Calculate quick stats
  const seekerCount = members.filter((m) => m.role === 'seeker').length;
  const employerCount = members.filter((m) => m.role === 'employer').length;

  const inputClass =
    'w-full mt-1.5 rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-xs sm:text-sm';

  return (
    <main className="min-h-screen bg-[#071527] text-white selection:bg-cyan-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071527]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href={childLink('/')} aria-label="Beranda cabang" className="flex items-center gap-2">
              <BrandText />
              <span className="rounded-full bg-cyan-500/10 border border-cyan-400/30 px-2 py-0.5 text-[9px] font-bold text-cyan-300 uppercase tracking-widest hidden sm:inline-block">
                CHILD PANEL
              </span>
            </a>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-semibold text-white truncate max-w-[200px]">
                {tenant.display_name}
              </span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <a
              href={childLink('/')}
              className={`px-3 py-1.5 rounded-lg transition ${
                path === '/' ? 'text-cyan-300 bg-cyan-950/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Beranda Cabang
            </a>

            {me?.can_manage && (
              <a
                href={childLink('/partner')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  dashboard
                    ? 'text-slate-950 bg-gradient-to-r from-amber-300 to-amber-400 font-bold shadow'
                    : 'text-amber-300 hover:text-white bg-amber-500/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Dashboard Mitra</span>
              </a>
            )}

            {token ? (
              <button
                disabled={busy}
                onClick={logout}
                className="flex items-center gap-1.5 text-slate-400 hover:text-rose-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={childLink('/login')}
                  className="px-3 py-1.5 text-slate-300 hover:text-white rounded-lg transition"
                >
                  Masuk
                </a>
                <a
                  href={childLink('/register')}
                  className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-4 py-2 font-bold transition shadow-sm"
                >
                  Daftar di Cabang
                </a>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Branch Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-12 w-12 object-contain rounded-xl bg-white p-1 shadow"
              />
            ) : (
              <div className="p-3 bg-amber-400/15 border border-amber-400/30 rounded-xl text-amber-300">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white">{tenant.display_name}</h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mitra Resmi
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                /p/{tenant.slug} · Arsitektur Multi-Tenant Terenkripsi
              </p>
            </div>
          </div>

          {/* Quick link sharing */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="rounded-xl border border-white/15 bg-slate-950 hover:bg-slate-850 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5"
              title="Salin tautan cabang publik"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salin Link</span>
                </>
              )}
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Kunjungi bursa lowongan kerja resmi kami di ${tenant.display_name}: ${publicBranchUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bagikan WA</span>
            </a>

            <a
              href={childLink('/')}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Preview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Global Error & Notice Alerts */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-200 flex items-center gap-3 animate-fade-in"
          >
            <div className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-200 flex items-center gap-3 animate-fade-in"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* 1. ROUTE NOT FOUND */}
        {!knownPath ? (
          <section className="text-center py-16 space-y-4 max-w-md mx-auto">
            <h2 className="text-2xl font-bold">Halaman Belum Tersedia</h2>
            <p className="text-sm text-slate-400">
              Modul ini belum tersedia di cabang {tenant.display_name}.
            </p>
            <a
              className="inline-flex items-center gap-2 text-cyan-300 hover:underline text-sm font-semibold"
              href={childLink('/')}
            >
              Kembali ke Beranda Cabang
              <ArrowRight size={15} />
            </a>
          </section>
        ) : authenticating ? (
          /* 2. AUTHENTICATION MODE: LOGIN / REGISTER DI CABANG */
          <section className="max-w-md mx-auto rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
                PORTAL ANGGOTA CABANG
              </span>
              <h2 className="text-2xl font-black text-white">
                {registering ? 'Daftar Akun Baru' : 'Masuk ke Cabang'}
              </h2>
              <p className="text-xs text-slate-400">
                {tenant.display_name} · Mitra Resmi Terverifikasi
              </p>
            </div>

            <form onSubmit={authenticate} className="space-y-4 pt-2">
              {registering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Nama Lengkap *
                  </label>
                  <input
                    name="display_name"
                    maxLength={100}
                    required
                    autoComplete="name"
                    placeholder="Contoh: Budi Santoso"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Alamat Email *
                </label>
                <input
                  name="email"
                  type="email"
                  maxLength={254}
                  required
                  autoComplete="email"
                  placeholder="nama@email.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Password *
                </label>
                <input
                  name="password"
                  type="password"
                  minLength={registering ? 8 : 1}
                  maxLength={128}
                  required
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className={inputClass}
                />
                {registering && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Minimal 8 karakter untuk keamanan akun.
                  </span>
                )}
              </div>

              {registering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Tipe Keanggotaan
                  </label>
                  <select name="role" className={inputClass}>
                    <option value="seeker">Pencari Kerja (Job Seeker)</option>
                    <option value="employer">Penyedia Loker (Perusahaan / UMKM)</option>
                    <option value="freelancer">Penyedia Jasa Mandiri</option>
                    <option value="customer">Pelanggan Umum</option>
                  </select>
                </div>
              )}

              <button
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 py-3 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
              >
                {busy
                  ? 'Memproses...'
                  : registering
                  ? 'Buat Akun di Cabang Ini'
                  : 'Masuk Sekarang'}
              </button>
            </form>

            <div className="border-t border-white/10 pt-4 text-center text-xs text-slate-400">
              {registering ? 'Sudah memiliki akun di cabang ini?' : 'Belum memiliki akun?'}{' '}
              <a
                className="text-cyan-300 hover:underline font-bold"
                href={childLink(registering ? '/login' : '/register')}
              >
                {registering ? 'Masuk di sini' : 'Daftar gratis'}
              </a>
            </div>
          </section>
        ) : dashboard && me?.can_manage ? (
          /* 3. DASHBOARD MITRA: RUANG KERJA KELOLA CABANG (OPTIMIZED WITH CAROUSEL BANNER & BENTO STATS) */
          <section className="space-y-8 animate-fade-in">
            {/* CAROUSEL BANNER MITRA DI ATAS DASHBOARD */}
            <div>
              <PartnerBannerCarousel variant="dashboard" className="mb-8" />
            </div>

            {/* BENTO KPI STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total Akun</span>
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white font-mono">{total}</p>
                <span className="text-[11px] text-cyan-300 font-medium">Terdaftar di cabang</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Pencari Kerja</span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white font-mono">{seekerCount}</p>
                <span className="text-[11px] text-emerald-300 font-medium">Kandidat aktif</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Perusahaan / Loker</span>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white font-mono">{employerCount}</p>
                <span className="text-[11px] text-amber-300 font-medium">Mitra penyedia kerja</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Status Kemitraan</span>
                  <div className="h-8 w-8 rounded-lg bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-300">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-base font-bold text-white uppercase tracking-wider">AKTIF RESMI</p>
                <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sinkron Superadmin
                </span>
              </div>
            </div>

            {/* TABBED NAVIGATION INTERFACE */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
                <button
                  id="tab-members"
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'members'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Pengguna Cabang ({total})</span>
                </button>

                <button
                  id="tab-branding"
                  type="button"
                  onClick={() => setActiveTab('branding')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'branding'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Tampilan &amp; Branding</span>
                </button>

                <button
                  id="tab-guide"
                  type="button"
                  onClick={() => setActiveTab('guide')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'guide'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Panduan &amp; Dukungan</span>
                </button>
              </div>

              {/* TAB 1: PENGGUNA CABANG */}
              {activeTab === 'members' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Search and Filters Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/10 bg-slate-900/60">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari pengguna berdasarkan nama atau email..."
                        className="w-full rounded-xl border border-white/15 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {['all', 'seeker', 'employer', 'freelancer'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRoleFilter(r)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                            roleFilter === r
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                              : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
                          }`}
                        >
                          {r === 'all' ? 'Semua Role' : r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 divide-y divide-white/10 overflow-hidden shadow-xl">
                    {filteredMembers.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="text-sm font-semibold">Tidak ada pengguna ditemukan.</p>
                        <p className="text-xs text-slate-500">
                          {searchQuery
                            ? 'Coba ubah kata kunci pencarian Anda.'
                            : 'Bagikan tautan cabang Anda untuk mengundang pelamar atau perusahaan pertama.'}
                        </p>
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <article
                          key={member.user_id}
                          className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-500/20 border border-cyan-400/30 flex items-center justify-center font-bold text-cyan-300 text-sm shrink-0">
                              {(member.display_name || member.email || 'U')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-white truncate">
                                {member.display_name || 'Pengguna Tanpa Nama'}
                              </p>
                              <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate mt-0.5 font-mono">
                                <Mail className="w-3 h-3 text-slate-500" />
                                <span>{member.email}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase rounded-full px-3 py-1 border ${
                                member.role === 'employer'
                                  ? 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                                  : member.role === 'freelancer'
                                  ? 'bg-violet-500/15 border-violet-400/30 text-violet-300'
                                  : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                              }`}
                            >
                              {member.role}
                            </span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between p-3 text-xs text-slate-400 font-semibold">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900 disabled:opacity-30 hover:text-white"
                    >
                      Sebelumnya
                    </button>
                    <span>
                      Halaman {page} dari {Math.max(1, Math.ceil(total / 25))}
                    </span>
                    <button
                      disabled={page * 25 >= total}
                      onClick={() => setPage(page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900 disabled:opacity-30 hover:text-white"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: BRANDING & TAMPILAN CABANG */}
              {activeTab === 'branding' && (
                <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
                  {/* Form (7 Cols) */}
                  <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Identitas &amp; Tampilan Beranda Cabang</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sesuaikan nama, headline, dan informasi kontak resmi yang tampil di halaman depan cabang Anda.
                      </p>
                    </div>

                    <form key={tenant.config_version} onSubmit={saveBranding} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-300">Nama Cabang Resmi *</label>
                        <input
                          name="display_name"
                          defaultValue={tenant.display_name}
                          maxLength={100}
                          required
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-300">Judul Beranda (Hero Title)</label>
                        <input
                          name="hero_title"
                          defaultValue={tenant.hero_title || ''}
                          maxLength={140}
                          placeholder={`Selamat datang di ${tenant.display_name}`}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-300">Deskripsi / Profil Singkat Cabang</label>
                        <textarea
                          name="description"
                          rows={3}
                          defaultValue={tenant.description || ''}
                          maxLength={600}
                          placeholder="Jelaskan fokus layanan loker dan talenta di wilayah operasional Anda..."
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-300">URL Logo Cabang (HTTPS)</label>
                        <input
                          name="logo_url"
                          defaultValue={tenant.logo_url || ''}
                          maxLength={1000}
                          placeholder="https://domain.com/logo.png"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-300">Nomor WhatsApp CS Cabang</label>
                        <input
                          name="whatsapp"
                          defaultValue={tenant.whatsapp || ''}
                          maxLength={16}
                          placeholder="628123456789 (kode negara tanpa + atau spasi)"
                          className={inputClass}
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          disabled={busy}
                          className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-2.5 font-bold transition shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>{busy ? 'Menyimpan Perubahan...' : 'Simpan Perubahan Branding'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Live Visual Preview (5 Cols) */}
                  <div className="lg:col-span-5 rounded-2xl border border-cyan-400/30 bg-slate-950 p-6 space-y-4 shadow-xl">
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Live Preview Halaman Publik</span>
                    </span>

                    <div className="rounded-xl border border-white/10 bg-slate-900 p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        {tenant.logo_url ? (
                          <img
                            src={tenant.logo_url}
                            alt=""
                            className="h-10 w-10 object-contain rounded-lg bg-white p-1"
                          />
                        ) : (
                          <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-lg">
                            <Building2 className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-white">{tenant.display_name}</p>
                          <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Mitra Resmi LOXER
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-3 space-y-1.5">
                        <p className="text-base font-extrabold text-white leading-snug">
                          {tenant.hero_title || `Selamat datang di ${tenant.display_name}`}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {tenant.description ||
                            'Bergabung dengan komunitas kami. Temukan ruang untuk terhubung dan berkembang bersama jaringan LOXER.'}
                        </p>
                      </div>

                      {tenant.whatsapp && (
                        <div className="pt-2">
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-400/30 px-3 py-1 rounded-lg">
                            <MessageSquare className="w-3 h-3" /> WhatsApp: {tenant.whatsapp}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 Perubahan yang Anda simpan akan langsung aktif di URL publik{' '}
                      <span className="text-cyan-300 font-mono">loxer.id/p/{tenant.slug}</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: PANDUAN & BANTUAN CABANG */}
              {activeTab === 'guide' && (
                <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-300">
                      <ShieldCheck className="w-5 h-5" />
                      <h3 className="text-sm font-bold text-white">Standar Privasi Pelamar (Shopee-Grade)</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Semua nomor kontak (HP, WhatsApp, dan Email) pelamar kerja disensor otomatis untuk umum. Komunikasi dan penawaran kerja diarahkan melalui chat terproteksi di dalam aplikasi untuk mencegah spam dan kebocoran data.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <Zap className="w-5 h-5" />
                      <h3 className="text-sm font-bold text-white">Fitur AI Gemini 3.8 Otomatis</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Saat pelamar mengunggah CV di cabang Anda, sistem otomatis mengekstrak riwayat pendidikan, pengalaman kerja, merapikan pas foto 1:1, dan mempertajam gambar buram tanpa perlu intervensi manual.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-300">
                      <Users className="w-5 h-5" />
                      <h3 className="text-sm font-bold text-white">Akuisisi Loker dari Perusahaan Lokal</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Undang HRD, pemilik resto, bengkel, toko retail, dan industri di wilayah Anda untuk membuat akun Employer di cabang Anda agar mereka dapat membuka lowongan dan meninjau pelamar langsung.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-violet-300">
                      <MessageSquare className="w-5 h-5" />
                      <h3 className="text-sm font-bold text-white">Dukungan Tim Superadmin LOXER</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Butuh bantuan aktivasi modul khusus, penyesuaian domain, atau konsultasi bisnis? Hubungi tim kemitraan LOXER pusat melalui jalur WhatsApp Support kapan saja.
                    </p>
                    <a
                      href="https://wa.me/6287820070258?text=Halo%20Superadmin%20LOXER,%20saya%20pemilik%20cabang%20ingin%20berkonsultasi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:underline font-bold pt-1"
                    >
                      <span>Hubungi Superadmin LOXER</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : dashboard ? (
          /* 4. DASHBOARD BUT NOT AUTHORIZED (REQUIRE LOGIN) */
          <section className="text-center py-16 space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Akses Pengelola Diperlukan</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Silakan masuk menggunakan akun pemilik atau staf pengelola cabang {tenant.display_name}.
            </p>
            <a
              href={childLink('/login')}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-6 py-2.5 text-xs font-bold transition shadow"
            >
              <span>Masuk ke Panel Cabang</span>
              <ArrowRight size={14} />
            </a>
          </section>
        ) : (
          /* 5. PUBLIC BRANCH HOMEPAGE */
          <section className="py-6 sm:py-12 max-w-4xl space-y-6">
            <span className="text-[10px] font-bold text-cyan-400 tracking-[0.25em] uppercase bg-cyan-950/70 border border-cyan-400/30 px-3 py-1 rounded-full">
              CABANG RESMI BURSA KERJA DIGITAL
            </span>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight">
              {tenant.hero_title || `Selamat Datang di ${tenant.display_name}`}
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
              {tenant.description ||
                'Bergabung dengan komunitas kami. Temukan peluang karir impian, pasang lowongan kerja terverifikasi, dan berkembang bersama jaringan LOXER.'}
            </p>

            {me ? (
              <div className="p-6 rounded-2xl border border-cyan-400/30 bg-cyan-950/30 space-y-3 max-w-lg">
                <p className="text-sm">
                  Selamat datang kembali, <strong className="text-cyan-300">{me.member.display_name}</strong>.
                </p>
                <p className="text-xs text-slate-400">
                  Akun Anda terdaftar aktif di cabang {tenant.display_name}.
                </p>
                {me.can_manage && (
                  <a
                    href={childLink('/partner')}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-2.5 text-xs font-bold transition shadow"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Buka Ruang Kerja Mitra</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={childLink('/register')}
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 px-6 py-3.5 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  <span>Daftar di Cabang Ini</span>
                  <ArrowRight size={16} />
                </a>

                {tenant.whatsapp && (
                  <a
                    href={`https://wa.me/${tenant.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-5 py-3.5 text-xs sm:text-sm font-bold transition flex items-center gap-2"
                  >
                    <MessageSquare size={16} />
                    <span>Hubungi CS Cabang</span>
                  </a>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 sm:px-6 bg-slate-950 text-center text-xs text-slate-500 space-y-1">
        <p>
          {tenant.display_name} · Mitra Resmi Platform Rekrutmen Terpercaya LOXER
        </p>
        <p>© 2026 LOXER Multi-Tenant Infrastructure. All rights reserved.</p>
      </footer>
    </main>
  );
}
