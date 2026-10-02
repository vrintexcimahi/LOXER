import { useState } from 'react';
import {
  X,
  ShieldCheck,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle,
} from 'lucide-react';
import { useAppAccess } from '../../contexts/AppAccessContext';

interface SecretAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SecretAdminModal({
  isOpen,
  onClose,
  onSuccess,
}: SecretAdminModalProps) {
  const { unlockSuperAdmin } = useAppAccess();
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = passkey.trim();
    if (!clean) {
      setError('Masukkan kode akses rahasia Super Admin.');
      return;
    }

    const ok = unlockSuperAdmin(clean);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 900);
    } else {
      setError('Kode akses rahasia tidak cocok.');
    }
  };

  const handleQuickMasterKey = () => {
    setPasskey('kayaraya3+');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-[#070d1a] border border-cyan-400/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.35)] text-white">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20 mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-white">
          Akses Rahasia Super Admin
        </h3>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Verifikasi otorisasi tingkat tinggi untuk membuka <strong>Bypass Web View-Only</strong> dan mengakses seluruh kontrol sistem dari browser web.
        </p>

        {success ? (
          <div className="my-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Akses Super Admin Terbuka!</span>
              Mode bypass aktif. Seluruh fitur web kini dapat diakses penuh.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs animate-shake">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Kode Kunci Rahasia / Master Passkey
              </label>
              <div className="relative">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Masukkan master key..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 transition pr-11"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Prefill helper */}
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono">Ctrl+Shift+A</kbd></span>
              <button
                type="button"
                onClick={handleQuickMasterKey}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                Gunakan Master Key
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 active:scale-[0.98] transition cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Buka Akses Penuh Web (Bypass)</span>
            </button>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-slate-500">
            Akses ini terlindungi &amp; hanya diperuntukkan bagi pengelola resmi LOXER.
          </p>
        </div>

      </div>
    </div>
  );
}
