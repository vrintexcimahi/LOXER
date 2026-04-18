import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Briefcase, Mail, Lock, User, Eye, EyeOff, Building2, UserCheck, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { UserRole } from '../../lib/types';
import BrandText from '../../components/ui/BrandText';
import { DEFAULT_ADMIN_EMAIL, isDefaultAdminEmail, normalizeComparableEmail } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

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

  const canUseGoogleAuth = authCapabilities.googleEnabled;
  const canUseAnyOtp = authCapabilities.emailOtpEnabled || authCapabilities.smsOtpEnabled;

  async function resolveNextPath(fallbackEmail?: string) {
    let nextPath = '/seeker/dashboard';
    if (!supabase) return nextPath;

    const { data: authData } = await supabase.auth.getUser();
    const signedInUser = authData.user;

    if (!signedInUser) return nextPath;

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

  async function handleGoogleAuth() {
    setError('');
    setLoading(true);

    if (!canUseGoogleAuth) {
      setError('Login Gmail belum aktif di project ini.');
      setLoading(false);
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Nama lengkap wajib diisi.');
        setLoading(false);
        return;
      }

      if (!phone.trim()) {
        setError('Nomor telepon wajib diisi.');
        setLoading(false);
        return;
      }
    }

    const { error } = await signInWithGoogle({
      role,
      fullName,
      phone,
      mode,
    });

    if (error) {
      setError('Gagal memulai login Gmail. Pastikan Google Auth sudah aktif di Supabase.');
      setLoading(false);
    }
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
              disabled={loading || capabilitiesLoading || !canUseGoogleAuth}
              className="w-full rounded-xl border border-sky-200 bg-white py-3 font-semibold text-sm text-slate-700 shadow-sm hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors"
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
            {!capabilitiesLoading && !canUseGoogleAuth && (
              <p className="text-center text-xs text-slate-400">
                Login Gmail belum aktif di project ini.
              </p>
            )}
            {mode === 'register' && !capabilitiesLoading && !canUseAnyOtp && (
              <p className="text-center text-xs text-slate-400">
                OTP email/SMS belum aktif, jadi pendaftaran akan langsung masuk tanpa langkah OTP.
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
    </div>
  );

  return createPortal(modalContent, document.body);
}
