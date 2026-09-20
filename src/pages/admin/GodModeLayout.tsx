import { useMemo, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  ChevronLeft,
  FileText,
  Flag,
  Home,
  Link2,
  ListChecks,
  Megaphone,
  Shield,
  Sparkles,
  Users,
  Terminal,
  Database,
  Smartphone,
  Layers,
  Menu,
} from 'lucide-react';
import BrandText from '../../components/ui/BrandText';
import ThemeToggle from '../../components/ui/ThemeToggle';
import NotificationBell from '../../components/ui/NotificationBell';
import usePersistentSidebar from '../../components/layout/usePersistentSidebar';
import DashboardGuideAssistant from '../../components/ui/DashboardGuideAssistant';
import { useAuth } from '../../contexts/useAuth';
import { adminGuideContent } from '../../lib/dashboardGuideContent';
import { isDefaultAdminEmail } from '../../lib/constants';
import { useSystemLogs } from '../../lib/logService';

interface GodModeLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: typeof Home;
  badge?: ReactNode;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const CORE_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard Admin', description: 'Pantau statistik dan kesehatan platform', icon: Home },
  { href: '/admin/user-data', label: 'Data Pengguna', description: 'Device intelligence & kapabilitas pengguna', icon: Layers },
  { href: '/admin/devices', label: 'Perangkat', description: 'Registry device & revoke akses', icon: Smartphone },
  { href: '/admin/users', label: 'Manajemen Users', description: 'Kelola role, suspend, dan detail akun', icon: Users },
  { href: '/admin/jobs', label: 'Manajemen Jobs', description: 'Atur seluruh lowongan yang tayang', icon: Briefcase },
  { href: '/admin/applications', label: 'Pelamar', description: 'Monitor semua kandidat lintas perusahaan', icon: ListChecks },
  { href: '/admin/companies', label: 'Perusahaan', description: 'Verifikasi profil dan aktivitas bisnis', icon: Building2 },
  { href: '/admin/logs', label: 'Audit Log', description: 'Lihat semua jejak aksi admin', icon: FileText },
  { href: '/admin/integrations', label: 'Integrasi API', description: 'Atur sumber lowongan dan status koneksi', icon: Link2 },
  { href: '/admin/editor', label: 'CMS Homepage', description: 'Visual editor halaman utama LOXER', icon: Sparkles },
];

const GOD_MODE_ITEMS: NavItem[] = [
  { href: '/admin/analytics', label: 'Advanced Analytics', description: 'Funnel, health score, dan snapshot', icon: BarChart3 },
  { href: '/admin/flags', label: 'Feature Flags', description: 'Toggle fitur tanpa redeploy', icon: Flag },
  { href: '/admin/moderation', label: 'Moderation Queue', description: 'Review konten, scoring, dan eskalasi', icon: AlertTriangle },
  { href: '/admin/broadcast', label: 'Broadcast System', description: 'Kirim notifikasi ke segmen user', icon: Megaphone },
  { href: '/admin/security', label: 'Security Center', description: 'IP block, session, dan alert keamanan', icon: Shield },
];

const MOBILE_NAV_ITEMS: { href: string; label: string; icon: typeof Home }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/applications', label: 'Pelamar', icon: ListChecks },
  { href: '/admin/companies', label: 'Perusahaan', icon: Building2 },
];

function SidebarSection({
  title,
  items,
  pathname,
  closeMobile,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  closeMobile: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">{title}</p>
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={closeMobile}
            className={classNames(
              'group block rounded-xl border px-3 py-2.5 transition-all',
              active
                ? 'border-cyan-400/30 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10'
                : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-slate-900/80 hover:text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={classNames(
                  'h-5 w-5 shrink-0 transition-colors',
                  active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
                strokeWidth={1.8}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={classNames('text-sm font-medium truncate', active ? 'text-white font-semibold' : 'text-slate-200')}>
                    {item.label}
                  </p>
                  {item.badge}
                </div>
                <p className="text-[11px] text-slate-500 truncate">{item.description}</p>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export default function GodModeLayout({ title, description, children }: GodModeLayoutProps) {
  const { user, userMeta, signOut } = useAuth();
  const pathname = window.location.pathname;
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = usePersistentSidebar('loxer-god-mode-sidebar');
  const isDefaultAdminAccount = isDefaultAdminEmail(user?.email);
  const { logs } = useSystemLogs();

  const unresolvedErrorCount = useMemo(
    () => logs.filter((l) => l.level === 'ERROR' && !l.resolved).length,
    [logs]
  );

  const systemToolsItems: NavItem[] = useMemo(
    () => [
      {
        href: '/admin/monitoring',
        label: 'Log & Monitoring',
        description: 'Live tail & error tracker',
        icon: Terminal,
        badge:
          unresolvedErrorCount > 0 ? (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/30 animate-pulse">
              {unresolvedErrorCount}
            </span>
          ) : undefined,
      },
      {
        href: '/admin/backup',
        label: 'Backup Database',
        description: 'Ekspor, restore & Telegram bot',
        icon: Database,
      },
      {
        href: '/admin/dev-workbench',
        label: 'Developer Mode',
        description: 'Dual-view testing workbench',
        icon: Smartphone,
      },
    ],
    [unresolvedErrorCount]
  );

  const isAdmin = Boolean(user && (userMeta?.role === 'admin' || isDefaultAdminAccount));
  const assistantGuides = useMemo(
    () =>
      [...CORE_ITEMS, ...GOD_MODE_ITEMS, ...systemToolsItems].flatMap((item) => {
        const guide = adminGuideContent[item.href];
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
    [systemToolsItems]
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-300" />
          <p className="text-lg font-semibold">Akses God Mode ditolak</p>
          <p className="mt-2 text-sm text-red-200/80">Hanya akun admin yang bisa membuka panel ini.</p>
          <a href="/admin/dashboard" className="mt-4 inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">
            Kembali ke dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside
          className={classNames(
            'fixed inset-y-0 left-0 z-40 flex min-h-0 w-[300px] flex-col overflow-hidden border-r border-white/10 bg-slate-950/95 backdrop-blur transition-transform lg:static',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            isCollapsed ? 'lg:w-[112px]' : 'lg:w-[300px]'
          )}
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
            <a href="/admin/dashboard" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
              <Shield className="h-5 w-5" />
            </a>
            {!isCollapsed && (
              <div>
                <BrandText className="text-lg text-white" />
                <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/70">God Mode</p>
              </div>
            )}
            <button
              onClick={() => window.history.back()}
              className="ml-auto rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              title="Kembali"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="dashboard-sidebar-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-4">
            {!isCollapsed && <SidebarSection title="Core Admin" items={CORE_ITEMS} pathname={pathname} closeMobile={closeMobile} />}
            {!isCollapsed && <SidebarSection title="God Mode" items={GOD_MODE_ITEMS} pathname={pathname} closeMobile={closeMobile} />}
            {!isCollapsed && <SidebarSection title="System Tools" items={systemToolsItems} pathname={pathname} closeMobile={closeMobile} />}

            {isCollapsed && (
              <div className="space-y-2">
                {[...CORE_ITEMS, ...GOD_MODE_ITEMS, ...systemToolsItems].map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      title={item.label}
                      className={classNames(
                        'relative flex justify-center rounded-xl p-3 transition-all group',
                        active
                          ? 'border border-cyan-400/30 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-500/10'
                          : 'border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon
                        className={classNames(
                          'h-5 w-5 transition-colors',
                          active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-white'
                        )}
                        strokeWidth={1.8}
                      />
                      {item.badge && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:py-4 lg:px-6">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={toggleMobile}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white hover:bg-white/10 lg:hidden shrink-0 transition"
                  aria-label="Toggle navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <button
                  onClick={toggleCollapsed}
                  className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 lg:inline-flex shrink-0 transition"
                >
                  {isCollapsed ? 'Expand' : 'Collapse'}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Admin / God Mode</p>
                  <h1 className="mt-0.5 text-lg sm:text-2xl font-bold text-white truncate">{title}</h1>
                  <p className="text-xs sm:text-sm text-slate-400 truncate hidden sm:block">{description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-auto">
                <ThemeToggle compact />
                <NotificationBell />
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1.5 sm:px-3 sm:py-2 text-right max-w-[150px] sm:max-w-[220px]">
                  <p className="text-[10px] text-cyan-300 font-medium hidden sm:block">Admin Session</p>
                  <p className="text-xs sm:text-sm font-semibold text-white truncate" title={user?.email || 'admin'}>
                    {user?.email || 'admin'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    void signOut().then(() => window.location.assign('/'));
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-200 hover:bg-red-500/25 transition cursor-pointer shrink-0"
                >
                  Logout
                </button>
              </div>
            </div>
            {description && (
              <div className="px-4 pb-2.5 text-xs text-slate-400 sm:hidden">
                <p className="truncate">{description}</p>
              </div>
            )}
          </header>

          <main className="flex-1 px-4 py-6 lg:px-6 pb-24 lg:pb-6">{children}</main>

          {/* Mobile Bottom Navigation Bar - Focused for Mobile Application Users */}
          <nav
            aria-label="Mobile Navigation"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur-xl px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center justify-around">
              {MOBILE_NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={classNames(
                      'flex flex-1 flex-col items-center gap-1 py-1 px-1 transition-all',
                      active ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    <Icon
                      className={classNames(
                        'h-5 w-5 transition-colors',
                        active ? 'text-cyan-400' : 'text-slate-400'
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="text-[10px] font-medium tracking-tight truncate max-w-[56px]">
                      {item.label}
                    </span>
                  </a>
                );
              })}
              <button
                type="button"
                onClick={toggleMobile}
                className={classNames(
                  'flex flex-1 flex-col items-center gap-1 py-1 px-1 transition-all cursor-pointer',
                  isMobileOpen ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                )}
                aria-label="Menu Lengkap"
              >
                <Menu
                  className={classNames(
                    'h-5 w-5 transition-colors',
                    isMobileOpen ? 'text-cyan-400' : 'text-slate-400'
                  )}
                  strokeWidth={1.8}
                />
                <span className="text-[10px] font-medium tracking-tight">Menu</span>
              </button>
            </div>
          </nav>

          <DashboardGuideAssistant
            workspaceLabel="Panduan Admin God Mode"
            workspaceDescription="Assistant ini menyimpan panduan modul admin terakhir yang dipilih, lalu menampilkan fungsi detail dari setiap menu God Mode."
            storageKey="loxer-guide-god-mode"
            currentGuideId={pathname}
            guides={assistantGuides}
          />
        </div>
      </div>
    </div>
  );
}
