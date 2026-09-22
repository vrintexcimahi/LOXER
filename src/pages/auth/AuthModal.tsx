import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Briefcase, Mail, Lock, User, Eye, EyeOff, Building2, UserCheck, Phone, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { UserRole } from '../../lib/types';
import BrandText from '../../components/ui/BrandText';
import { DEFAULT_ADMIN_EMAIL, isDefaultAdminEmail, normalizeComparableEmail } from '../../lib/constants';
import { isLocalMode, supabase } from '../../lib/supabase';
import { hasGoogleClientId, triggerNativeGoogleOAuth } from '../../lib/googleAuth';

interface AuthModalProps {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

type OtpChannel = 'email' | 'sms';

interface AuthCapabilities {
  configured: boolean;
  googleEnabled: boolean;
  emailAuthEnabled: boolean;
  phoneAuthEnabled: boolean;
  emailOtpEnabled: boolean;
  smsOtpEnabled: boolean;
  mailerAutoconfirm: boolean;
  smsProvider: string;
}

const DEFAULT_AUTH_CAPABILITIES: AuthCapabilities = {
  configured: false,
  googleEnabled: false,
  emailAuthEnabled: true,
  phoneAuthEnabled: false,
  emailOtpEnabled: false,
  smsOtpEnabled: false,
  mailerAutoconfirm: true,
  smsProvider: '',
};

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, requestOtp, verifyOtpCode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('seeker');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('email');
  const [authCapabilities, setAuthCapabilities] = useState<AuthCapabilities>(DEFAULT_AUTH_CAPABILITIES);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  async function loadAuthCapabilities() {
    try {
      setCapabilitiesLoading(true);
      const response = await fetch('/api/auth-capabilities');
      const payload = (await response.json()) as Partial<AuthCapabilities>;

      if (!response.ok) {
        throw new Error('Auth capabilities belum tersedia');
      }

      setAuthCapabilities({
        configured: Boolean(payload.configured),
        googleEnabled: Boolean(payload.googleEnabled),
        emailAuthEnabled: payload.emailAuthEnabled ?? true,
        phoneAuthEnabled: Boolean(payload.phoneAuthEnabled),
        emailOtpEnabled: Boolean(payload.emailOtpEnabled),
        smsOtpEnabled: Boolean(payload.smsOtpEnabled),
        mailerAutoconfirm: payload.mailerAutoconfirm ?? true,
        smsProvider: String(payload.smsProvider || ''),
      });
    } catch {
      setAuthCapabilities(DEFAULT_AUTH_CAPABILITIES);
    } finally {
      setCapabilitiesLoading(false);
    }
  }

  const canUseAnyOtp = authCapabilities.emailOtpEnabled || authCapabilities.smsOtpEnabled;

  async function resolveNextPath(fallbackEmail?: string) {
    const defaultPath = '/seeker/dashboard';
    if (!supabase) return defaultPath;

    const { data: authData } = await supabase.auth.getUser();
    const signedInUser = authData.user;

    if (!signedInUser) return defaultPath;

    const normalizedFallbackEmail = normalizeComparableEmail(fallbackEmail);
    const isDefaultAdmin = isDefaultAdminEmail(signedInUser.email || normalizedFallbackEmail);
    let { data: meta } = await supabase
      .from('users_meta')
      .select('id, email, role')
      .eq('id', signedInUser.id)
      .maybeSingle();

    if (isDefaultAdmin && meta?.role !== 'admin') {
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
    }

    if (meta?.role === 'employer') return '/employer/dashboard';
    if (meta?.role === 'admin' || isDefaultAdmin) return '/admin/dashboard';
    return '/seeker/dashboard';
  }

  async function handleRequestOtp(channel: OtpChannel) {
    setError('');
    setSuccess('');
    setLoading(true);

    if (channel === 'email' && !authCapabilities.emailOtpEnabled) {
      setError('OTP email belum aktif di project ini.');
      setLoading(false);
      return;
    }

    if (channel === 'sms' && !authCapabilities.smsOtpEnabled) {
      setError('OTP SMS belum aktif di project ini.');
      setLoading(false);
      return;
    }

    const { error } = await requestOtp({
      channel,
      email,
      phone,
    });

    if (error) {
      if (channel === 'sms') {
        setError('OTP SMS gagal dikirim. Pastikan provider SMS sudah aktif di Supabase.');
      } else {
        setError('OTP Gmail gagal dikirim. Pastikan email Auth Supabase aktif.');
      }
      setLoading(false);
      return;
    }

    setOtpChannel(channel);
    setSuccess(channel === 'sms' ? 'OTP SMS berhasil dikirim.' : 'OTP Gmail berhasil dikirim ke email Anda.');
    setLoading(false);
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) {
      setError('Kode OTP wajib diisi.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    const { error } = await verifyOtpCode({
      channel: otpChannel,
      email,
      phone,
      token: otpCode,
    });

    if (error) {
      setError('Kode OTP tidak valid atau sudah kedaluwarsa.');
      setLoading(false);
      return;
    }

    const nextPath = await resolveNextPath(email);
    setSuccess('Verifikasi berhasil. Mengalihkan...');
    setLoading(false);
    setTimeout(() => {
      onClose();
      window.location.href = nextPath;
    }, 800);
  }

  function resetOtpState() {
    setOtpStep(false);
    setOtpCode('');
    setOtpChannel('email');
  }

  async function executeGoogleLogin(selectedEmail: string, selectedName?: string, selectedPhone?: string, avatarUrl?: string) {
    setError('');
    setSuccess('');
    setLoading(true);

    const derivedFullName = selectedName?.trim() || fullName.trim() || selectedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const derivedPhone = selectedPhone?.trim() || phone.trim() || '';

    const normalizedEmail = selectedEmail.trim().toLowerCase();
    try {
      localStorage.setItem('loxer_last_google_email', normalizedEmail);
    } catch {
      // ignore
    }

    const { error } = await signInWithGoogle({
      role,
      fullName: derivedFullName,
      phone: derivedPhone,
      email: normalizedEmail,
      avatarUrl,
      mode,
    });

    if (error) {
      setError(error.message || 'Gagal login dengan Google. Silakan coba lagi.');
      setLoading(false);
      setShowGooglePrompt(false);
      return;
    }

    setShowGooglePrompt(false);
    setSuccess(`Berhasil ${mode === 'login' ? 'masuk' : 'mendaftar'} dengan Google. Mengalihkan...`);

    const nextPath = await resolveNextPath(selectedEmail);
    setTimeout(() => {
      onClose();
      window.location.href = nextPath;
    }, 600);
  }

  async function handleGoogleAuth() {
    setError('');
    setSuccess('');

    // 1. In Supabase mode, redirect to official Google OAuth screen immediately
    if (!isLocalMode) {
      setLoading(true);
      const { error } = await signInWithGoogle({
        role,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        mode,
      });
      if (error) {
        setError(error.message || 'Gagal mengarahkan ke autentikasi Google.');
        setLoading(false);
      }
      return;
    }

    // 2. In Local mode: If Google Client ID is configured, trigger native GIS Google popup!
    if (hasGoogleClientId()) {
      setLoading(true);
      const launched = triggerNativeGoogleOAuth(
        async (profile) => {
          await executeGoogleLogin(profile.email, profile.name, undefined, profile.picture);
        },
        (err) => {
          setLoading(false);
          setError(err.message || 'Autentikasi Google gagal atau dibatalkan.');
        }
      );
      if (launched) return;
    }

    // 3. If email field is already populated, authenticate directly
    if (email.trim() && email.includes('@')) {
      await executeGoogleLogin(email.trim(), fullName.trim(), phone.trim());
      return;
    }

    // 4. Otherwise, open clean Google Email entry prompt with remembered email
    const rememberedEmail = (typeof window !== 'undefined' ? localStorage.getItem('loxer_last_google_email') : '') || '';
    setCustomGoogleEmail(rememberedEmail);
    setShowGooglePrompt(true);
  }

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
        const nextPath = await resolveNextPath(normalizedEmail);

        onClose();
        window.location.href = nextPath;
      }
    } else {
      resetOtpState();
      if (!fullName.trim()) { setError('Nama lengkap wajib diisi.'); setLoading(false); return; }
      if (!phone.trim()) { setError('Nomor telepon wajib diisi.'); setLoading(false); return; }
      if (password.length < 6) { setError('Password minimal 6 karakter.'); setLoading(false); return; }
      const { error } = await signUp(email, password, role, fullName, phone);
      if (error) {
        setError('Gagal mendaftar. Email mungkin sudah terdaftar.');
      } else {
        if (canUseAnyOtp) {
          setOtpStep(true);
          setOtpChannel(authCapabilities.emailOtpEnabled ? 'email' : 'sms');
          setSuccess('Akun berhasil dibuat. Pilih pengiriman OTP untuk verifikasi akun.');
        } else {
          const nextPath = await resolveNextPath(email);
          setSuccess('Akun berhasil dibuat. Mengalihkan...');
          setTimeout(() => {
            onClose();
            window.location.href = nextPath;
          }, 800);
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAuthCapabilities();
  }, []);

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel / Bottom Sheet */}
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-sky-100 bg-white shadow-2xl shadow-sky-900/20 animate-fade-up pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Android Native Visual Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="bottom-sheet-handle" />
        </div>

        {/* Header gradient accent */}
        <div className="h-1.5 gradient-cta" />

        <div className="max-h-[calc(88dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-8">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-sky-600 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full active-press"
            aria-label="Tutup Dialog"
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
            {otpStep ? (
              <>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-800">Verifikasi OTP</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Kirim kode OTP ke Gmail atau SMS, lalu masukkan kodenya untuk menyelesaikan pendaftaran.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRequestOtp('email')}
                    disabled={loading || !authCapabilities.emailOtpEnabled}
                    className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50 disabled:opacity-50"
                  >
                    Kirim OTP Gmail
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestOtp('sms')}
                    disabled={loading || !authCapabilities.smsOtpEnabled}
                    className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50 disabled:opacity-50"
                  >
                    Kirim OTP SMS
                  </button>
                </div>

                <div>
                  <label className="label">Kode OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder={otpChannel === 'sms' ? 'Masukkan OTP dari SMS' : 'Masukkan OTP dari Gmail'}
                    className="input-field"
                  />
                </div>

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

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="w-full gradient-cta text-white rounded-xl py-3 font-semibold text-sm shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Memproses...</>
                  ) : 'Verifikasi OTP'}
                </button>

                <button
                  type="button"
                  onClick={resetOtpState}
                  className="w-full rounded-xl border border-sky-200 py-3 text-sm font-semibold text-slate-600 hover:bg-sky-50"
                >
                  Kembali ke Form Daftar
                </button>
              </>
            ) : (
              <>
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

            {mode === 'register' && (
              <div>
                <label className="label">Nomor Telepon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62 812 xxxx xxxx"
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

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-sky-100" />
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">atau</span>
              <div className="h-px flex-1 bg-sky-100" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full rounded-xl border border-sky-200 bg-white py-3 font-semibold text-sm text-slate-700 shadow-sm hover:bg-sky-50 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5A9.5 9.5 0 1 0 12 21.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.1-1.6H12Z" />
                  <path fill="#34A853" d="M3.4 7.7l3.2 2.3C7.4 8 9.5 6.2 12 6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5c-3.6 0-6.7 2.1-8.2 5.2Z" />
                  <path fill="#FBBC05" d="M12 21.5c2.5 0 4.5-.8 6.1-2.2l-2.8-2.3c-.8.6-1.8.9-3.3.9-3.8 0-5.2-2.4-5.5-3.7l-3.2 2.4c1.5 3.1 4.6 4.9 8.7 4.9Z" />
                  <path fill="#4285F4" d="M21.1 12.3c0-.6-.1-1.1-.1-1.6H12v3.9h5.5c-.3 1.3-1.1 2.4-2.2 3.1l2.8 2.3c1.7-1.5 3-4 3-7.7Z" />
                </svg>
              </span>
              {mode === 'login' ? 'Masuk dengan Gmail' : 'Daftar dengan Gmail'}
            </button>
            {mode === 'register' && !capabilitiesLoading && !canUseAnyOtp && (
              <p className="text-center text-xs text-slate-400">
                Pendaftaran instan tanpa hambatan OTP.
              </p>
            )}
              </>
            )}
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

      {showGooglePrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl border border-slate-700/80 text-white">
            <button
              type="button"
              onClick={() => setShowGooglePrompt(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3 shadow-inner">
                <svg viewBox="0 0 24 24" className="h-6 w-6">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5A9.5 9.5 0 1 0 12 21.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.1-1.6H12Z" />
                  <path fill="#34A853" d="M3.4 7.7l3.2 2.3C7.4 8 9.5 6.2 12 6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5c-3.6 0-6.7 2.1-8.2 5.2Z" />
                  <path fill="#FBBC05" d="M12 21.5c2.5 0 4.5-.8 6.1-2.2l-2.8-2.3c-.8.6-1.8.9-3.3.9-3.8 0-5.2-2.4-5.5-3.7l-3.2 2.4c1.5 3.1 4.6 4.9 8.7 4.9Z" />
                  <path fill="#4285F4" d="M21.1 12.3c0-.6-.1-1.1-.1-1.6H12v3.9h5.5c-.3 1.3-1.1 2.4-2.2 3.1l2.8 2.3c1.7-1.5 3-4 3-7.7Z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">
                {mode === 'login' ? 'Masuk dengan Akun Google' : 'Daftar dengan Akun Google'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Autentikasi akun Google Anda sebagai {role === 'employer' ? 'Perusahaan' : 'Pencari Kerja'}
              </p>
            </div>

            {customGoogleEmail && customGoogleEmail.includes('@') && (
              <div className="mb-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => executeGoogleLogin(customGoogleEmail.trim())}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-cyan-500/40 text-left transition-all group shadow-sm hover:border-cyan-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
                      {customGoogleEmail[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        Lanjutkan 1-Klik sebagai:
                      </div>
                      <div className="text-[11px] text-cyan-300 font-mono truncate max-w-[200px]">
                        {customGoogleEmail}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center my-3.5 gap-2">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">atau ketik akun lain</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customGoogleEmail.trim()) {
                  executeGoogleLogin(customGoogleEmail.trim());
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alamat Email Google / Gmail:
                </label>
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="nama.anda@gmail.com"
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-cta text-white text-sm font-semibold py-3 px-4 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Memproses...' : 'Lanjutkan dengan Google'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                Daftar instan tanpa password — langsung aktif otomatis
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
