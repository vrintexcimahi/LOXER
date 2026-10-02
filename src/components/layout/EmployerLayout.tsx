import { ReactNode, useMemo } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  LogOut,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import BrandText from '../ui/BrandText';
import ThemeToggle from '../ui/ThemeToggle';
import usePersistentSidebar from './usePersistentSidebar';
import NotificationBell from '../ui/NotificationBell';
import DashboardGuideAssistant from '../ui/DashboardGuideAssistant';
import { employerGuideContent } from '../../lib/dashboardGuideContent';

const navItems = [
  { label: 'Dashboard', description: 'Ringkasan performa rekrutmen', icon: LayoutDashboard, href: '/employer/dashboard' },
  { label: 'Cari Talent', description: 'Katalog talent siap kerja & reverse hiring', icon: Sparkles, href: '/employer/talents' },
  { label: 'Lowongan', description: 'Kelola posting aktif dan draft', icon: Briefcase, href: '/employer/jobs' },
  { label: 'Pelamar', description: 'Review kandidat yang sudah masuk', icon: Users, href: '/employer/applicants' },
  { label: 'Profil Perusahaan', description: 'Atur identitas bisnis dan verifikasi', icon: Building2, href: '/employer/company' },
];

interface EmployerLayoutProps {
  children: ReactNode;
  currentPath: string;
}

export default function EmployerLayout({ children, currentPath }: EmployerLayoutProps) {
  const { userMeta, signOut } = useAuth();
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = usePersistentSidebar('loxer-employer-sidebar');
  const assistantGuides = useMemo(
    () =>
      [
        ...navItems,
        {
          label: 'Pasang Lowongan',
          description: 'Buat dan publikasikan lowongan baru',
          icon: PlusCircle,
          href: '/employer/jobs/new',
        },
      ].flatMap((item) => {
        const guide = employerGuideContent[item.href];
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
  const currentGuideId = currentPath.startsWith('/employer/jobs/new') ? '/employer/jobs/new' : currentPath;
  const currentDetail =
    navItems.find((item) => item.href === currentPath) ?? {
      label: 'Employer Workspace',
      description: 'Kelola lowongan, pelamar, dan profil perusahaan',
    };

  const handleSignOut = async () => {
    closeMobile();
    await signOut();
    window.location.assign('/');
  };

  return (
    <div className="flex min-h-screen bg-sky-50">
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-full min-h-0 flex-col overflow-hidden gradient-sidebar border-r border-cyan-500/20 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`flex items-center border-b border-white/10 py-5 ${isCollapsed ? 'justify-center px-3' : 'gap-2 px-6'}`}>
            <img src="/branding/icon64.png" alt="LOXER Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/30" />
          {!isCollapsed ? <BrandText className="text-xl font-black" /> : null}
          {!isCollapsed ? (
            <span className="ml-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shadow-sm shadow-emerald-500/20">
              Perusahaan (HRD)
            </span>
          ) : null}
        </div>

        <nav className="dashboard-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-6 space-y-1">
          {navItems.map(({ label, description, icon: Icon, href }) => {
            const active = currentPath === href;
            return (
              <a
                key={href}
                href={href}
                title={isCollapsed ? `${label} - ${description}` : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                  active ? 'sidebar-item-active' : 'sidebar-item'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
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

        <div className="px-4 py-3">
          <a
            href="/employer/jobs/new"
            className={`gradient-cta flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:brightness-110 active-press ${
              isCollapsed ? 'px-2' : 'w-full'
            }`}
            title="Pasang Lowongan"
          >
            <PlusCircle className="w-4 h-4" />
            {!isCollapsed ? 'Pasang Lowongan' : null}
          </a>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <div className={`glass rounded-2xl p-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-cyan-500/30">
              {(userMeta?.email || '?')[0].toUpperCase()}
            </div>
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">{userMeta?.email}</p>
                <p className="text-cyan-400 text-[10px] font-medium">Employer (HiringPro)</p>
              </div>
            ) : null}
            {!isCollapsed ? (
              <button onClick={handleSignOut} className="p-1 text-slate-400 transition-colors hover:text-red-400">
                <LogOut className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closeMobile} aria-label="Close sidebar overlay" />
          <aside className="absolute left-0 top-0 flex h-full min-h-0 w-72 flex-col overflow-hidden gradient-sidebar border-r border-cyan-500/20 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-2">
                <img src="/branding/icon64.png" alt="LOXER Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/30" />
                <BrandText className="text-xl font-black" />
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shadow-sm shadow-emerald-500/20">
                  Perusahaan (HRD)
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
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
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

            <div className="px-4 py-3">
              <a
                href="/employer/jobs/new"
                onClick={closeMobile}
                className="gradient-cta flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:brightness-110 active-press"
              >
                <PlusCircle className="w-4 h-4" /> Pasang Lowongan
              </a>
            </div>

            <div className="border-t border-white/10 px-4 py-4">
              <div className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-cyan-500/30">
                  {(userMeta?.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{userMeta?.email}</p>
                  <p className="text-cyan-400 text-[10px] font-medium">Employer (HiringPro)</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1 text-slate-400 transition-colors hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

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
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40 text-slate-100 shadow-sm transition hover:bg-white/10 hover:text-cyan-200 active-press"
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
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shadow-sm shadow-emerald-500/20">
                  Perusahaan (HRD)
                </span>
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Employer Workspace</p>
                <p className="text-sm text-slate-300">
                  {currentDetail.label}: {currentDetail.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle compact />
              <NotificationBell compact />
              <div className="hidden rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 sm:block shadow-sm shadow-emerald-500/20">
                Perusahaan (HRD)
              </div>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 max-w-[min(100%,1920px)] mx-auto px-[clamp(12px,2vw,32px)] py-4 sm:py-6 lg:py-8 page-enter pb-28 lg:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation - Native Mobile App Bar with Center Elevated Action */}
        <nav
          aria-label="Employer Mobile Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t border-cyan-500/20 bg-[#0f172a]/95 px-2 pt-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-2xl text-slate-200"
        >
          <div className="flex items-center justify-between max-w-md mx-auto relative">
            {[
              { label: 'Dashboard', icon: LayoutDashboard, href: '/employer/dashboard' },
              { label: 'Lowongan', icon: Briefcase, href: '/employer/jobs' },
              { label: 'Pasang Job', icon: PlusCircle, href: '/employer/jobs/new', isCenterAction: true },
              { label: 'Pelamar', icon: Users, href: '/employer/applicants' },
              { label: 'Cari Talent', icon: Sparkles, href: '/employer/talents' },
            ].map((item) => {
              const active = currentPath === item.href || currentPath === item.href.split('?')[0];
              if (item.isCenterAction) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center -mt-5 active:scale-90 transition-transform group focus:outline-none"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 shadow-cyan-500/40 group-hover:brightness-110 transition-all">
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
          workspaceLabel="Panduan Employer LOXER"
          workspaceDescription="Pilih menu employer untuk melihat fungsi detail, langkah penggunaan, dan pintasan ke halaman terkait."
          storageKey="loxer-guide-employer"
          currentGuideId={currentGuideId}
          guides={assistantGuides}
        />
      </main>
    </div>
  );
}
