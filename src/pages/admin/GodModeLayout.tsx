import type { ReactNode } from 'react';
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
  Users,
} from 'lucide-react';
import BrandText from '../../components/ui/BrandText';
import ThemeToggle from '../../components/ui/ThemeToggle';
import NotificationBell from '../../components/ui/NotificationBell';
import usePersistentSidebar from '../../components/layout/usePersistentSidebar';
import { useAuth } from '../../contexts/useAuth';
import { DEFAULT_ADMIN_EMAIL } from '../../lib/constants';

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
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const CORE_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard Admin', description: 'Pantau statistik dan kesehatan platform', icon: Home },
  { href: '/admin/users', label: 'Manajemen Users', description: 'Kelola role, suspend, dan detail akun', icon: Users },
  { href: '/admin/jobs', label: 'Manajemen Jobs', description: 'Atur seluruh lowongan yang tayang', icon: Briefcase },
  { href: '/admin/applications', label: 'Pelamar', description: 'Monitor semua kandidat lintas perusahaan', icon: ListChecks },
  { href: '/admin/companies', label: 'Perusahaan', description: 'Verifikasi profil dan aktivitas bisnis', icon: Building2 },
  { href: '/admin/logs', label: 'Audit Log', description: 'Lihat semua jejak aksi admin', icon: FileText },
  { href: '/admin/integrations', label: 'Integrasi API', description: 'Atur sumber lowongan dan status koneksi', icon: Link2 },
];

const GOD_MODE_ITEMS: NavItem[] = [
  { href: '/admin/analytics', label: 'Advanced Analytics', description: 'Funnel, health score, dan snapshot', icon: BarChart3 },
  { href: '/admin/flags', label: 'Feature Flags', description: 'Toggle fitur tanpa redeploy', icon: Flag },
  { href: '/admin/moderation', label: 'Moderation Queue', description: 'Review konten, scoring, dan eskalasi', icon: AlertTriangle },
  { href: '/admin/broadcast', label: 'Broadcast System', description: 'Kirim notifikasi ke segmen user', icon: Megaphone },
  { href: '/admin/security', label: 'Security Center', description: 'IP block, session, dan alert keamanan', icon: Shield },
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
              'block rounded-xl border px-3 py-3 transition-all',
              active
                ? 'border-cyan-400/30 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10'
                : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-slate-900/80 hover:text-white'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={classNames('rounded-lg p-2', active ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/5 text-slate-400')}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
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
  const isDefaultAdminAccount = (user?.email || '').trim().toLowerCase() === DEFAULT_ADMIN_EMAIL;
  const isAdmin = Boolean(user && (userMeta?.role === 'admin' || isDefaultAdminAccount));

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
            'fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col border-r border-white/10 bg-slate-950/95 backdrop-blur transition-transform lg:static',
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

          <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
            {!isCollapsed && <SidebarSection title="Core Admin" items={CORE_ITEMS} pathname={pathname} closeMobile={closeMobile} />}
            {!isCollapsed && <SidebarSection title="God Mode" items={GOD_MODE_ITEMS} pathname={pathname} closeMobile={closeMobile} />}

            {isCollapsed && (
              <div className="space-y-2">
                {[...CORE_ITEMS, ...GOD_MODE_ITEMS].map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      title={item.label}
                      className={classNames(
                        'flex justify-center rounded-xl border p-3 transition-all',
                        active
                          ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
                          : 'border-transparent bg-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 px-4 py-4 lg:px-6">
              <button
                onClick={toggleMobile}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 lg:hidden"
                aria-label="Toggle navigation"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                onClick={toggleCollapsed}
                className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 lg:inline-flex"
              >
                {isCollapsed ? 'Expand' : 'Collapse'}
              </button>
              <div className="min-w-[240px] flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">Admin / God Mode</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
                <p className="text-sm text-slate-400">{description}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <ThemeToggle compact />
                <NotificationBell />
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-right">
                  <p className="text-xs text-cyan-200">Admin Session</p>
                  <p className="text-sm font-medium text-white">{user?.email || 'admin'}</p>
                </div>
                <button
                  onClick={() => {
                    void signOut().then(() => window.location.assign('/'));
                  }}
                  className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
