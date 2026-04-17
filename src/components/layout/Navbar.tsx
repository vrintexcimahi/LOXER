import { useState, useEffect } from 'react';
import { Briefcase, Menu, X, ChevronDown, User, LogOut, Settings, PenSquare, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import BrandText from '../ui/BrandText';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationBell from '../ui/NotificationBell';

interface NavbarProps {
  onLogin?: () => void;
  onRegister?: () => void;
}

const userPresenceGroups = [
  {
    key: 'seeker',
    label: 'Seeker',
    description: 'Pencari Kerja',
    minOnline: 1567,
    maxOnline: 48524,
  },
  {
    key: 'employer',
    label: 'Employer',
    description: 'Perusahaan',
    minOnline: 524,
    maxOnline: 12524,
  },
];

function formatOnlineCount(value: number) {
  return value.toLocaleString('id-ID');
}

function getRandomOnlineUsers(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStepSize(current: number, min: number, max: number) {
  const range = max - min;
  const progress = range === 0 ? 0 : (current - min) / range;

  if (progress < 0.2) return Math.max(18, Math.round(range * 0.018));
  if (progress < 0.5) return Math.max(22, Math.round(range * 0.014));
  if (progress < 0.8) return Math.max(16, Math.round(range * 0.01));
  return Math.max(10, Math.round(range * 0.006));
}

function getNextOnlineUsers(current: number, min: number, max: number) {
  const range = max - min;
  const upwardBias = current < min + range * 0.72;
  const direction = upwardBias
    ? (Math.random() < 0.82 ? 1 : -1)
    : (Math.random() < 0.64 ? -1 : 1);
  const baseStep = getStepSize(current, min, max);
  const variance = Math.max(6, Math.round(baseStep * 0.35));
  const delta = baseStep + Math.floor(Math.random() * variance);

  return clampValue(current + (direction * delta), min, max);
}

export default function Navbar({ onLogin, onRegister }: NavbarProps) {
  const { user, userMeta, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [onlineUsersByGroup, setOnlineUsersByGroup] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      userPresenceGroups.map((group) => [
        group.key,
        getRandomOnlineUsers(group.minOnline, group.maxOnline),
      ]),
    ),
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setOnlineUsersByGroup((current) =>
        Object.fromEntries(
          userPresenceGroups.map((group) => [
            group.key,
            getNextOnlineUsers(
              current[group.key] ?? group.minOnline,
              group.minOnline,
              group.maxOnline,
            ),
          ]),
        ),
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const userPresence = userPresenceGroups.map((group) => {
    return {
      ...group,
      online: formatOnlineCount(onlineUsersByGroup[group.key] ?? group.minOnline),
    };
  });

  const getDashboardPath = () => {
    if (!userMeta) return '/';
    if (userMeta.role === 'admin') return '/admin/dashboard';
    return userMeta.role === 'employer' ? '/employer/dashboard' : '/seeker/dashboard';
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await signOut();
    window.location.assign('/');
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0F172A]/95 backdrop-blur-md shadow-xl shadow-sky-900/20'
          : 'bg-transparent'
      }`}
      style={{ background: scrolled ? undefined : 'linear-gradient(90deg, #0F172A, #0369A1)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 gradient-cta rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <BrandText className="text-xl font-black tracking-tight" />
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="/#features" className="text-slate-300 hover:text-cyan-400 text-sm font-medium transition-colors duration-200 relative group">
              Features
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="/#how-it-works" className="text-slate-300 hover:text-cyan-400 text-sm font-medium transition-colors duration-200 relative group">
              How It Works
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full" />
            </a>
            {!user && (
              <a href="/browse" className="text-slate-300 hover:text-cyan-400 text-sm font-medium transition-colors duration-200 relative group">
                Browse Jobs
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full" />
              </a>
            )}
          </div>

          {!user ? (
            <div className="hidden lg:flex items-center gap-2">
              {userPresence.map((group) => (
                <div
                  key={group.key}
                  className="animate-status-pill flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-white/8 px-3 py-2 text-xs text-slate-100 shadow-lg shadow-sky-950/10 backdrop-blur-sm transition-transform"
                >
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]">
                    <span className="absolute inset-0 rounded-full bg-emerald-300/70 animate-ping" />
                  </span>
                  <div className="leading-tight">
                    <p className="font-semibold text-white">{group.label} <span className="text-slate-300 font-medium">({group.description})</span></p>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-cyan-100">{group.online} online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle compact />
            {user && userMeta ? (
              <>
                {/* Notifications */}
                <div onClick={() => setUserMenuOpen(false)}>
                  <NotificationBell />
                </div>

                {/* Dashboard Link */}
                <a
                  href={getDashboardPath()}
                  className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  Dashboard
                </a>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => { setUserMenuOpen(!userMenuOpen); }}
                    className="flex items-center gap-2 glass rounded-full px-3 py-1.5 text-white text-sm hover:bg-white/15 transition-colors"
                  >
                    <div className="w-6 h-6 gradient-cta rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {(userMeta.email || '?')[0].toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate text-xs">{userMeta.email}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-sky-100 overflow-hidden z-50">
                      <a href={getDashboardPath()} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-sky-50 transition-colors">
                        <User className="w-4 h-4 text-sky-500" /> Profile
                      </a>
                      <a href={userMeta.role === 'employer' ? '/employer/company' : userMeta.role === 'admin' ? '/admin/dashboard' : '/seeker/profile'} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-sky-50 transition-colors">
                        <Settings className="w-4 h-4 text-sky-500" /> Settings
                      </a>
                      {userMeta.role === 'admin' ? (
                        <a
                          href="/admin/dashboard"
                          className="mx-3 mb-2 mt-1 flex items-center gap-2 rounded-lg border border-cyan-500/20 px-4 py-2 text-sm text-cyan-500 hover:bg-cyan-500/10"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Admin (Administrator)
                        </a>
                      ) : null}
                      {userMeta.role === 'employer' ? (
                        <a href="/admin/editor" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-sky-50 transition-colors">
                          <PenSquare className="w-4 h-4 text-sky-500" /> Visual Editor
                        </a>
                      ) : null}
                      <hr className="border-sky-100" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="text-white text-sm font-medium hover:text-cyan-400 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onRegister}
                  className="gradient-cta text-white rounded-full px-5 py-2 text-sm font-semibold shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all duration-150"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0F172A]/98 backdrop-blur-xl border-t border-white/10 px-4 py-6 flex flex-col gap-4">
          <div className="flex justify-start">
            <ThemeToggle />
          </div>
          {!user ? (
            <div className="flex flex-col gap-2">
              {userPresence.map((group) => (
                <div
                  key={group.key}
                  className="animate-status-pill inline-flex w-fit items-center gap-2 rounded-2xl border border-cyan-300/20 bg-white/5 px-3 py-2 text-xs text-slate-100"
                >
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]">
                    <span className="absolute inset-0 rounded-full bg-emerald-300/70 animate-ping" />
                  </span>
                  <div className="leading-tight">
                    <p className="font-semibold text-white">{group.label} <span className="text-slate-300 font-medium">({group.description})</span></p>
                    <p className="text-[11px] text-slate-300">{group.online} online</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <a href="/#features" className="text-slate-300 hover:text-white text-sm font-medium">Features</a>
          <a href="/#how-it-works" className="text-slate-300 hover:text-white text-sm font-medium">How It Works</a>
          <a href="/browse" className="text-slate-300 hover:text-white text-sm font-medium">Browse Jobs</a>
          <hr className="border-white/10" />
          {user ? (
            <>
              <a href={getDashboardPath()} className="text-white font-medium text-sm">Dashboard</a>
              {userMeta?.role === 'employer' ? (
                <a href="/admin/editor" className="text-white font-medium text-sm">Visual Editor</a>
              ) : null}
              {userMeta?.role === 'admin' ? (
                <a href="/admin/dashboard" className="text-cyan-300 font-medium text-sm inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Admin (Administrator)
                </a>
              ) : null}
              <button onClick={handleSignOut} className="text-red-400 text-sm text-left font-medium">Sign Out</button>
            </>
          ) : (
            <>
              <button onClick={onLogin} className="text-white text-sm font-medium text-left">Sign In</button>
              <button onClick={onRegister} className="gradient-cta text-white rounded-xl px-5 py-3 text-sm font-semibold w-full">Get Started Free</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
