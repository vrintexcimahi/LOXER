import { useEffect, useState, type ReactNode } from 'react';
import { tenantRequest, type ChildTenant } from '../../lib/tenantApi';
import ChildPanel from '../../pages/partner/ChildPanel';
import PartnerProgram from '../../pages/partner/PartnerProgram';

// Resolve before mounting legacy Auth/Device/Tracking providers. Child pages never
// execute legacy unscoped queries or replay the master's offline queue.
export default function TenantGateway({ children }: { children:ReactNode }) {
  const [state, setState] = useState<{ ready:boolean; tenant?:ChildTenant; error?:string }>({ ready:false });
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const capabilities = await tenantRequest<{ enabled:boolean; is_child:boolean }>('/capabilities', { signal:controller.signal });
      if (!capabilities.is_child) { setState({ ready:true }); return; }
      if (!capabilities.enabled) throw new Error('Program Child Panel belum diaktifkan.');
      const result = await tenantRequest<{ tenant:ChildTenant }>('/context', { signal:controller.signal });
      setState({ ready:true, tenant:result.tenant });
    };
    load().catch(err => { if (!controller.signal.aborted) setState({ ready:true, error:err.message || 'Layanan tidak tersedia.' }); });
    return () => controller.abort();
  }, []);
  if (!state.ready) return <main className="min-h-screen bg-[#071527] text-slate-300 flex items-center justify-center" role="status">Menyiapkan LOXER...</main>;
  if (state.error) return <main className="min-h-screen bg-[#071527] text-white flex items-center justify-center p-6"><section className="max-w-lg p-8 border border-white/10 rounded-2xl"><p className="text-cyan-300 font-bold">LOXER</p><h1 className="text-2xl font-semibold mt-5">Halaman belum dapat dibuka</h1><p role="alert" className="text-slate-300 mt-4">{state.error}</p><button onClick={() => window.location.reload()} className="mt-6 rounded-xl px-5 py-3 bg-cyan-300 text-slate-950 font-semibold">Coba lagi</button></section></main>;
  if (state.tenant) return <ChildPanel key={state.tenant.id} initialTenant={state.tenant}/>;
  if (window.location.pathname === '/mitra' || window.location.pathname.startsWith('/mitra/')) return <PartnerProgram/>;
  return <>{children}</>;
}
