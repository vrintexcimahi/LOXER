import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, Plus, Building2 } from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import { supabase } from '../../lib/supabase';
import { tenantRequest, type ChildTenant } from '../../lib/tenantApi';

export default function AdminPartners() {
  const [rows, setRows] = useState<ChildTenant[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ tenant:ChildTenant; status:string } | null>(null);
  async function token() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error('Masuk dengan akun superadmin yang ditunjuk.');
    return data.session.access_token;
  }
  const load = useCallback(async () => {
    try {
      const data = await tenantRequest<{ rows:ChildTenant[] }>(`/master/partners?page=${page}`, { master:true, token:await token() });
      setRows(data.rows); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat mitra.'); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  async function create(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await tenantRequest('/master/partners', { master:true, token:await token(), method:'POST', body:Object.fromEntries(form) });
      formElement.reset(); setNotice('Child dibuat dengan status menunggu persetujuan. Aktifkan setelah data mitra ditinjau.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal membuat mitra.'); }
    finally { setBusy(false); }
  }
  async function updateStatus(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!target) return;
    const reason = String(new FormData(event.currentTarget).get('reason') || '');
    setBusy(true); setError(''); setNotice('');
    try {
      await tenantRequest(`/master/partners/${target.tenant.id}/status`, { master:true, token:await token(), method:'POST', body:{ status:target.status, reason } });
      setNotice('Status Child diperbarui dan dicatat dalam audit.'); setTarget(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Perubahan gagal.'); }
    finally { setBusy(false); }
  }
  const labels:Record<string,string> = { pending:'Menunggu persetujuan', active:'Aktif', suspended:'Ditangguhkan', terminated:'Diakhiri' };
  const input = 'mt-2 block w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-white focus:ring-2 focus:ring-cyan-300 outline-none';
  return <GodModeLayout title="Child Panel Mitra" description="Kelola cabang digital LOXER, pemilik, dan status operasionalnya.">
    {error && <p role="alert" className="mb-5 border border-red-400/30 bg-red-500/10 text-red-200 rounded-xl p-4">{error}</p>}
    {notice && <p role="status" className="mb-5 border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 rounded-xl p-4">{notice}</p>}
    <div className="grid xl:grid-cols-[1fr_340px] gap-6">
      <section className="min-w-0"><div className="flex items-center justify-between mb-5"><h2 className="text-xl font-semibold text-white">Cabang mitra</h2><a href="/mitra" className="text-cyan-300 text-sm">Halaman program</a></div>
        <div className="space-y-4">{rows.length === 0 && <div className="border border-dashed border-white/20 rounded-2xl p-10 text-center text-slate-400"><Building2 className="mx-auto mb-3"/><p>Belum ada cabang pada halaman ini.</p></div>}
          {rows.map(row => <article key={row.id} className="rounded-2xl border border-white/10 bg-slate-900/50 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">{row.display_name}</h3><p className="text-sm text-slate-400 mt-1">/p/{row.slug}</p></div><span className={`text-xs rounded-full px-3 py-1 self-start ${row.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{labels[row.status]}</span></div>
            <div className="flex flex-wrap gap-3 mt-5 text-sm">{row.status === 'active' && <a href={`/p/${row.slug}`} target="_blank" rel="noopener noreferrer" className="text-cyan-300 flex gap-1 items-center">Buka Child <ExternalLink size={14}/></a>}{row.status !== 'terminated' && <>{row.status !== 'active' && <button disabled={busy} onClick={() => setTarget({tenant:row,status:'active'})} className="text-emerald-300">Aktifkan</button>}{row.status === 'active' && <button disabled={busy} onClick={() => setTarget({tenant:row,status:'suspended'})} className="text-amber-300">Tangguhkan</button>}</>}</div>
          </article>)}
        </div><div className="flex justify-between mt-5 text-slate-300 text-sm"><button disabled={page === 1} onClick={() => setPage(page-1)} className="disabled:opacity-30">Sebelumnya</button><span>Halaman {page}</span><button disabled={rows.length < 25} onClick={() => setPage(page+1)} className="disabled:opacity-30">Berikutnya</button></div>
      </section>
      <section className="rounded-2xl border border-white/10 p-5 self-start"><h2 className="text-lg font-semibold text-white flex gap-2 items-center"><Plus size={20}/> Buat Child</h2><form onSubmit={create} className="mt-5 space-y-4"><label className="block text-sm text-slate-300">Nama usaha<input name="business_name" maxLength={100} required className={input}/></label><label className="block text-sm text-slate-300">Slug cabang<input name="slug" pattern="[a-z0-9][a-z0-9-]{1,46}[a-z0-9]" minLength={3} maxLength={48} placeholder="andi-digital" required className={input}/></label><label className="block text-sm text-slate-300">ID akun pemilik<input name="owner_user_id" maxLength={100} required className={input}/></label><p className="text-xs text-slate-500">Gunakan ID akun LOXER aktif dari Manajemen Users. Pemilik tidak mendapat role admin master.</p><button disabled={busy} className="w-full rounded-xl bg-cyan-300 text-slate-950 p-3 font-semibold disabled:opacity-50">{busy ? 'Memproses...' : 'Buat cabang'}</button></form></section>
    </div>
    {target && <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-5"><section role="dialog" aria-modal="true" aria-labelledby="partner-status-title" className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-md"><h2 id="partner-status-title" className="text-xl font-semibold text-white">{labels[target.status]} · {target.tenant.display_name}</h2><form onSubmit={updateStatus}><label className="block text-sm text-slate-300 mt-5">Alasan perubahan<textarea name="reason" autoFocus required maxLength={500} className={input}/></label><div className="flex gap-3 mt-5"><button disabled={busy} className="bg-cyan-300 text-slate-950 rounded-xl px-5 py-3 font-semibold">Simpan status</button><button type="button" disabled={busy} onClick={() => setTarget(null)} className="text-slate-300">Batal</button></div></form></section></div>}
  </GodModeLayout>;
}
