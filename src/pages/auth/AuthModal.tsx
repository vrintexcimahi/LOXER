import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Briefcase, Mail, Lock, User, Eye, EyeOff, Building2, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { UserRole } from '../../lib/types';
import BrandText from '../../components/ui/BrandText';
import { DEFAULT_ADMIN_EMAIL } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('seeker');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'login') {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await signIn(normalizedEmail, password);

      if (error) {
        setError('Email atau password salah. Silakan coba lagi.');
      } else {
        let nextPath = '/seeker/dashboard';

        if (supabase) {
          const { data: authData } = await supabase.auth.getUser();
          const signedInUser = authData.user;

          if (signedInUser) {
            const isDefaultAdmin = (signedInUser.email || normalizedEmail).trim().toLowerCase() === DEFAULT_ADMIN_EMAIL;
            let { data: meta } = await supabase
              .from('users_meta')
              .select('id, email, role')
              .eq('id', signedInUser.id)
              .maybeSingle();

            if (isDefaultAdmin && meta?.role !== 'admin') {
              // First, try direct client update for own row.
              const { data: updatedMeta } = await supabase
                .from('users_meta')
                .upsert(
                  {
                    id: signedInUser.id,
                    email: signedInUser.email || DEFAULT_ADMIN_EMAIL,
                    role: 'admin',
                  },
                  { onConflict: 'id' }
                )
                .select('id, email, role')
                .maybeSingle();

              if (updatedMeta) meta = updatedMeta;

              // Second, try server proxy (service role) if role still not synced.
              if (!meta || meta.role !== 'admin') {
                try {
                  const { data: sessionData } = await supabase.auth.getSession();
                  const token = sessionData.session?.access_token;
                  if (token) {
                    const res = await fetch('/api/admin/ensure-default-admin', {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    });
                    if (res.ok) {
                      const payload = (await res.json()) as { meta?: { id: string; email: string; role: UserRole } };
                      if (payload.meta) meta = payload.meta;
                    }
                  }
                } catch (proxyErr) {
                  console.warn('[AuthModal] ensure default admin via proxy gagal:', proxyErr);
                }
              }
            }

            if (meta?.role === 'employer') {
              nextPath = '/employer/dashboard';
            } else if (meta?.role === 'admin' || isDefaultAdmin) {
              nextPath = '/admin/dashboard';
            }
          }
        }

        onClose();
        window.location.href = nextPath;
      }
    } else {
      if (!fullName.trim()) { setError('Nama lengkap wajib diisi.'); setLoading(false); return; }
      if (password.length < 6) { setError('Password minimal 6 karakter.'); setLoading(false); return; }
      const { error } = await signUp(email, password, role, fullName);
      if (error) {
        setError('Gagal mendaftar. Email mungkin sudah terdaftar.');
      } else {
        setSuccess('Akun berhasil dibuat! Mengalihkan...');
        setTimeout(() => {
          onClose();
          window.location.href = role === 'employer' ? '/employer/dashboard' : '/seeker/dashboard';
        }, 1000);
      }
    }
    setLoading(false);
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#0F172A]/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative my-3 w-full max-w-md overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-2xl shadow-sky-900/20 animate-fade-up">
        {/* Header gradient accent */}
        <div className="h-1.5 gradient-cta" />

        <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-5 sm:max-h-[calc(100dvh-2rem)] sm:p-8">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-sky-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 gradient-cta rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="rounded-md bg-slate-900 px-2 py-1 leading-none">
              <BrandText className="text-lg font-black" />
            </span>
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-1">
            {mode === 'login' ? 'Selamat Datang!' : 'Buat Akun Baru'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {mode === 'login'
              ? 'Masuk ke akun LOXER-mu'
              : 'Bergabung bersama jutaan pengguna LOXER'}
          </p>

          {/* Role Selection (Register only) */}
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole('seeker')}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all duration-200 ${
                  role === 'seeker'
                    ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10'
                    : 'border-sky-100 bg-white hover:border-sky-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'seeker' ? 'gradient-cta' : 'bg-sky-100'}`}>
                  <UserCheck className={`w-5 h-5 ${role === 'seeker' ? 'text-white' : 'text-sky-400'}`} />
                </div>
                <div className="text-center">
                  <p className={`font-semibold text-xs ${role === 'seeker' ? 'text-sky-700' : 'text-slate-600'}`}>Seeker</p>
                  <p className="text-slate-400 text-[10px]">(Pencari Kerja)</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole('employer')}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all duration-200 ${
                  role === 'employer'
                    ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10'
                    : 'border-sky-100 bg-white hover:border-sky-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'employer' ? 'gradient-cta' : 'bg-sky-100'}`}>
                  <Building2 className={`w-5 h-5 ${role === 'employer' ? 'text-white' : 'text-sky-400'}`} />
                </div>
                <div className="text-center">
                  <p className={`font-semibold text-xs ${role === 'employer' ? 'text-sky-700' : 'text-slate-600'}`}>Employer</p>
                  <p className="text-slate-400 text-[10px]">(Perusahaan)</p>
                </div>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="label">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkapmu"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@kamu.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimal 6 karakter' : '••••••••'}
                  className="input-field pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-600 text-sm">
                {success}
              </div>
            )}
            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-cta text-white rounded-xl py-3 font-semibold text-sm shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Memproses...</>
              ) : mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-slate-500 text-sm mt-5">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button
              onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
              className="text-sky-600 font-semibold hover:text-sky-800 transition-colors"
            >
              {mode === 'login' ? 'Daftar Gratis' : 'Masuk'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
