import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Server,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { useAppAccess } from '../../contexts/AppAccessContext';
import { isDefaultAdminEmail } from '../../lib/constants';

export default function AdminInternalLogin() {
  const { user, userMeta, signIn } = useAuth();
  const { unlockSuperAdmin } = useAppAccess();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if currently authenticated as admin
  const isCurrentlyAdmin =
    user && (userMeta?.role === 'admin' || userMeta?.role === 'superadmin' || isDefaultAdminEmail(user.email));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanInput = emailOrUsername.trim();
    const cleanPwd = password.trim();

    if (!cleanInput || !cleanPwd) {
      setError('Harap masukkan username/email dan password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try local API login first for instant high-speed authentication
      const res = await fetch('/api/local/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanInput, password: cleanPwd }),
      });

      const data = await res.json();

      if (res.ok && data?.token) {
        const userObj = data.user;
        const role = userObj?.role || 'seeker';

        // Check if role is admin / superadmin or authorized internal email
        const isAdmin =
          role === 'admin' ||
          role === 'superadmin' ||
          cleanInput.toLowerCase() === 'vrintex' ||
          cleanInput.toLowerCase() === 'vrintex@loxer.app' ||
          isDefaultAdminEmail(cleanInput);

        if (!isAdmin) {
          setLoading(false);
          setError('Akses ditolak: Portal ini hanya diperuntukkan bagi Super Admin dan tim internal LOXER.');
          return;
        }

        // Store tokens
        try {
          localStorage.setItem('loxer_local_auth_token', data.token);
          if (data.refresh_token) {
            localStorage.setItem('loxer_local_refresh_token', data.refresh_token);
          }
          sessionStorage.setItem('loxer_super_admin_bypass', 'true');
          sessionStorage.setItem('loxer_admin_unlocked', 'true');
          sessionStorage.setItem('app_admin_unlocked', 'true');
        } catch {
          // ignore storage error
        }

        // Unlock AppAccessContext
        unlockSuperAdmin('kayaraya3+');

        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 800);
        return;
      }

      // 2. Fallback to Supabase / AuthContext signIn
      const { error: signInErr } = await signIn(cleanInput, cleanPwd);
      if (signInErr) {
        throw new Error(signInErr.message || 'Kredensial tidak valid.');
      }

      // Unlock superadmin bypass
      unlockSuperAdmin('kayaraya3+');
      try {
        sessionStorage.setItem('loxer_super_admin_bypass', 'true');
        sessionStorage.setItem('loxer_admin_unlocked', 'true');
        sessionStorage.setItem('app_admin_unlocked', 'true');
      } catch {
        // ignore
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses login.';
      if (msg.includes('Invalid') || msg.includes('credentials') || msg.includes('password')) {
        setError('Username/Email atau Password salah.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSuperAdminFill = () => {
    setEmailOrUsername('vrintex');
    setPassword('kayaraya3+');
    setError('');
  };

  const handleQuickRootAdminFill = () => {
    setEmailOrUsername('vrintex@loxer.app');
    setPassword('kayaraya3+');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#070d1a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar Security Notification */}
      <div className="max-w-xl mx-auto w-full pt-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          <span className="font-mono text-cyan-300">LOXER GATEWAY v2.6 • SECURE</span>
        </div>
        <a
          href="/"
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-medium"
        >
          Ke Beranda Publik
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full my-auto py-8">
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_80px_rgba(6,182,212,0.15)] relative overflow-hidden">
          {/* Decorative Corner Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20 mb-2">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-[11px] font-mono font-semibold text-cyan-300 tracking-wider uppercase">
              RESTRICTED INTERNAL ACCESS
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Portal Akses Super Admin
            </h1>
            <p className="text-xs text-slate-400 max-w-sm">
              Area khusus pengelolaan platform LOXER. Seluruh otentikasi diawasi dan tercatat dalam sistem audit keamanan.
            </p>
          </div>

          {/* Already logged in alert */}
          {isCurrentlyAdmin ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Sesi Super Admin Sedang Aktif
              </div>
              <p className="text-xs text-slate-300">
                Anda telah terotentikasi sebagai <strong className="text-white">{user?.email}</strong>.
              </p>
              <button
                onClick={() => (window.location.href = '/admin/dashboard')}
                className="gradient-cta w-full py-2.5 rounded-xl font-bold text-sm text-slate-950 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Buka Dashboard Admin
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5 animate-shake">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2.5 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Otentikasi Berhasil!</span>
                    Mengarahkan ke dashboard admin...
                  </div>
                </div>
              )}

              {/* Username / Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Username / Email Admin</span>
                  <span className="text-[10px] text-slate-500 font-mono">vrintex / @loxer.app</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="vrintex atau vrintex@loxer.app"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Kata Sandi Super Admin</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || success}
                className="gradient-cta w-full py-3 rounded-xl font-bold text-sm text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Memverifikasi Otorisasi...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Buka Akses Super Admin
                  </>
                )}
              </button>

              {/* Quick Fill Credentials Shortcut */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold text-center">
                  Bantuan Akses Cepat Super Admin:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleQuickSuperAdminFill}
                    className="rounded-xl border border-white/10 bg-slate-950/70 p-2 text-slate-300 hover:border-cyan-500/50 hover:text-white transition-all text-left"
                  >
                    <div className="font-bold text-cyan-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" /> vrintex
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Password: kayaraya3+</div>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickRootAdminFill}
                    className="rounded-xl border border-white/10 bg-slate-950/70 p-2 text-slate-300 hover:border-cyan-500/50 hover:text-white transition-all text-left"
                  >
                    <div className="font-bold text-cyan-300 flex items-center gap-1">
                      <Server className="w-3 h-3 text-cyan-400" /> @loxer.app
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Password: kayaraya3+</div>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-xl mx-auto w-full text-center text-[11px] text-slate-500 space-y-1">
        <p>LOXER Security Gateway • Multi-Tenant RBAC & Audit Log Protection</p>
        <p>© 2026 PT Vrintex Solusi Teknologi. All rights reserved.</p>
      </div>
    </div>
  );
}
