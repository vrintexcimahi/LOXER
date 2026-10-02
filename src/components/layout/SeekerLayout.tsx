import { ReactNode, useMemo } from 'react';
import { Home, Search, FileText, User, LogOut, ChevronLeft, ChevronRight, Menu, X, Sparkles } from 'lucide-react';
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
  { label: 'Marketplace Saya', description: 'Publikasikan biodata & penawaran jasa kerja', icon: Sparkles, href: '/seeker/marketplace' },
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

  const isFreelancer =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('preview_role') === 'freelancer' ||
      new URLSearchParams(window.location.search).get('preview_role') === 'jasa' ||
      new URLSearchParams(window.location.search).get('category') === 'freelance' ||
      new URLSearchParams(window.location.search).get('category') === 'jasa' ||
      userMeta?.role === 'freelancer' ||
      window.location.pathname.includes('freelance') ||
      currentPath.includes('freelance'));

  const roleBadgeLabel = isFreelancer ? 'Jasa' : 'Pencari Kerja';
  const roleBadgeClass = isFreelancer
    ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-sm shadow-amber-500/20'
    : 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 shadow-sm shadow-cyan-500/20';

  const mobileNavItems = useMemo(() => {
    if (isFreelancer) {
      return [
        { label: 'Home', icon: Home, href: '/seeker/dashboard?preview_role=freelancer' },
        { label: 'Order', icon: Search, href: '/seeker/browse?category=jasa&preview_role=freelancer' },
        { label: 'Jasa Saya', icon: Sparkles, href: '/seeker/marketplace?preview_role=freelancer', isCenterAction: true },
        { label: 'Tawaran', icon: FileText, href: '/seeker/applications?preview_role=freelancer' },
        { label: 'Profil', icon: User, href: '/seeker/profile?preview_role=freelancer' },
      ];
    }
    return [
      { label: 'Home', icon: Home, href: '/seeker/dashboard' },
      { label: 'Cari Kerja', icon: Search, href: '/seeker/browse' },
      { label: 'Marketplace', icon: Sparkles, href: '/seeker/marketplace', isCenterAction: true },
      { label: 'Lamaran', icon: FileText, href: '/seeker/applications' },
      { label: 'Profil', icon: User, href: '/seeker/profile' },
    ];
  }, [isFreelancer]);

  return (
    <div className="flex min-h-screen bg-sky-50">
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full min-h-0 overflow-hidden gradient-sidebar border-r border-cyan-500/20 z-40 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/10 py-5 ${isCollapsed ? 'justify-center px-3' : 'gap-2 px-6'}`}>
          <img src="/branding/icon64.png" alt="LOXER Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/30" />
          {!isCollapsed ? <BrandText className="text-xl font-black" /> : null}
          {!isCollapsed ? (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${roleBadgeClass}`}>
              {roleBadgeLabel}
            </span>
          ) : null}
        </div>

        {/* Nav */}
        <nav className="dashboard-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-6 space-y-1">
          {navItems.map(({ label, description, icon: Icon, href }) => {
            const active = currentPath === href;
            return (
              <a
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
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
              <div className="w-9 h-9 gradient-cta shadow-cyan-500/30 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                {(userMeta?.email || user.email || '?')[0].toUpperCase()}
              </div>
              {!isCollapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{userMeta?.email || user.email}</p>
                  <p className="text-cyan-400 text-[10px] font-medium">
                    {isFreelancer ? 'Freelancer (Jasa & Gigs)' : 'Seeker (Pencari Kerja)'}
                  </p>
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
              className={`glass rounded-2xl p-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} text-white hover:bg-white/15 transition-colors`}
            >
              <div className="w-9 h-9 gradient-cta shadow-cyan-500/30 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                <User className="w-4 h-4" />
              </div>
              {!isCollapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold">Masuk ke LOXER</p>
                  <p className="text-cyan-400 text-[10px]">Login / Daftar</p>
                </div>
              ) : null}
            </a>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={closeMobile}
            aria-label="Close sidebar overlay"
          />
          <aside className="absolute left-0 top-0 flex h-full min-h-0 w-72 flex-col overflow-hidden gradient-sidebar border-r border-cyan-500/20 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-2">
                <img src="/branding/icon64.png" alt="LOXER Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/30" />
                <BrandText className="text-xl font-black" />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleBadgeClass}`}>
                  {roleBadgeLabel}
                </span>
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
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
                  <div className="w-9 h-9 gradient-cta shadow-cyan-500/30 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                    {(userMeta?.email || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-semibold truncate">{userMeta?.email || user.email}</p>
                    <p className="text-cyan-400 text-[10px] font-medium">
                      {isFreelancer ? 'Freelancer (Jasa & Gigs)' : 'Seeker (Pencari Kerja)'}
                    </p>
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
                  <div className="w-9 h-9 gradient-cta shadow-cyan-500/30 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 hover:text-cyan-200 bg-slate-950/35 text-slate-100 shadow-sm transition hover:bg-white/10 active-press"
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

              <div className="flex items-center gap-1.5 lg:hidden shrink-0">
                <img src="/branding/icon64.png" alt="LOXER Logo" className="w-6 h-6 rounded-lg shadow-md shadow-cyan-500/30" />
                <BrandText className="text-base font-black" />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleBadgeClass}`}>
                  {roleBadgeLabel}
                </span>
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  {isFreelancer ? 'Freelancer Workspace' : 'Seeker Workspace'}
                </p>
                <p className="text-sm text-slate-300">
                  {currentDetail.label}: {currentDetail.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle compact />
              <NotificationBell compact />
              <div className={`hidden rounded-full border px-3 py-1 text-xs font-semibold sm:block ${isFreelancer ? 'border-amber-400/30 bg-amber-500/20 text-amber-200 shadow-sm shadow-amber-500/20' : 'border-cyan-400/30 bg-cyan-500/20 text-cyan-200 shadow-sm shadow-cyan-500/20'}`}>
                {isFreelancer ? 'Jasa Mandiri' : 'Seeker (Pencari Kerja)'}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full min-w-0 max-w-[min(100%,1920px)] mx-auto px-[clamp(12px,2vw,32px)] py-4 sm:py-6 lg:py-8 page-enter pb-28 lg:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation - Native Mobile App Bar with Center Elevated Action */}
        <nav
          aria-label={isFreelancer ? "Freelancer Mobile Navigation" : "Seeker Mobile Navigation"}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t border-cyan-500/20 bg-[#0f172a]/95 text-slate-200 px-2 pt-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="flex items-center justify-between max-w-md mx-auto relative">
            {mobileNavItems.map((item) => {
              const active = currentPath === item.href || currentPath === item.href.split('?')[0];
              if (item.isCenterAction) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center -mt-5 active:scale-90 transition-transform group focus:outline-none"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 shadow-cyan-500/40 group-hover:brightness-110">
                      <item.icon className="w-6 h-6" strokeWidth={2.4} />
                    </div>
                    <span className={`text-[10px] tracking-tight mt-1 font-bold ${active ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {item.label}
                    </span>
                  </a>
                );
              }

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center justify-center min-h-[48px] py-1 active:scale-95 transition-transform"
                >
                  <div
                    className={`flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200 ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                  </div>
                  <span
                    className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${
                      active ? 'text-cyan-300 font-bold' : 'text-slate-400 font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </a>
              );
            })}
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
