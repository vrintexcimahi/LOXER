import { ReactNode } from 'react';
import { Home, Search, FileText, User, LogOut, Briefcase, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import BrandText from '../ui/BrandText';
import ThemeToggle from '../ui/ThemeToggle';
import usePersistentSidebar from './usePersistentSidebar';
import NotificationBell from '../ui/NotificationBell';

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
  const { userMeta, signOut } = useAuth();
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = usePersistentSidebar('loxer-seeker-sidebar');
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
          <div className={`glass rounded-2xl p-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(userMeta?.email || '?')[0].toUpperCase()}
            </div>
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">{userMeta?.email}</p>
                <p className="text-cyan-400 text-[10px]">Seeker (Pencari Kerja)</p>
              </div>
            ) : null}
            <button
              onClick={handleSignOut}
              className={`text-slate-400 hover:text-red-400 transition-colors p-1 ${isCollapsed ? 'absolute opacity-0 pointer-events-none' : ''}`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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

            <div className="px-4 py-4 border-t border-white/10">
              <div className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(userMeta?.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{userMeta?.email}</p>
                  <p className="text-cyan-400 text-[10px]">Seeker (Pencari Kerja)</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-slate-400 hover:text-red-400 transition-colors p-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="sticky top-0 z-30 border-b border-white/10 gradient-sidebar backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    toggleCollapsed();
                    return;
                  }
                  toggleMobile();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35 text-slate-100 shadow-sm transition hover:bg-white/10 hover:text-cyan-200"
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
        <div className="p-4 sm:p-6 lg:p-8 page-enter pb-24 lg:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sky-100 flex z-40">
          {navItems.map(({ label, icon: Icon, href }) => {
            const active = currentPath === href;
            return (
              <a
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                  active ? 'text-sky-600' : 'text-slate-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
                {label}
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
