import { Smartphone, Eye, Sparkles } from 'lucide-react';
import { useAppAccess } from '../../contexts/AppAccessContext';

export default function WebModeBanner() {
  const { isViewOnlyWeb, openInstallModal } = useAppAccess();

  if (!isViewOnlyWeb) return null;

  return (
    <aside
      aria-label="Mode Web Pratinjau View Only"
      className="w-full bg-gradient-to-r from-[#081528] via-[#0d1d36] to-[#081528] border-b border-cyan-500/30 text-white py-1.5 px-3 select-none backdrop-blur-md sticky top-0 z-30 shadow-md text-xs"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold text-[10px] uppercase tracking-wider border border-cyan-400/30 shrink-0">
            <Eye size={12} />
            View Only
          </span>
          <span className="text-[11px] sm:text-xs text-slate-300 truncate">
            Anda dalam Mode Web Pratinjau. Pasang Aplikasi Resmi LOXER untuk melamar lowongan & akses fitur lengkap.
          </span>
        </div>
        <button
          type="button"
          onClick={() => openInstallModal('Akses Penuh Aplikasi LOXER')}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-black text-[11px] shadow-sm shadow-cyan-500/30 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Smartphone size={13} strokeWidth={2.5} />
          <span>Pasang Aplikasi</span>
          <Sparkles size={11} className="text-amber-700" />
        </button>
      </div>
    </aside>
  );
}
