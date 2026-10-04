import { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown, ChevronRight, User, LogOut, Settings, ShieldCheck, Download, Briefcase, Users, Zap, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { useAdminEasterEgg } from '../../hooks/useAdminEasterEgg';
import { useAppAccess } from '../../contexts/AppAccessContext';
import BrandText from '../ui/BrandText';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationBell from '../ui/NotificationBell';
import AndroidToast from '../ui/AndroidToast';

import { UserRole } from '../../lib/types';

interface NavbarProps {
  onLogin?: () => void;
  onRegister?: (role?: UserRole) => void;
}

const userPresenceGroups = [
  {
    key: 'seeker',
    label: 'Seeker',
    description: 'Pencari Kerja',
    minOnline: 750,
    maxOnline: 16500,
  },
  {
    key: 'employer',
    label: 'Employer',
    description: 'Perusahaan',
    minOnline: 250,
    maxOnline: 3500,
  },
  {
    key: 'freelancer',
    label: 'Jasa',
    description: 'Penyedia Jasa Mandiri',
    minOnline: 150,
    maxOnline: 1750,
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

  if (progress < 0.2) return Math.max(6, Math.round(range * 0.018));
  if (progress < 0.5) return Math.max(8, Math.round(range * 0.014));
  if (progress < 0.8) return Math.max(6, Math.round(range * 0.01));
  return Math.max(4, Math.round(range * 0.006));
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

export default function Navbar({ onLogin: _onLogin, onRegister: _onRegister }: NavbarProps) {
  const { user, userMeta, signOut } = useAuth();
  const {
    isSuperAdmin,
    openInstallModal,
    openSecretAdminModal,
    lockSuperAdmin,
  } = useAppAccess();
  const {
    isUnlocked,
    handleTriggerClick,
    toastMessage,
    toastVisible,
    setToastVisible,
  } = useAdminEasterEgg({
    totalClicks: 5,
    notifyStartClick: 2,
    onUnlocked: () => {
      openSecretAdminModal();
    },
  });
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [currentSearch, setCurrentSearch] = useState(() =>
    typeof window !== 'undefined' ? window.location.search : ''
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isIklanLokerActive =
    (currentPath === '/browse' || currentPath === '/seeker/browse') &&
    !currentSearch.includes('category=freelance');

  const isPelamarKerjaActive =
    (currentPath === '/talents' || currentPath === '/pelamar' || currentPath === '/pelamar-kerja') &&
    (currentSearch.includes('availability=fulltime') || currentSearch.includes('type=pelamar'));

  const isFreelancerActive =
    ((currentPath === '/talents' || currentPath === '/freelance' || currentPath === '/jasa') &&
      (currentSearch.includes('availability=freelance') || currentSearch.includes('type=freelance'))) ||
    currentSearch.includes('category=freelance');

  const isMarketplaceActive =
    currentPath === '/marketplace' || currentPath === '/products';
  const [onlineUsersByGroup, setOnlineUsersByGroup] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      userPresenceGroups.map((group) => [
        group.key,
        getRandomOnlineUsers(group.minOnline, group.maxOnline),
      ]),
    ),
  );

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

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
    }, 4000);

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
    if (userMeta.role === 'admin' || userMeta.role === 'superadmin') return '/admin/dashboard';
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
      className={`fixed top-0 left-0 right-0 z-50 pt-safe transition-all duration-300 ${
        scrolled
          ? 'bg-[#0F172A]/95 backdrop-blur-md shadow-xl shadow-sky-900/20'
          : 'bg-transparent'
      }`}
      style={{ background: scrolled ? undefined : 'linear-gradient(90deg, #0F172A, #0369A1)' }}
    >
      <div className="w-full max-w-[min(100%,1920px)] mx-auto px-[clamp(16px,3vw,48px)]">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo with Easter Egg Trigger */}
          <a
            href="/"
            onClick={(e) => {
              if (e.detail > 1) {
                e.preventDefault();
              }
              handleTriggerClick(e);
            }}
            className="flex items-center gap-2 group active-press select-none cursor-pointer"
            title={isUnlocked ? 'Mode Developer / Administrator Aktif' : undefined}
          >
            <img src="/branding/icon64.png" alt="LOXER Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/30 group-hover:brightness-110 transition" />
            <BrandText className="text-xl font-black tracking-tight" />
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-5 lg:gap-7">
            {/* 1. Iklan Loker */}
            <a
              href="/browse"
              className={`text-sm font-medium transition-colors duration-200 relative group flex items-center gap-1.5 ${
                isIklanLokerActive ? 'text-cyan-400 font-semibold' : 'text-slate-300 hover:text-cyan-400'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>Iklan Loker</span>
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-cyan-400 transition-all duration-300 ${
                  isIklanLokerActive ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </a>

            {/* 2. Pelamar Kerja */}
            <a
              href="/talents?availability=fulltime"
              className={`text-sm font-medium transition-colors duration-200 relative group flex items-center gap-1.5 ${
                isPelamarKerjaActive ? 'text-cyan-400 font-semibold' : 'text-slate-300 hover:text-cyan-400'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pelamar Kerja</span>
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-cyan-400 transition-all duration-300 ${
                  isPelamarKerjaActive ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </a>

            {/* 3. Jasa Mandiri */}
            <a
              href="/talents?availability=freelance"
              className={`text-sm font-medium transition-colors duration-200 relative group flex items-center gap-1.5 ${
                isFreelancerActive ? 'text-amber-400 font-semibold' : 'text-slate-300 hover:text-amber-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Jasa</span>
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-amber-400 transition-all duration-300 ${
                  isFreelancerActive ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </a>

            {/* 4. Marketplace (Produk Digital / Sekon / Lainnya) */}
            <a
              href="/marketplace"
              className={`text-sm font-medium transition-colors duration-200 relative group flex items-center gap-1.5 ${
                isMarketplaceActive ? 'text-cyan-400 font-semibold' : 'text-slate-300 hover:text-cyan-400'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Marketplace</span>
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-cyan-400 transition-all duration-300 ${
                  isMarketplaceActive ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </a>

            {(isUnlocked || userMeta?.role === 'admin' || userMeta?.role === 'superadmin' || isSuperAdmin) && (
              <a
                href="/admin/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 transition shadow-sm animate-pulse"
                title="Panel Administrator God Mode"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>God Mode</span>
              </a>
            )}
          </div>

          {!user ? (
            <div className="hidden xl:flex items-center gap-2">
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
            {/* Super Admin Bypass Active Indicator */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5 animate-pulse">
                <a
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 hover:bg-cyan-500/30 transition shadow-sm"
                  title="Super Admin Bypass Web Aktif - Buka Dashboard"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Super Admin</span>
                </a>
                <button
                  type="button"
                  onClick={lockSuperAdmin}
                  className="text-[10px] text-slate-400 hover:text-rose-400 transition underline cursor-pointer"
                  title="Kunci kembali mode Super Admin"
                >
                  Kunci
                </button>
              </div>
            )}


            <button
              type="button"
              onClick={() => openInstallModal('Download & Pasang Aplikasi')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30 transition shadow-sm cursor-pointer active:scale-95"
              title="Unduh / Pasang Aplikasi LOXER"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Aplikasi LOXER</span>
            </button>

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
                <div ref={userMenuRef} className="relative">
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
                      <a href={userMeta.role === 'employer' ? '/employer/company' : (userMeta.role === 'admin' || userMeta.role === 'superadmin') ? '/admin/dashboard' : '/seeker/profile'} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-sky-50 transition-colors">
                        <Settings className="w-4 h-4 text-sky-500" /> Settings
                      </a>
                      {(userMeta.role === 'admin' || userMeta.role === 'superadmin') ? (
                        <a
                          href="/admin/dashboard"
                          className="mx-3 mb-2 mt-1 flex items-center gap-2 rounded-lg border border-cyan-500/20 px-4 py-2 text-sm text-cyan-500 hover:bg-cyan-500/10"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Admin (Administrator)
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
            ) : isUnlocked || isSuperAdmin ? (
              <a
                href="/admin/dashboard"
                className="gradient-cta text-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Portal Admin
              </a>
            ) : null}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active-press"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Tutup Menu' : 'Buka Menu'}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0F172A]/98 backdrop-blur-xl border-t border-white/10 px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-4 animate-fade-up">
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
          {/* Menu Data Tampilan (1 Baris 3 Grid) & Marketplace */}
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-2">
              {/* 1. Iklan Loker */}
              <a
                href="/browse"
                onClick={() => setMobileOpen(false)}
                className={`group flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border transition-all duration-200 active:scale-95 text-center ${
                  isIklanLokerActive
                    ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-cyan-500/30'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 ${
                    isIklanLokerActive
                      ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/40'
                      : 'bg-cyan-500/15 text-cyan-400 border border-cyan-400/20'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium leading-tight">Iklan Loker</span>
              </a>

              {/* 2. Pelamar Kerja */}
              <a
                href="/talents?availability=fulltime"
                onClick={() => setMobileOpen(false)}
                className={`group flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border transition-all duration-200 active:scale-95 text-center ${
                  isPelamarKerjaActive
                    ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-cyan-500/30'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 ${
                    isPelamarKerjaActive
                      ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/40'
                      : 'bg-cyan-500/15 text-cyan-400 border border-cyan-400/20'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium leading-tight">Pelamar Kerja</span>
              </a>

              {/* 3. Freelancer / Jasa */}
              <a
                href="/talents?availability=freelance"
                onClick={() => setMobileOpen(false)}
                className={`group flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border transition-all duration-200 active:scale-95 text-center ${
                  isFreelancerActive
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-amber-500/30'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 ${
                    isFreelancerActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-400/20'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium leading-tight">Jasa</span>
              </a>
            </div>

            {/* 4. Marketplace Card */}
            <a
              href="/marketplace"
              onClick={() => setMobileOpen(false)}
              className={`group relative overflow-hidden flex items-center justify-between p-2.5 px-3 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                isMarketplaceActive
                  ? 'bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-cyan-500/10 border-cyan-400/60 text-cyan-200 shadow-md shadow-cyan-950/40'
                  : 'bg-gradient-to-r from-white/[0.04] to-cyan-500/[0.03] border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/30 hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${
                    isMarketplaceActive
                      ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/40'
                      : 'bg-cyan-500/15 text-cyan-400 border border-cyan-400/20'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white tracking-tight">Marketplace</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                      PRODUK & JASA
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Jual beli produk digital, fisik & kebutuhan kerja
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
          </div>
          {/* Mobile Install App / Download APK Button */}
          <button
            type="button"
            onClick={() => {
              openInstallModal('Pasang / Download Aplikasi LOXER');
              setMobileOpen(false);
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/25 to-sky-500/25 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-400/40 text-sm font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download APK / Pasang Aplikasi</span>
          </button>
          <hr className="border-white/10" />
          {user ? (
            <>
              <a href={getDashboardPath()} className="text-white font-medium text-sm">Dashboard</a>
              {(isUnlocked || userMeta?.role === 'admin' || userMeta?.role === 'superadmin' || isSuperAdmin) ? (
                <a href="/admin/dashboard" className="text-cyan-300 font-medium text-sm inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" /> Mode Administrator (God Mode)
                </a>
              ) : null}
              <button onClick={handleSignOut} className="text-red-400 text-sm text-left font-medium">Sign Out</button>
            </>
          ) : (
            <>
              {(isUnlocked || isSuperAdmin) && (
                <a
                  href="/admin/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="gradient-cta text-white rounded-xl px-5 py-2.5 text-sm font-semibold w-full text-center inline-flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Portal Admin
                </a>
              )}
            </>
          )}
        </div>
      )}

      <AndroidToast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />
    </nav>
  );
}
