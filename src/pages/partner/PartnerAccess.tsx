import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import BrandText from '../../components/ui/BrandText';

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/^\/p\//, '').replace(/[^a-z0-9-]/g, '');
}

export default function PartnerAccess() {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  function openPortal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSlug = normalizeSlug(slug);
    if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(nextSlug)) {
      setError('Masukkan slug Child Panel yang valid, misalnya andi-digital.');
      return;
    }
    setError('');
    window.location.assign(`/p/${nextSlug}/login`);
  }

  return <main className="min-h-screen bg-[#071527] text-white">
    <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/10"><a href="/mitra" aria-label="Program mitra"><BrandText /></a><a href="/mitra" className="inline-flex items-center gap-2 text-sm text-slate-300"><ArrowLeft size={16}/> Program Mitra</a></header>
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-24"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-200"><LockKeyhole size={14}/> Akses aman Child Panel</div><h1 className="text-4xl md:text-5xl font-bold leading-tight mt-6">Masuk ke portal mitra Anda.</h1><p className="text-slate-300 text-lg mt-5 leading-relaxed">Masukkan slug Child Panel yang diberikan oleh LOXER. Anda akan diarahkan ke halaman login cabang yang sesuai.</p></div>
      <div className="grid md:grid-cols-[1.1fr_.9fr] gap-6 mt-12"><form onSubmit={openPortal} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8"><label htmlFor="partner-slug" className="text-sm text-slate-200">Slug Child Panel<input id="partner-slug" value={slug} onChange={event => setSlug(event.target.value)} placeholder="andi-digital" autoComplete="off" maxLength={48} className="mt-3 w-full rounded-xl border border-white/15 bg-slate-950 p-4 text-white outline-none focus:ring-2 focus:ring-cyan-300"/></label>{error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}<button className="mt-6 w-full rounded-xl bg-cyan-300 px-5 py-3.5 font-semibold text-slate-950 inline-flex justify-center items-center gap-2">Buka portal mitra <ArrowRight size={18}/></button><p className="text-xs text-slate-500 mt-4">Contoh: jika alamat Anda <span className="text-slate-300">loxer.id/p/andi-digital</span>, masukkan <span className="text-slate-300">andi-digital</span>.</p></form><aside className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6 md:p-8"><ShieldCheck className="text-amber-300" size={27}/><h2 className="text-xl font-semibold mt-5">Privasi cabang tetap terjaga</h2><p className="text-slate-300 mt-3 leading-relaxed">Portal hanya membuka sesi untuk Child Panel yang Anda pilih. Data pengguna, branding, dan operasional cabang dipisahkan dari mitra lain.</p><a href="/mitra#cara-bergabung" className="inline-flex items-center gap-2 text-amber-300 mt-6 text-sm">Belum menjadi mitra? <ArrowRight size={15}/></a></aside></div>
    </section><footer className="border-t border-white/10 p-6 text-center text-sm text-slate-500">LOXER Partner Portal · Satu sistem, ruang kerja milik Anda.</footer>
  </main>;
}
