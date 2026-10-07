import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ExternalLink,
  Plus,
  Building2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import { supabase } from '../../lib/supabase';
import { tenantRequest, type ChildTenant } from '../../lib/tenantApi';

interface PartnerApplication {
  id: string;
  business_name: string;
  suggested_slug: string;
  city: string;
  pic_phone: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  owner_user_id?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export default function AdminPartners() {
  const [activeTab, setActiveTab] = useState<'applications' | 'tenants'>('applications');

  // Tenants State
  const [rows, setRows] = useState<ChildTenant[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ tenant: ChildTenant; status: string } | null>(null);

  // Applications State
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedAppForCreate, setSelectedAppForCreate] = useState<PartnerApplication | null>(null);

  // Form Pre-fill
  const [createBusinessName, setCreateBusinessName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createOwnerId, setCreateOwnerId] = useState('');

  // AUD-017: Resilient token retrieval supporting both Supabase and Local SQLite Mode
  async function token() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) return data.session.access_token;
    } catch {
      // ignore
    }
    const localToken = typeof window !== 'undefined'
      ? (localStorage.getItem('loxer_local_auth_token_admin') ||
         localStorage.getItem('loxer_local_auth_token') ||
         localStorage.getItem('loxer_auth_token'))
      : null;
    if (!localToken) throw new Error('Masuk dengan akun administrator LOXER yang sah.');
    return localToken;
  }

  // Load existing Child Tenants
  const loadTenants = useCallback(async () => {
    try {
      const authTok = await token();
      const data = await tenantRequest<{ rows: ChildTenant[] }>(`/master/partners?page=${page}`, {
        master: true,
        token: authTok,
      });
      setRows(data.rows || []);
      setError('');
    } catch (err) {
      // In local mode if tenant platform master is offline, fail gracefully
      console.warn('[AdminPartners] Master tenant query note:', err);
    }
  }, [page]);

  // Load Partner Applications (AUD-016)
  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const authTok = await token();
      const res = await fetch(`/api/local/partner/applications?status=${appFilter}`, {
        headers: { Authorization: `Bearer ${authTok}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat pengajuan mitra.');
      setApplications(data.rows || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengajuan.');
    } finally {
      setLoadingApps(false);
    }
  }, [appFilter]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (activeTab === 'tenants') {
      void loadTenants();
    }
  }, [activeTab, loadTenants]);

  // Handle Application Status Update (AUD-016)
  async function handleAppStatus(id: string, newStatus: 'approved' | 'rejected' | 'pending') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const authTok = await token();
      const res = await fetch('/api/local/partner/applications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authTok}`,
        },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status pengajuan.');
      setNotice(`Pengajuan berhasil diperbarui menjadi ${newStatus}.`);
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status.');
    } finally {
      setBusy(false);
    }
  }

  // Pre-fill creation from an approved application
  function prepareCreateFromApp(app: PartnerApplication) {
    setCreateBusinessName(app.business_name);
    setCreateSlug(app.suggested_slug);
    setCreateOwnerId(app.owner_user_id || '');
    setSelectedAppForCreate(app);
    setActiveTab('tenants');
    setNotice(`Data usaha "${app.business_name}" dimasukkan ke formulir pembuatan Child.`);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await tenantRequest('/master/partners', {
        master: true,
        token: await token(),
        method: 'POST',
        body: Object.fromEntries(form),
      });
      formElement.reset();
      setCreateBusinessName('');
      setCreateSlug('');
      setCreateOwnerId('');
      if (selectedAppForCreate) {
        await handleAppStatus(selectedAppForCreate.id, 'approved');
        setSelectedAppForCreate(null);
      }
      setNotice('Child dibuat dengan status menunggu persetujuan. Aktifkan setelah data mitra ditinjau.');
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat mitra.');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    const reason = String(new FormData(event.currentTarget).get('reason') || '');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await tenantRequest(`/master/partners/${target.tenant.id}/status`, {
        master: true,
        token: await token(),
        method: 'POST',
        body: { status: target.status, reason },
      });
      setNotice('Status Child diperbarui dan dicatat dalam audit.');
      setTarget(null);
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Perubahan gagal.');
    } finally {
      setBusy(false);
    }
  }

  const labels: Record<string, string> = {
    pending: 'Menunggu persetujuan',
    active: 'Aktif',
    suspended: 'Ditangguhkan',
    terminated: 'Diakhiri',
  };
  const input = 'mt-2 block w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-white focus:ring-2 focus:ring-cyan-300 outline-none';

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <GodModeLayout title="Child Panel Mitra & Pengajuan" description="Kelola cabang digital LOXER, verifikasi pendaftaran calon mitra, dan atur operasionalnya.">
      {error && <p role="alert" className="mb-5 border border-red-400/30 bg-red-500/10 text-red-200 rounded-xl p-4">{error}</p>}
      {notice && <p role="status" className="mb-5 border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 rounded-xl p-4">{notice}</p>}

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                : 'bg-slate-900 border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare size={16} />
            <span>Pengajuan Masuk</span>
            {pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'applications' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === 'tenants'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md'
                : 'bg-slate-900 border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Building2 size={16} />
            <span>Cabang Terdaftar ({rows.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a
            href="/mitra"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:underline flex items-center gap-1"
          >
            <span>Halaman Program Mitra</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* TAB 1: PENGJUAN MASUK (PARTNER APPLICATIONS) */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-white/10 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Filter Status:</span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setAppFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                    appFilter === st
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={loadingApps}
              onClick={() => void loadApplications()}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-white/10"
            >
              <RefreshCw size={12} className={loadingApps ? 'animate-spin' : ''} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="border border-dashed border-white/20 rounded-2xl p-12 text-center text-slate-400">
              <MessageSquare className="mx-auto mb-3 opacity-60" size={32} />
              <p className="font-medium">Belum ada pengajuan mitra dengan filter ini.</p>
              <p className="text-xs text-slate-500 mt-1">Calon mitra dapat mengajukan via formulir di /mitra.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {applications.map((app) => (
                <article
                  key={app.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 space-y-3 relative group hover:border-emerald-500/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                        {app.business_name}
                      </h3>
                      <p className="text-xs text-cyan-400 font-mono mt-0.5">/p/{app.suggested_slug}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        app.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : app.status === 'rejected'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl">
                    <div>
                      <p className="text-[10px] text-slate-500">Kota Operasional</p>
                      <p className="font-semibold text-white">{app.city}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Nomor WhatsApp</p>
                      <a
                        href={`https://wa.me/62${app.pic_phone.replace(/^0/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 font-mono font-bold hover:underline flex items-center gap-1"
                      >
                        <span>{app.pic_phone}</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  {app.notes && (
                    <div className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-500 font-medium mb-0.5">Catatan Pemohon:</p>
                      <p className="line-clamp-3 italic">"{app.notes}"</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(app.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {app.reviewed_by && (
                      <span className="text-[10px] text-slate-400">
                        Ditinjau oleh: {app.reviewed_by}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {app.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAppStatus(app.id, 'approved')}
                        className="flex-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        <span>Setujui</span>
                      </button>
                    )}

                    {app.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAppStatus(app.id, 'rejected')}
                        className="rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <XCircle size={14} />
                        <span>Tolak</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => prepareCreateFromApp(app)}
                      className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      title="Buat cabang resmi dari data pemohon ini"
                    >
                      <Plus size={14} />
                      <span>Buat Child</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CABANG MITRA TERDAFTAR */}
      {activeTab === 'tenants' && (
        <div className="grid xl:grid-cols-[1fr_360px] gap-6">
          <section className="min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white">Cabang Mitra Aktif</h2>
              <button
                type="button"
                onClick={() => void loadTenants()}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw size={12} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-4">
              {rows.length === 0 && (
                <div className="border border-dashed border-white/20 rounded-2xl p-10 text-center text-slate-400">
                  <Building2 className="mx-auto mb-3" />
                  <p>Belum ada cabang terdaftar pada halaman ini.</p>
                </div>
              )}

              {rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{row.display_name}</h3>
                      <p className="text-sm text-slate-400 mt-1">/p/{row.slug}</p>
                    </div>
                    <span
                      className={`text-xs rounded-full px-3 py-1 self-start ${
                        row.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {labels[row.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-5 text-sm">
                    {row.status === 'active' && (
                      <a
                        href={`/p/${row.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-300 flex gap-1 items-center"
                      >
                        <span>Buka Child</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {row.status !== 'terminated' && (
                      <>
                        {row.status !== 'active' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setTarget({ tenant: row, status: 'active' })}
                            className="text-emerald-300 hover:underline"
                          >
                            Aktifkan
                          </button>
                        )}
                        {row.status === 'active' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setTarget({ tenant: row, status: 'suspended' })}
                            className="text-amber-300 hover:underline"
                          >
                            Tangguhkan
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="flex justify-between mt-5 text-slate-300 text-sm">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="disabled:opacity-30"
              >
                Sebelumnya
              </button>
              <span>Halaman {page}</span>
              <button
                type="button"
                disabled={rows.length < 25}
                onClick={() => setPage(page + 1)}
                className="disabled:opacity-30"
              >
                Berikutnya
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 p-5 self-start bg-slate-900/60">
            <h2 className="text-lg font-semibold text-white flex gap-2 items-center">
              <Plus size={20} />
              <span>Buat Child</span>
            </h2>

            <form onSubmit={create} className="mt-5 space-y-4">
              <label className="block text-sm text-slate-300">
                Nama usaha
                <input
                  name="business_name"
                  maxLength={100}
                  required
                  value={createBusinessName}
                  onChange={(e) => setCreateBusinessName(e.target.value)}
                  className={input}
                />
              </label>

              <label className="block text-sm text-slate-300">
                Slug cabang (/p/slug)
                <input
                  name="slug"
                  pattern="[a-z0-9][a-z0-9-]{1,46}[a-z0-9]"
                  minLength={3}
                  maxLength={48}
                  placeholder="andi-digital"
                  required
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  className={input}
                />
              </label>

              <label className="block text-sm text-slate-300">
                ID akun pemilik
                <input
                  name="owner_user_id"
                  maxLength={100}
                  required
                  value={createOwnerId}
                  onChange={(e) => setCreateOwnerId(e.target.value)}
                  placeholder="ID user dari Manajemen Users"
                  className={input}
                />
              </label>

              <p className="text-xs text-slate-500">
                Gunakan ID akun LOXER aktif dari Manajemen Users. Pemilik dapat mengelola anggota dan branding cabang.
              </p>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 p-3 font-semibold disabled:opacity-50 transition"
              >
                {busy ? 'Memproses...' : 'Buat cabang'}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Modal Status Change */}
      {target && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-status-title"
            className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-md"
          >
            <h2 id="partner-status-title" className="text-xl font-semibold text-white">
              {labels[target.status]} · {target.tenant.display_name}
            </h2>

            <form onSubmit={updateStatus}>
              <label className="block text-sm text-slate-300 mt-5">
                Alasan perubahan
                <textarea name="reason" autoFocus required maxLength={500} className={input} />
              </label>

              <div className="flex gap-3 mt-5">
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-cyan-300 text-slate-950 rounded-xl px-5 py-3 font-semibold"
                >
                  Simpan status
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setTarget(null)}
                  className="text-slate-300 px-4 py-3"
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </GodModeLayout>
  );
}
