import { ReactNode, useMemo } from 'react';
import { Home, Search, FileText, User, LogOut, Briefcase, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import BrandText from '../ui/BrandText';
import ThemeToggle from '../ui/ThemeToggle';
import usePersistentSidebar from './usePersistentSidebar';
import NotificationBell from '../ui/NotificationBell';
import DashboardGuideAssistant from '../ui/DashboardGuideAssistant';
import { seekerGuideContent } from '../../lib/dashboardGuideContent';

const navItems = [
  { label: 'Dashboard', description: 'Ringkasan progres pencarian kerja', icon: Home, href: '/seeker/dashboard' },
  { label: 'Cari Lowongan', description: 'Temukan posisi yang sesuai profilmu', icon: Search, href: '/seeker/browse' },
  { label: 'Lamaran Saya', description: 'Pantau status semua aplikasi kerja', icon: FileText, href: '/seeker/applications' },
  { label: 'Profil', description: 'Perbarui CV dan data personal', icon: User, href: '/seeker/profile' },
];

interface SeekerLayoutProps {
  children: ReactNode;
  currentPath: string;
}

export default function SeekerLayout({ children, currentPath }: SeekerLayoutProps) {
  const { user, userMeta, signOut } = useAuth();
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = usePersistentSidebar('loxer-seeker-sidebar');
  const assistantGuides = useMemo(
    () =>
      navItems.flatMap((item) => {
        const guide = seekerGuideContent[item.href];
        if (!guide) return [];

        return [
          {
            id: item.href,
            label: item.label,
            description: item.description,
            href: item.href,
            ...guide,
          },
        ];
      }),
    []
  );
  const currentDetail =
    navItems.find((item) => item.href === currentPath) ?? {
      label: 'Seeker Workspace',
      description: 'Kelola profil, lowongan, dan progres lamaranmu',
    };

  const handleSignOut = async () => {
    closeMobile();
    await signOut();
    window.location.assign('/');
  };

  return (
    <div className="flex min-h-screen bg-sky-50">
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full min-h-0 overflow-hidden gradient-sidebar z-40 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/10 py-5 ${isCollapsed ? 'justify-center px-3' : 'gap-2 px-6'}`}>
          <div className="w-8 h-8 gradient-cta rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed ? <BrandText className="text-xl font-black" /> : null}
        </div>

        {/* Nav */}
        <nav className="dashboard-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-6 space-y-1">
          {navItems.map(({ label, description, icon: Icon, href }) => {
            const active = currentPath === href;
            return (
              <a
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                  active ? 'sidebar-item-active' : 'sidebar-item'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title={isCollapsed ? `${label} - ${description}` : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!isCollapsed ? (
                  <div className="min-w-0">
                    <p className={`truncate font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{label}</p>
                    <p className={`truncate text-[11px] ${active ? 'text-cyan-200/90' : 'text-slate-500'}`}>{description}</p>
                  </div>
                ) : null}
              </a>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="px-4 py-4 border-t border-white/10">
          {user ? (
            <div className={`glass rounded-2xl p-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(userMeta?.email || user.email || '?')[0].toUpperCase()}
              </div>
              {!isCollapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{userMeta?.email || user.email}</p>
                  <p className="text-cyan-400 text-[10px]">Seeker (Pencari Kerja)</p>
                </div>
              ) : null}
              <button
                onClick={handleSignOut}
                className={`text-slate-400 hover:text-red-400 transition-colors p-1 ${isCollapsed ? 'absolute opacity-0 pointer-events-none' : ''}`}
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className={`glass rounded-2xl p-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} hover:bg-white/15 transition-colors text-white text-xs`}
              title={isCollapsed ? 'Masuk / Daftar' : undefined}
            >
              <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              {!isCollapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">Masuk ke LOXER</p>
                  <p className="text-cyan-400 text-[10px]">Login / Daftar</p>
                </div>
              ) : null}
            </a>
          )}
        </div>
      </aside>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={closeMobile}
            aria-label="Close sidebar overlay"
          />
          <aside className="absolute left-0 top-0 flex h-full min-h-0 w-72 flex-col overflow-hidden gradient-sidebar shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 gradient-cta rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <BrandText className="text-xl font-black" />
              </div>
              <button onClick={closeMobile} className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="dashboard-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-6 space-y-1">
              {navItems.map(({ label, description, icon: Icon, href }) => {
                const active = currentPath === href;
                return (
                  <a
                    key={href}
                    href={href}
                    onClick={closeMobile}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      active ? 'sidebar-item-active' : 'sidebar-item'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{label}</p>
                      <p className={`truncate text-[11px] ${active ? 'text-cyan-200/90' : 'text-slate-500'}`}>{description}</p>
                    </div>
                  </a>
                );
              })}
            </nav>

            <div className="border-t border-white/10 px-4 py-4">
              {user ? (
                <div className="glass rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(userMeta?.email || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-semibold truncate">{userMeta?.email || user.email}</p>
                    <p className="text-cyan-400 text-[10px]">Seeker (Pencari Kerja)</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-slate-400 hover:text-red-400 transition-colors p-1"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <a
                  href="/login"
                  onClick={closeMobile}
                  className="glass rounded-2xl p-3 flex items-center gap-3 text-white hover:bg-white/15 transition-colors"
                >
                  <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-semibold">Masuk ke LOXER</p>
                    <p className="text-cyan-400 text-[10px]">Login / Daftar</p>
                  </div>
                </a>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className={`flex-1 min-w-0 min-h-screen transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="sticky top-0 z-30 border-b border-white/10 gradient-sidebar backdrop-blur pt-safe">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8 max-w-[min(100%,1920px)] mx-auto w-full">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    toggleCollapsed();
                    return;
                  }
                  toggleMobile();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35 text-slate-100 shadow-sm transition hover:bg-white/10 hover:text-cyan-200 active-press"
                aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
                title={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
              >
                <span className="hidden lg:block">
                  {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </span>
                <span className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </span>
              </button>

              <div className="flex items-center gap-2 lg:hidden">
                <Briefcase className="w-5 h-5 text-cyan-300" />
                <BrandText className="text-base font-black" />
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Seeker Workspace</p>
                <p className="text-sm text-slate-300">
                  {currentDetail.label}: {currentDetail.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle compact />
              <NotificationBell compact />
              <div className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100 sm:block">
                Seeker (Pencari Kerja)
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full min-w-0 max-w-[min(100%,1920px)] mx-auto px-[clamp(12px,2vw,32px)] py-4 sm:py-6 lg:py-8 page-enter pb-24 lg:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation - Material 3 Android Native Style */}
        <nav
          aria-label="Seeker Mobile Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-1 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="flex items-center justify-around">
            {navItems.map(({ label, icon: Icon, href }) => {
              const active = currentPath === href;
              return (
                <a
                  key={href}
                  href={href}
                  className="flex flex-1 flex-col items-center justify-center min-h-[48px] py-1 active-press transition-transform"
                >
                  <div
                    className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-all duration-200 ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                  </div>
                  <span
                    className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${
                      active
                        ? 'text-cyan-700 dark:text-cyan-300 font-bold'
                        : 'text-slate-500 dark:text-slate-400 font-medium'
                    }`}
                  >
                    {label}
                  </span>
                </a>
              );
            })}
            <button
              type="button"
              onClick={toggleMobile}
              className="flex flex-1 flex-col items-center justify-center min-h-[48px] py-1 active-press transition-transform cursor-pointer"
              aria-label="Buka Menu Lainnya"
            >
              <div
                className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-all duration-200 ${
                  isMobileOpen
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Menu className="w-5 h-5" strokeWidth={isMobileOpen ? 2.2 : 1.8} />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 ${
                  isMobileOpen
                    ? 'text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                Menu
              </span>
            </button>
          </div>
        </nav>

        <DashboardGuideAssistant
          workspaceLabel="Panduan Seeker LOXER"
          workspaceDescription="Pilih menu yang ingin Anda pahami. Bot assistant ini menyimpan panduan terakhir agar lebih mudah dilanjutkan saat kembali."
          storageKey="loxer-guide-seeker"
          currentGuideId={currentPath}
          guides={assistantGuides}
        />
      </main>
    </div>
  );
}
