import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Building,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Home,
  Link2,
  ListChecks,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  UserCheck,
  Users,
  X,
  Terminal,
  Database,
  Smartphone,
  Layers,
  Clock,
  Banknote,
  ExternalLink,
  Globe,
  MapPin,
  Code,
  Megaphone,
  Eye,
  LayoutGrid,
  List,
  Trash2,
  Tag,
  Sparkles,
  Upload,
  Image as ImageIcon,
  ArrowRight,
  Bot,
  Zap,
  RotateCcw,
  Check,
  Phone,
  Mail,
  GraduationCap,
  Award,
  FileUp,
  Send,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import BrandText from '../../components/ui/BrandText';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';
import ThemeToggle from '../../components/ui/ThemeToggle';
import NotificationBell from '../../components/ui/NotificationBell';
import usePersistentSidebar from '../../components/layout/usePersistentSidebar';
import DashboardGuideAssistant from '../../components/ui/DashboardGuideAssistant';
import { useAuth } from '../../contexts/useAuth';
import { formatDayLabel, formatRelativeTime, logAdminAction, toISODateOnly } from '../../lib/adminUtils';
import { adminGuideContent } from '../../lib/dashboardGuideContent';
import { isDefaultAdminEmail, normalizeComparableEmail } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { AdminStats, AdminUserRow, ApplicationStatus, AuditLog, ChartDataPoint, Company, JobListing, JobStatus, JobType, UserRole } from '../../lib/types';
import AdminUserDataCenter from './AdminUserDataCenter';
import AdminDeviceManagement from './AdminDeviceManagement';
import { fetchUnifiedJobs } from '../../services/careerjetService';
import { AdminTalentCatalogSection, SmartAddCvSection, useTalentCatalog } from './AdminTalentComponents';

type AdminTab = 'overview' | 'user-data' | 'devices' | 'users' | 'jobs' | 'applications' | 'companies' | 'logs' | 'integrations';
type ToastType = 'success' | 'error' | 'info';

interface AdminDashboardProps {
  tab?: AdminTab;
  subTab?: 'accounts' | 'intelligence' | 'devices';
}

interface ToastState {
  type: ToastType;
  message: string;
}

interface AdminMenuItem {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: string | number }>;
}

const STATUS_COLORS: Record<string, string> = {
  applied: '#64748b',
  reviewed: '#3b82f6',
  shortlisted: '#06b6d4',
  interview_scheduled: '#8b5cf6',
  hired: '#10b981',
  rejected: '#ef4444',
};

const ACTION_COLORS: Record<string, string> = {
  ban_user: 'bg-red-500/20 text-red-300',
  delete_user: 'bg-red-700/20 text-red-400',
  change_role: 'bg-purple-500/20 text-purple-300',
  verify_company: 'bg-green-500/20 text-green-300',
  unverify_company: 'bg-yellow-500/20 text-yellow-300',
  delete_job: 'bg-orange-500/20 text-orange-300',
  delete_application: 'bg-rose-500/20 text-rose-300',
  toggle_job_status: 'bg-blue-500/20 text-blue-300',
  force_update_status: 'bg-cyan-500/20 text-cyan-300',
};

const PAGE_SIZE = 20;
function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function badgeRoleClass(role: UserRole) {
  if (role === 'admin') return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
  if (role === 'employer') return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
  return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
}

function roleLabel(role: UserRole) {
  if (role === 'seeker') return 'Seeker (Pencari Kerja)';
  if (role === 'employer') return 'Employer (Perusahaan)';
  if (role === 'superadmin') return 'Super Admin (Pemilik)';
  return 'Admin (Administrator)';
}

function normalizeRoleByEmail(email: string | undefined, role: UserRole): UserRole {
  if (isDefaultAdminEmail(email)) return 'superadmin';
  return role;
}

function getDateNDaysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function getFirstValue<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={classNames('animate-pulse rounded-xl bg-slate-800/80', className)} />;
}

function AdminToast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;
  const palette =
    toast.type === 'success'
      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
      : toast.type === 'error'
        ? 'bg-red-500/20 border-red-400/40 text-red-200'
        : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-100';

  return (
    <div className="fixed top-4 right-4 z-[130]">
      <div className={classNames('rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-sm', palette)}>
        <div className="flex items-start gap-3">
          <p>{toast.message}</p>
          <button onClick={onClose} className="text-slate-300 hover:text-white text-xs">
            tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (next: number) => void;
}) {
  const totalPage = pageCount(total);
  return (
    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm">
      <p className="text-slate-400">
        Halaman <span className="text-white">{page}</span> / <span className="text-white">{totalPage}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-white/10 px-2 py-1 text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onChange(Math.min(totalPage, page + 1))}
          disabled={page >= totalPage}
          className="rounded-lg border border-white/10 px-2 py-1 text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard({ tab = 'overview', subTab }: AdminDashboardProps) {
  const { user, userMeta, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>(tab);
  const [toast, setToast] = useState<ToastState | null>(null);
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = usePersistentSidebar('loxer-admin-sidebar');
  const effectiveRole = user ? normalizeRoleByEmail(user.email || userMeta?.email, userMeta?.role || 'seeker') : null;
  const adminEmail = normalizeComparableEmail(userMeta?.email || user?.email) || userMeta?.email || user?.email || '';

  useEffect(() => {
    if (tab === 'logs') {
      window.location.replace('/admin/monitoring?tab=audit');
      return;
    }
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'jobs') {
      window.location.replace('/admin/dashboard');
    }
  }, [activeTab]);

  const menuItems: AdminMenuItem[] = useMemo(
    () => [
      { key: 'overview', label: 'Dashboard Admin', description: 'Pantau statistik dan kesehatan platform', href: '/admin/dashboard', icon: Home },
      { key: 'users', label: 'Manajemen Users', description: 'Kelola akun, role, device intelligence & akses', href: '/admin/users', icon: Users },
      { key: 'applications', label: 'Pelamar', description: 'Monitor semua kandidat lintas perusahaan', href: '/admin/applications', icon: ListChecks },
      { key: 'companies', label: 'Perusahaan', description: 'Verifikasi profil dan aktivitas bisnis', href: '/admin/companies', icon: Building2 },
      { key: 'integrations', label: 'Integrasi API', description: 'Atur sumber lowongan dan status koneksi', href: '/admin/integrations', icon: Link2 },
      ...(effectiveRole === 'superadmin' ? [
        { key: 'monitoring', label: 'Log & Monitoring', description: 'Real-time live tail & error tracker', href: '/admin/monitoring', icon: Terminal },
        { key: 'backup', label: 'Backup Database', description: 'Ekspor, restore & Telegram bot harian', href: '/admin/backup', icon: Database },
        { key: 'dev-workbench', label: 'Developer Mode', description: 'Dual-view workbench (mobile & desktop)', href: '/admin/dev-workbench', icon: Smartphone }
      ] : []),
    ],
    [effectiveRole]
  );
  const assistantGuides = useMemo(
    () =>
      menuItems.flatMap((item) => {
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
    [menuItems]
  );
  const currentGuideId = useMemo(() => {
    const pathname = window.location.pathname;
    return menuItems.find((item) => item.href === pathname)?.href || menuItems.find((item) => item.key === activeTab)?.href || menuItems[0]?.href;
  }, [activeTab, menuItems]);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
  }, []);
  const handleSignOut = async () => {
    closeMobile();
    await signOut();
    window.location.assign('/');
  };

  if (!user || (effectiveRole !== 'admin' && effectiveRole !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-300" />
          <p className="text-lg font-semibold">Akses admin ditolak</p>
          <p className="mt-2 text-sm text-red-200/80">Hanya akun dengan role admin yang bisa membuka halaman ini.</p>
          <a href="/" className="mt-4 inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">
            Kembali ke beranda
          </a>
        </div>
      </div>
    );
  }

  const tabTitle =
    activeTab === 'overview'
      ? 'Dashboard Admin'
      : activeTab === 'users' || activeTab === 'user-data' || activeTab === 'devices'
        ? 'Manajemen Users'
        : activeTab === 'jobs'
          ? 'Manajemen Jobs'
          : activeTab === 'applications'
            ? 'Manajemen Lamaran'
            : activeTab === 'companies'
              ? 'Manajemen Perusahaan'
              : activeTab === 'integrations'
                ? 'Integrasi API'
                : 'Audit Log';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      <div className="flex min-h-screen">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
            aria-label="Close sidebar overlay"
          />
        )}

        <aside
          className={classNames(
            'fixed inset-y-0 left-0 z-40 flex min-h-0 w-64 flex-col overflow-hidden border-r border-cyan-500/20 gradient-sidebar transition-all duration-300',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full',
            isCollapsed ? 'lg:w-20' : 'lg:w-64',
            'lg:translate-x-0'
          )}
        >
          <div className={classNames('flex h-16 items-center border-b border-white/10', isCollapsed ? 'justify-center px-3' : 'gap-2 px-5')}>
            <img src="/branding/icon64.png" alt="LOXER Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/30" />
            <BrandText className={classNames('text-lg font-black', isCollapsed ? 'lg:hidden' : '')} />
            {!isCollapsed && (
              <span className="ml-auto rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300 shadow-sm shadow-rose-500/20">
                {effectiveRole === 'superadmin' ? 'Super Admin' : 'Admin'}
              </span>
            )}
            <button onClick={closeMobile} className="ml-auto rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="dashboard-sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === window.location.pathname ||
                item.key === activeTab ||
                (item.key === 'users' &&
                  (activeTab === 'user-data' ||
                    activeTab === 'devices' ||
                    window.location.pathname === '/admin/user-data' ||
                    window.location.pathname === '/admin/devices'));
              return (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={closeMobile}
                  title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                  className={classNames(
                    'group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                    isActive
                      ? 'border border-cyan-400/30 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10'
                      : 'border border-transparent text-slate-300 hover:border-white/10 hover:bg-slate-900/80 hover:text-white',
                    isCollapsed ? 'lg:justify-center lg:px-2' : ''
                  )}
                >
                  <Icon
                    className={classNames(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                    strokeWidth={1.8}
                  />
                  <div className={classNames('min-w-0 flex-1', isCollapsed ? 'lg:hidden' : '')}>
                    <p className={classNames('truncate font-medium', isActive ? 'text-white font-semibold' : 'text-slate-200')}>
                      {item.label}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>

          <div className="border-t border-rose-500/20 p-3 mt-auto">
            <div className={classNames('flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-950/40 p-2.5', isCollapsed ? 'lg:justify-center lg:p-2' : '')}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 shrink-0">
                {(adminEmail || 'A')[0].toUpperCase()}
              </div>
              <div className={classNames('min-w-0 flex-1', isCollapsed ? 'lg:hidden' : '')}>
                <p className="truncate text-xs font-medium text-white">{adminEmail || 'admin@loxer.id'}</p>
                <p className="truncate text-[10px] text-rose-400 font-semibold">{effectiveRole === 'superadmin' ? 'Super Admin' : 'Admin'}</p>
              </div>
              <button
                onClick={handleSignOut}
                title="Logout"
                className={classNames('p-1.5 text-slate-400 hover:text-red-400 transition cursor-pointer', isCollapsed ? 'lg:hidden' : '')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className={classNames('flex min-w-0 w-full flex-col transition-all duration-300', isCollapsed ? 'lg:pl-20' : 'lg:pl-64')}>
          <header className="sticky top-0 z-30 border-b border-white/10 gradient-sidebar px-3 sm:px-4 py-3 backdrop-blur md:px-6 pt-safe">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => {
                    if (window.innerWidth >= 1024) {
                      toggleCollapsed();
                      return;
                    }
                    toggleMobile();
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950/40 p-2 text-slate-100 transition hover:bg-white/10 hover:text-cyan-200 active-press shrink-0"
                  aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
                  title={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
                >
                  <span className="hidden lg:block">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </span>
                  <span className="lg:hidden">
                    <Menu className="h-4 w-4" />
                  </span>
                </button>
                <div className="flex items-center gap-1.5 lg:hidden shrink-0">
                  <img src="/branding/icon64.png" alt="LOXER Logo" className="w-6 h-6 rounded-lg shadow-md shadow-cyan-500/30 shrink-0" />
                  <BrandText className="text-base font-black shrink-0" />
                  <span className="whitespace-nowrap rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300 shadow-sm shadow-rose-500/20 shrink-0">
                    {effectiveRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
                <div className="min-w-0 hidden md:block">
                  <p className="text-xs uppercase tracking-wider text-cyan-300 truncate">Admin / {tabTitle}</p>
                  <p className="text-sm font-semibold text-slate-100 truncate hidden sm:block">Pusat kendali data dan monitoring LOXER</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ThemeToggle compact variant="dark" />
                <span className="hidden sm:inline-flex whitespace-nowrap rounded-full border border-rose-400/30 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 shadow-sm shadow-rose-500/20">
                  {effectiveRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                </span>
                <NotificationBell variant="dark" compact />
                <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-slate-950/35 px-3 py-1.5 lg:flex">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
                    {(adminEmail || 'A')[0].toUpperCase()}
                  </div>
                  <p className="max-w-[180px] truncate text-xs text-slate-200">{adminEmail}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Logout"
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 shrink-0 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 min-w-0 w-full max-w-[min(100%,1920px)] mx-auto px-4 sm:px-6 py-5 pb-24 lg:pb-6">
            {activeTab === 'overview' && (
              <AdminOverview adminId={user.id} adminEmail={adminEmail} onToast={showToast} />
            )}
            {(activeTab === 'users' || activeTab === 'user-data' || activeTab === 'devices') && (
              <AdminUsersManagement
                adminId={user.id}
                adminEmail={adminEmail}
                onToast={showToast}
                initialSubTab={subTab || (activeTab === 'user-data' ? 'intelligence' : activeTab === 'devices' ? 'devices' : 'accounts')}
              />
            )}
            {activeTab === 'jobs' && (
              <AdminJobs adminId={user.id} adminEmail={adminEmail} onToast={showToast} />
            )}
            {activeTab === 'applications' && (
              <AdminApplications adminId={user.id} adminEmail={adminEmail} onToast={showToast} />
            )}
            {activeTab === 'companies' && (
              <AdminCompanies adminId={user.id} adminEmail={adminEmail} onToast={showToast} />
            )}
            {activeTab === 'integrations' && <AdminIntegrations onToast={showToast} />}
            {activeTab === 'logs' && <AdminAuditLogs />}
          </main>

          {/* Mobile Bottom Navigation Bar - Material 3 Android Native Style */}
          <nav
            aria-label="Admin Mobile Navigation"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur-xl px-1 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center justify-around">
              {[
                { href: '/admin/dashboard', label: 'Dashboard', icon: Home, key: 'overview' },
                { href: '/admin/users', label: 'Users', icon: Users, key: 'users' },
                { href: '/admin/applications', label: 'Pelamar', icon: ListChecks, key: 'applications' },
                { href: '/admin/companies', label: 'Perusahaan', icon: Building2, key: 'companies' },
              ].map((item) => {
                const active = activeTab === item.key || window.location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <a
                    key={item.key}
                    href={item.href}
                    className="flex flex-1 flex-col items-center justify-center min-h-[48px] py-1 active-press transition-transform"
                  >
                    <div
                      className={classNames(
                        'flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200',
                        active
                          ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                    </div>
                    <span
                      className={classNames(
                        'text-[10px] tracking-tight mt-0.5 truncate max-w-[58px]',
                        active ? 'text-cyan-300 font-bold' : 'text-slate-400 font-medium'
                      )}
                    >
                      {item.label}
                    </span>
                  </a>
                );
              })}
              <button
                type="button"
                onClick={toggleMobile}
                className="flex flex-1 flex-col items-center justify-center min-h-[48px] py-1 active-press transition-transform cursor-pointer"
                aria-label="Menu Lengkap"
              >
                <div
                  className={classNames(
                    'flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200',
                    isMobileOpen
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Menu className="h-5 w-5" strokeWidth={isMobileOpen ? 2.2 : 1.8} />
                </div>
                <span
                  className={classNames(
                    'text-[10px] tracking-tight mt-0.5',
                    isMobileOpen ? 'text-cyan-300 font-bold' : 'text-slate-400 font-medium'
                  )}
                >
                  Menu
                </span>
              </button>
            </div>
          </nav>

          <DashboardGuideAssistant
            workspaceLabel="Panduan Admin LOXER"
            workspaceDescription="Pilih modul admin untuk melihat ringkasan fungsi, detail operasional, dan langkah penggunaan yang paling relevan."
            storageKey="loxer-guide-admin"
            currentGuideId={currentGuideId}
            guides={assistantGuides}
          />
        </div>
      </div>
    </div>
  );
}

function AdminOverview({
  adminId,
  adminEmail,
  onToast,
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSeekers: 0,
    totalEmployers: 0,
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    totalCompanies: 0,
    verifiedCompanies: 0,
    newUsersToday: 0,
    newJobsToday: 0,
    newApplicationsToday: 0,
  });
  const [trendData, setTrendData] = useState<ChartDataPoint[]>([]);
  const [applicationStatus, setApplicationStatus] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [topCategories, setTopCategories] = useState<Array<{ category: string; total: number }>>([]);
  const [recentActivities, setRecentActivities] = useState<Array<{ type: string; description: string; at: string }>>([]);
  const [heatMapData, setHeatMapData] = useState<Array<{ date: string; value: number }>>([]);
  const [funnelData, setFunnelData] = useState<Array<{ name: string; value: number; fill: string }>>([]);
  const [hiredRejectedData, setHiredRejectedData] = useState<Array<{ week: string; hired: number; rejected: number }>>([]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!supabase) {
        setLoading(false);
        setError('Supabase belum dikonfigurasi.');
        return;
      }

      setLoading(true);
      setError('');
      const startDate = getDateNDaysAgo(period - 1).toISOString();

      const [usersRes, jobsRes, appsRes, companiesRes, recentUsersRes, recentJobsRes, recentAppsRes] = await Promise.all([
        supabase.from('users_meta').select('id, role, created_at').gte('created_at', startDate),
        supabase.from('job_listings').select('id, status, created_at, category, title, company_id').gte('created_at', startDate),
        supabase.from('applications').select('id, status, applied_at, job_id').gte('applied_at', startDate),
        supabase.from('companies').select('id, verified, created_at'),
        supabase.from('users_meta').select('id, email, role, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('job_listings').select('id, title, created_at, company_id').order('created_at', { ascending: false }).limit(5),
        supabase.from('applications').select('id, applied_at, job_id').order('applied_at', { ascending: false }).limit(5),
      ]);

      if (!active) return;

      if (usersRes.error || jobsRes.error || appsRes.error || companiesRes.error) {
        setError('Gagal memuat data overview admin.');
        setLoading(false);
        return;
      }

      const usersRows = (usersRes.data || []) as Array<{ id: string; role: UserRole; created_at: string }>;
      const jobsRows = (jobsRes.data || []) as Array<{
        id: string;
        status: string;
        created_at: string;
        category?: string | null;
        title?: string | null;
        company_id?: string | null;
      }>;
      const appRows = (appsRes.data || []) as Array<{ id: string; status: string; applied_at: string; job_id?: string | null }>;
      const companiesRows = (companiesRes.data || []) as Array<{ id: string; verified: boolean; created_at: string }>;

      const today = toISODateOnly(new Date());
      const totalUsers = usersRows.length;
      const totalSeekers = usersRows.filter((u) => u.role === 'seeker').length;
      const totalEmployers = usersRows.filter((u) => u.role === 'employer').length;
      const totalJobs = jobsRows.length;
      const activeJobs = jobsRows.filter((j) => j.status === 'active').length;
      const totalApplications = appRows.length;
      const pendingApplications = appRows.filter((a) => a.status === 'applied' || a.status === 'reviewed').length;
      const totalCompanies = companiesRows.length;
      const verifiedCompanies = companiesRows.filter((c) => c.verified).length;

      const newUsersToday = usersRows.filter((u) => toISODateOnly(u.created_at) === today).length;
      const newJobsToday = jobsRows.filter((j) => toISODateOnly(j.created_at) === today).length;
      const newApplicationsToday = appRows.filter((a) => toISODateOnly(a.applied_at) === today).length;

      setStats({
        totalUsers,
        totalSeekers,
        totalEmployers,
        totalJobs,
        activeJobs,
        totalApplications,
        pendingApplications,
        totalCompanies,
        verifiedCompanies,
        newUsersToday,
        newJobsToday,
        newApplicationsToday,
      });

      const series: ChartDataPoint[] = Array.from({ length: period }, (_, idx) => {
        const date = getDateNDaysAgo(period - idx - 1);
        return {
          date: formatDayLabel(date),
          seekers: 0,
          employers: 0,
          jobs: 0,
          applications: 0,
        };
      });

      const dateIndexMap = new Map(series.map((item, idx) => [item.date, idx]));

      usersRows.forEach((row) => {
        const key = formatDayLabel(row.created_at);
        const idx = dateIndexMap.get(key);
        if (idx === undefined) return;
        if (row.role === 'seeker') series[idx].seekers += 1;
        if (row.role === 'employer') series[idx].employers += 1;
      });

      jobsRows.forEach((row) => {
        const key = formatDayLabel(row.created_at);
        const idx = dateIndexMap.get(key);
        if (idx === undefined) return;
        series[idx].jobs += 1;
      });

      appRows.forEach((row) => {
        const key = formatDayLabel(row.applied_at);
        const idx = dateIndexMap.get(key);
        if (idx === undefined) return;
        series[idx].applications += 1;
      });

      setTrendData(series);

      const statusMap = new Map<string, number>();
      appRows.forEach((row) => statusMap.set(row.status, (statusMap.get(row.status) || 0) + 1));
      setApplicationStatus(
        Object.entries(STATUS_COLORS).map(([status, color]) => ({
          name: status,
          value: statusMap.get(status) || 0,
          color,
        }))
      );

      const categoryMap = new Map<string, number>();
      jobsRows.forEach((job) => {
        const category = (job.category || 'Lainnya').trim() || 'Lainnya';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      setTopCategories(
        Array.from(categoryMap.entries())
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
      );

      const companyIds = (recentJobsRes.data || [])
        .map((row) => row.company_id)
        .filter((id): id is string => typeof id === 'string');
      const jobIds = (recentAppsRes.data || [])
        .map((row) => row.job_id)
        .filter((id): id is string => typeof id === 'string');

      const [companyNameRes, recentJobNameRes] = await Promise.all([
        companyIds.length
          ? supabase.from('companies').select('id, name').in('id', companyIds)
          : Promise.resolve({ data: [], error: null } as { data: Array<{ id: string; name: string }>; error: null }),
        jobIds.length
          ? supabase.from('job_listings').select('id, title').in('id', jobIds)
          : Promise.resolve({ data: [], error: null } as { data: Array<{ id: string; title: string }>; error: null }),
      ]);

      const companyMap = new Map((companyNameRes.data || []).map((row) => [row.id, row.name]));
      const jobMap = new Map((recentJobNameRes.data || []).map((row) => [row.id, row.title]));

      const activities = [
        ...(recentUsersRes.data || []).map((row) => ({
          type: 'user',
          description: `User baru: ${row.email}`,
          at: row.created_at,
        })),
        ...(recentJobsRes.data || []).map((row) => ({
          type: 'job',
          description: `Lowongan baru: ${row.title || '-'} — ${companyMap.get(row.company_id || '') || 'Perusahaan'}`,
          at: row.created_at,
        })),
        ...(recentAppsRes.data || []).map((row) => ({
          type: 'application',
          description: `Lamaran baru ke: ${jobMap.get(row.job_id || '') || 'Lowongan'}`,
          at: row.applied_at,
        })),
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 10);
      setRecentActivities(activities);

      const heatData = series.map((item) => ({
        date: item.date,
        value: item.seekers + item.employers + item.jobs + item.applications,
      }));
      setHeatMapData(heatData);

      const reviewed = statusMap.get('reviewed') || 0;
      const shortlisted = statusMap.get('shortlisted') || 0;
      const interview = statusMap.get('interview_scheduled') || 0;
      const hired = statusMap.get('hired') || 0;
      setFunnelData([
        { name: 'Lamaran Masuk', value: totalApplications, fill: '#06b6d4' },
        { name: 'Ditinjau', value: reviewed, fill: '#3b82f6' },
        { name: 'Shortlisted', value: shortlisted, fill: '#8b5cf6' },
        { name: 'Interview', value: interview, fill: '#f59e0b' },
        { name: 'Hired', value: hired, fill: '#10b981' },
      ]);

      const weeklyMap = new Map<string, { hired: number; rejected: number }>();
      appRows.forEach((row) => {
        const date = new Date(row.applied_at);
        const monday = new Date(date);
        monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const key = monday.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        if (!weeklyMap.has(key)) weeklyMap.set(key, { hired: 0, rejected: 0 });
        if (row.status === 'hired') weeklyMap.get(key)!.hired += 1;
        if (row.status === 'rejected') weeklyMap.get(key)!.rejected += 1;
      });
      setHiredRejectedData(Array.from(weeklyMap.entries()).map(([week, data]) => ({ week, ...data })));

      setLoading(false);
    };

    fetchData();

    if (!supabase) return;
    const channel = supabase
      .channel('admin-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_listings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users_meta' }, fetchData)
      .subscribe();

    return () => {
      active = false;
      channel.unsubscribe();
    };
  }, [period, adminId, adminEmail, onToast]);

  const statCards = [
    { label: 'Total User', value: stats.totalUsers, today: stats.newUsersToday, Icon: Users, color: 'text-sky-400' },
    { label: 'Seeker', value: stats.totalSeekers, today: stats.newUsersToday, Icon: UserCheck, color: 'text-cyan-400' },
    { label: 'Employer (Perusahaan)', value: stats.totalEmployers, today: stats.newUsersToday, Icon: Building2, color: 'text-teal-400' },
    { label: 'Total Lowongan', value: stats.totalJobs, today: stats.newJobsToday, Icon: Briefcase, color: 'text-sky-400' },
    { label: 'Lowongan Aktif', value: stats.activeJobs, today: stats.newJobsToday, Icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Total Lamaran', value: stats.totalApplications, today: stats.newApplicationsToday, Icon: FileText, color: 'text-cyan-400' },
    { label: 'Total Perusahaan', value: stats.totalCompanies, today: 0, Icon: Building, color: 'text-sky-400' },
    { label: 'Perusahaan Verified', value: stats.verifiedCompanies, today: 0, Icon: BadgeCheck, color: 'text-emerald-400' },
    { label: 'Lamaran Menunggu', value: stats.pendingApplications, today: 0, Icon: Clock, color: 'text-amber-400' },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Monitoring Platform</h2>
        <div className="rounded-lg border border-white/10 bg-slate-900 p-1 text-xs">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value as 7 | 30 | 90)}
              className={classNames(
                'rounded-md px-3 py-1.5 transition-colors',
                period === value ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              )}
            >
              {value} hari
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3.5 lg:gap-4">
        {loading
          ? Array.from({ length: 9 }).map((_, idx) => <SkeletonBlock key={idx} className="h-[92px] sm:h-[110px] rounded-xl" />)
          : statCards.map(({ label, value, today, Icon, color }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-xl border border-sky-500/20 bg-slate-900/90 p-2.5 sm:p-4 hover:border-sky-500/40 hover:bg-slate-900 transition-all shadow-md shadow-slate-950/40 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-300 truncate" title={label}>
                    {label}
                  </span>
                  <div className="flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 shrink-0">
                    <Icon className={classNames('h-3 w-3 sm:h-4 sm:w-4', color)} />
                  </div>
                </div>
                <div>
                  <p className="text-base sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
                    {value.toLocaleString('id-ID')}
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-sky-300/70 truncate">
                    +{today.toLocaleString('id-ID')} hari ini
                  </p>
                </div>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4 xl:col-span-3">
          <p className="mb-3 text-sm font-semibold text-slate-200">Tren Pendaftaran User</p>
          {loading ? (
            <SkeletonBlock className="h-[300px]" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="seekerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="employerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="seekers" stroke="#06b6d4" fill="url(#seekerGradient)" name="Seeker" />
                  <Area type="monotone" dataKey="employers" stroke="#8b5cf6" fill="url(#employerGradient)" name="Employer" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900 p-4 xl:col-span-2">
          <p className="mb-3 text-sm font-semibold text-slate-200">Lowongan vs Lamaran Harian</p>
          {loading ? (
            <SkeletonBlock className="h-[300px]" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="jobs" fill="#22c55e" name="Lowongan" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="applications" fill="#f97316" name="Lamaran" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-200">Distribusi Status Lamaran</p>
          {loading ? (
            <SkeletonBlock className="h-[300px]" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={applicationStatus} dataKey="value" nameKey="name" outerRadius={100} label>
                    {applicationStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-200">Top 5 Kategori Lowongan</p>
          {loading ? (
            <SkeletonBlock className="h-[300px]" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical">
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="category" type="category" stroke="#94a3b8" width={130} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#06b6d4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">Aktivitas Terbaru</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              refresh
            </button>
          </div>
          {loading ? (
            <SkeletonBlock className="h-[240px]" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/70 text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Aktivitas</th>
                    <th className="px-4 py-2 text-left">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((item, idx) => (
                    <tr
                      key={`${item.type}-${idx}`}
                      className={`border-t border-white/5 text-slate-200 transition-colors ${
                        idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                      }`}
                    >
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-4 py-2 text-slate-400">{formatRelativeTime(item.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-200">Monitoring Real-time</p>
          {loading ? (
            <SkeletonBlock className="h-[240px]" />
          ) : (
            <div className="grid grid-cols-10 gap-1">
              {heatMapData.map((item) => (
                <div
                  key={item.date}
                  title={`${item.date}: ${item.value} aktivitas`}
                  className={classNames(
                    'h-4 rounded',
                    item.value === 0
                      ? 'bg-slate-800'
                      : item.value <= 5
                        ? 'bg-cyan-900'
                        : item.value <= 20
                          ? 'bg-cyan-700'
                          : 'bg-cyan-500'
                  )}
                />
              ))}
            </div>
          )}

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnelData} isAnimationActive />
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <p className="mb-3 text-sm font-semibold text-slate-200">Rasio Hired vs Rejected per Minggu</p>
        {loading ? (
          <SkeletonBlock className="h-[250px]" />
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hiredRejectedData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="week" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line dataKey="hired" stroke="#10b981" name="Hired" strokeWidth={2} />
                <Line dataKey="rejected" stroke="#ef4444" name="Rejected" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminUsers({
  adminId,
  adminEmail,
  onToast,
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'email'>('newest');
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const limitedModeWarnedRef = useRef(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    seeker?: Record<string, unknown> | null;
    employer?: Record<string, unknown> | null;
    skills: Array<{ skill_name: string }>;
    experiences: Array<{ company_name: string; position: string }>;
    applications: Array<{ id: string; status: string; applied_at: string }>;
    jobs: Array<{ id: string; title: string; status: string }>;
    logs: AuditLog[];
  }>({
    seeker: null,
    employer: null,
    skills: [],
    experiences: [],
    applications: [],
    jobs: [],
    logs: [],
  });

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.email.toLowerCase().includes(query) ||
        (row.full_name || '').toLowerCase().includes(query) ||
        (row.company_name || '').toLowerCase().includes(query)
    );
  }, [rows, search]);

  const loadUsersPage = useCallback(async (options?: { silent?: boolean }) => {
    if (!supabase) return;
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    let proxyFailed = false;

    // Prefer server-side admin proxy (uses service role + verifies access token) to avoid RLS/permission issues on client.
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const url = new URL('/api/admin/users', window.location.origin);
        url.searchParams.set('page', String(page));
        url.searchParams.set('page_size', String(PAGE_SIZE));
        url.searchParams.set('role', roleFilter);
        url.searchParams.set('sort', sortBy);

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const payload = (await res.json()) as { rows: AdminUserRow[]; total: number };
          setRows(payload.rows || []);
          setTotal(payload.total || 0);
          setLoading(false);
          return;
        }

        const errPayload = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = errPayload?.message || `HTTP ${res.status}`;
        console.warn('[AdminUsers] /api/admin/users failed, falling back to direct Supabase query:', message);
        proxyFailed = true;
      }
    } catch (e) {
      console.warn('[AdminUsers] /api/admin/users call failed, falling back to direct Supabase query:', e);
      proxyFailed = true;
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const baseSelectWithBan = 'id, email, role, created_at, is_banned';
    const baseSelectNoBan = 'id, email, role, created_at';

    let query = supabase.from('users_meta').select(baseSelectWithBan, { count: 'exact' });

    if (roleFilter !== 'all') query = query.eq('role', roleFilter);
    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    if (sortBy === 'oldest') query = query.order('created_at', { ascending: true });
    if (sortBy === 'email') query = query.order('email', { ascending: true });

    let { data, count, error } = await query.range(from, to);

    // Backward-compatible fallback if DB migration that adds users_meta.is_banned hasn't been applied yet.
    if (error && /is_banned/i.test(error.message)) {
      console.warn('[AdminUsers] users_meta.is_banned missing, retrying without column');
      query = supabase.from('users_meta').select(baseSelectNoBan, { count: 'exact' });
      if (roleFilter !== 'all') query = query.eq('role', roleFilter);
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      if (sortBy === 'oldest') query = query.order('created_at', { ascending: true });
      if (sortBy === 'email') query = query.order('email', { ascending: true });
      ({ data, count, error } = await query.range(from, to));
      if (!error) {
        data = ((data || []) as AdminUserRow[]).map((row) => ({ ...row, is_banned: false }));
      }
    }

    if (error) {
      console.error('[AdminUsers] fetch users_meta failed:', error);
      onToast('error', `Gagal memuat data users: ${error.message}`);
      setLoading(false);
      return;
    }

    const users = (data || []) as Array<AdminUserRow>;
    const userIds = users.map((u) => u.id);

    const [seekerRes, companyRes] = await Promise.all([
      userIds.length
        ? supabase.from('seeker_profiles').select('user_id, full_name').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null } as { data: Array<{ user_id: string; full_name: string }>; error: null }),
      userIds.length
        ? supabase.from('companies').select('user_id, name').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null } as { data: Array<{ user_id: string; name: string }>; error: null }),
    ]);

    if (seekerRes.error) console.warn('[AdminUsers] fetch seeker_profiles failed:', seekerRes.error);
    if (companyRes.error) console.warn('[AdminUsers] fetch companies failed:', companyRes.error);

    const seekerMap = new Map((seekerRes.data || []).map((s) => [s.user_id, s.full_name]));
    const companyMap = new Map((companyRes.data || []).map((s) => [s.user_id, s.name]));

    setRows(
      users.map((row) => ({
        ...row,
        role: normalizeRoleByEmail(row.email, row.role),
        full_name: seekerMap.get(row.id),
        company_name: companyMap.get(row.id),
      }))
    );
    setTotal(count || 0);

    if (proxyFailed && !limitedModeWarnedRef.current) {
      onToast('info', 'Data admin masih mode terbatas. Isi SUPABASE_SERVICE_ROLE_KEY agar sinkronisasi lintas semua user berjalan penuh.');
      limitedModeWarnedRef.current = true;
    }

    setLoading(false);
  }, [onToast, page, roleFilter, sortBy]);

  useEffect(() => {
    loadUsersPage();
  }, [loadUsersPage]);

  useEffect(() => {
    if (!supabase) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const queueRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        loadUsersPage({ silent: true });
      }, 250);
    };

    const channel = supabase
      .channel(`admin-users-live-${page}-${roleFilter}-${sortBy}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users_meta' }, queueRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seeker_profiles' }, queueRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, queueRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      channel.unsubscribe();
    };
  }, [loadUsersPage, page, roleFilter, sortBy]);

  async function refreshCurrentPage() {
    await loadUsersPage({ silent: true });
  }

  async function handleChangeRole(row: AdminUserRow) {
    if (!supabase) return;
    const nextRole = window.prompt(`Ganti role untuk ${row.email} (seeker/employer/admin):`, row.role);
    if (!nextRole || !['seeker', 'employer', 'admin'].includes(nextRole)) return;
    if (nextRole === row.role) return;

    const { error } = await supabase.from('users_meta').update({ role: nextRole }).eq('id', row.id);
    if (error) {
      onToast('error', `Gagal ubah role: ${error.message}`);
      return;
    }

    await logAdminAction(adminId, adminEmail, 'change_role', 'user', row.id, `${row.email}: ${row.role} -> ${nextRole}`);
    onToast('success', `Role ${row.email} berhasil diubah ke ${nextRole}.`);
    refreshCurrentPage();
  }

  async function handleBanUser(row: AdminUserRow) {
    if (!supabase) return;
    const nextBan = !row.is_banned;
    const { error } = await supabase.from('users_meta').update({ is_banned: nextBan }).eq('id', row.id);
    if (error) {
      if (/is_banned/i.test(error.message)) {
        onToast('error', 'Fitur suspend belum aktif: jalankan migration Supabase untuk menambah kolom users_meta.is_banned.');
        return;
      }
      onToast('error', `Gagal update status suspend: ${error.message}`);
      return;
    }

    await logAdminAction(
      adminId,
      adminEmail,
      'ban_user',
      'user',
      row.id,
      `${nextBan ? 'Suspend' : 'Unsuspend'} user: ${row.email}`
    );
    onToast('success', nextBan ? 'User berhasil di-suspend.' : 'Suspend user dibuka kembali.');
    refreshCurrentPage();
  }

  async function handleDeleteUser(row: AdminUserRow) {
    if (!supabase) return;
    const confirmation = window.prompt(`Ketik email user untuk konfirmasi hapus permanen: ${row.email}`);
    if (confirmation !== row.email) return;

    const [deleteMeta] = await Promise.all([
      supabase.from('users_meta').delete().eq('id', row.id),
      supabase.from('seeker_profiles').delete().eq('user_id', row.id),
      supabase.from('companies').delete().eq('user_id', row.id),
    ]);

    if (deleteMeta.error) {
      onToast('error', `Gagal hapus user: ${deleteMeta.error.message}`);
      return;
    }

    await logAdminAction(adminId, adminEmail, 'delete_user', 'user', row.id, `Delete user profile: ${row.email}`);
    onToast('success', 'Data user berhasil dihapus (auth user perlu service role/edge function).');
    refreshCurrentPage();
  }

  async function handleViewDetail(row: AdminUserRow) {
    if (!supabase) return;
    setSelected(row);
    setDetailLoading(true);

    const [seekerRes, employerRes, logRes] = await Promise.all([
      supabase.from('seeker_profiles').select('*').eq('user_id', row.id).maybeSingle(),
      supabase.from('companies').select('*').eq('user_id', row.id).maybeSingle(),
      supabase.from('audit_logs').select('*').eq('target_id', row.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const seekerId = seekerRes.data?.id as string | undefined;
    const employerId = employerRes.data?.id as string | undefined;

    const [skillRes, expRes, appRes, jobsRes] = await Promise.all([
      seekerId
        ? supabase.from('seeker_skills').select('skill_name').eq('seeker_id', seekerId).limit(20)
        : Promise.resolve({ data: [], error: null } as { data: Array<{ skill_name: string }>; error: null }),
      seekerId
        ? supabase.from('seeker_experience').select('company_name, position').eq('seeker_id', seekerId).limit(20)
        : Promise.resolve({ data: [], error: null } as { data: Array<{ company_name: string; position: string }>; error: null }),
      seekerId
        ? supabase.from('applications').select('id, status, applied_at').eq('seeker_id', seekerId).order('applied_at', { ascending: false }).limit(5)
        : Promise.resolve({ data: [], error: null } as { data: Array<{ id: string; status: string; applied_at: string }>; error: null }),
      employerId
        ? supabase.from('job_listings').select('id, title, status').eq('company_id', employerId).order('created_at', { ascending: false }).limit(5)
        : Promise.resolve({ data: [], error: null } as { data: Array<{ id: string; title: string; status: string }>; error: null }),
    ]);

    setDetailData({
      seeker: seekerRes.data as Record<string, unknown> | null,
      employer: employerRes.data as Record<string, unknown> | null,
      skills: (skillRes.data || []) as Array<{ skill_name: string }>,
      experiences: (expRes.data || []) as Array<{ company_name: string; position: string }>,
      applications: (appRes.data || []) as Array<{ id: string; status: string; applied_at: string }>,
      jobs: (jobsRes.data || []) as Array<{ id: string; title: string; status: string }>,
      logs: (logRes.data || []) as AuditLog[],
    });
    setDetailLoading(false);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Manajemen Users</p>
          <button
            onClick={() => window.alert('Tambah Admin: daftarkan akun baru lalu ubah role jadi admin.')}
            className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200"
          >
            + Tambah Admin
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari email / nama / perusahaan"
              className="w-full rounded-lg border border-white/10 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setPage(1);
              setRoleFilter(e.target.value as 'all' | UserRole);
            }}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200"
          >
            <option value="all">Semua Role</option>
            <option value="seeker">Seeker (Pencari Kerja)</option>
            <option value="employer">Employer (Perusahaan)</option>
            <option value="admin">Admin (Administrator)</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'email')}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="email">A-Z Email</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900">
        {loading ? (
          <div className="space-y-3 p-4">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Bergabung</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-white/5 text-slate-300 transition-colors ${
                    idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                  }`}
                >
                  <td className="px-4 py-3">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{row.full_name || row.company_name || '-'}</p>
                  </td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">
                    <span className={classNames('rounded-full px-2 py-1 text-xs', badgeRoleClass(row.role))}>{roleLabel(row.role)}</span>
                  </td>
                  <td className="px-4 py-3">{new Date(row.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-3">
                    {row.is_banned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-300">
                        <ShieldX className="h-3.5 w-3.5" /> Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5" /> Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button onClick={() => handleViewDetail(row)} className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10">
                        Detail
                      </button>
                      <button onClick={() => handleChangeRole(row)} className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10">
                        Ganti Role
                      </button>
                      <button
                        onClick={() => handleBanUser(row)}
                        className="rounded-md border border-red-400/30 px-2 py-1 text-red-300 hover:bg-red-500/10"
                      >
                        {row.is_banned ? 'Buka Suspend' : 'Suspend'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(row)}
                        className="rounded-md border border-red-500/40 px-2 py-1 text-red-400 hover:bg-red-600/20"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} onChange={setPage} />

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Detail User</h3>
                <p className="text-sm text-slate-400">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">
                tutup
              </button>
            </div>

            {detailLoading ? (
              <div className="space-y-3">
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-slate-800 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Info Dasar</p>
                    <p className="mt-2">Role: {roleLabel(selected.role)}</p>
                    <p>Bergabung: {new Date(selected.created_at).toLocaleString('id-ID')}</p>
                    <p>Status: {selected.is_banned ? 'Suspended' : 'Aktif'}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-800 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Profil</p>
                    {selected.role === 'seeker' ? (
                      <div className="mt-2 space-y-1">
                        <p>Nama: {(detailData.seeker?.full_name as string) || '-'}</p>
                        <p>Kota: {(detailData.seeker?.domicile_city as string) || '-'}</p>
                        <p>Skill: {detailData.skills.map((s) => s.skill_name).join(', ') || '-'}</p>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1">
                        <p>Perusahaan: {(detailData.employer?.name as string) || '-'}</p>
                        <p>Verified: {(detailData.employer?.verified as boolean) ? 'Ya' : 'Belum'}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-800 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Riwayat Ringkas</p>
                  {selected.role === 'seeker' ? (
                    <ul className="space-y-1 text-slate-300">
                      {detailData.applications.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          Lamaran {item.status} - {new Date(item.applied_at).toLocaleDateString('id-ID')}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-1 text-slate-300">
                      {detailData.jobs.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          {item.title} ({item.status})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-800 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Timeline Audit (5 terakhir)</p>
                  <ul className="space-y-2 text-slate-300">
                    {detailData.logs.map((log) => (
                      <li key={log.id} className="rounded-lg bg-slate-900 p-2">
                        <p>{log.action}</p>
                        <p className="text-xs text-slate-500">{formatRelativeTime(log.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function AdminUsersManagement({
  adminId,
  adminEmail,
  onToast,
  initialSubTab = 'accounts',
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
  initialSubTab?: 'accounts' | 'intelligence' | 'devices';
}) {
  const [subTab, setSubTab] = useState<'accounts' | 'intelligence' | 'devices'>(() => {
    if (initialSubTab) return initialSubTab;
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('subTab') || urlParams.get('tab');
    if (tabParam === 'intelligence' || tabParam === 'user-data') return 'intelligence';
    if (tabParam === 'devices' || tabParam === 'perangkat') return 'devices';
    if (window.location.pathname === '/admin/user-data') return 'intelligence';
    if (window.location.pathname === '/admin/devices') return 'devices';
    return 'accounts';
  });

  const handleSubTabChange = (newTab: 'accounts' | 'intelligence' | 'devices') => {
    setSubTab(newTab);
    const targetUrl =
      newTab === 'accounts'
        ? '/admin/users'
        : newTab === 'intelligence'
        ? '/admin/users?subTab=intelligence'
        : '/admin/users?subTab=devices';
    window.history.replaceState({}, '', targetUrl);
  };

  return (
    <div className="space-y-5">
      {/* Unified Header & SubTab Switcher */}
      <div className="rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-xl shadow-black/20">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500/20 to-pink-500/20 text-rose-400 border border-rose-500/30 shadow-inner shrink-0">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Manajemen Users</h2>
              <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300 border border-rose-500/30">
                Pusat Kendali Pengguna
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 max-w-2xl leading-relaxed">
              Manajemen akun terpadu: kelola hak akses role, suspensi, monitoring kapabilitas & device intelligence, serta audit keamanan sesi perangkat.
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-950/80 border border-white/10 shrink-0 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => handleSubTabChange('accounts')}
            className={classNames(
              'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              subTab === 'accounts'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 border border-rose-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            )}
          >
            <Users className="h-4 w-4" />
            <span>Akun & Role</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange('intelligence')}
            className={classNames(
              'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              subTab === 'intelligence'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 border border-cyan-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            )}
          >
            <Layers className="h-4 w-4" />
            <span>Data & Device Intelligence</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange('devices')}
            className={classNames(
              'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              subTab === 'devices'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            )}
          >
            <Smartphone className="h-4 w-4" />
            <span>Registry Perangkat</span>
          </button>
        </div>
      </div>

      {/* Active SubTab View */}
      <div className="transition-all">
        {subTab === 'accounts' && <AdminUsers adminId={adminId} adminEmail={adminEmail} onToast={onToast} />}
        {subTab === 'intelligence' && <AdminUserDataCenter />}
        {subTab === 'devices' && <AdminDeviceManagement />}
      </div>
    </div>
  );
}

function AdminJobs({
  adminId,
  adminEmail,
  onToast,
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Array<JobListing & { companies?: Company | Company[] }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'draft'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | JobListing['job_type']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const categories = useMemo(() => {
    const unique = new Set(jobs.map((job) => job.category).filter(Boolean));
    return Array.from(unique);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const company = getFirstValue(job.companies);
      const isSearchMatch =
        !query ||
        job.title.toLowerCase().includes(query) ||
        (job.location_city || '').toLowerCase().includes(query) ||
        (company?.name || '').toLowerCase().includes(query);
      const isCategoryMatch = categoryFilter === 'all' || job.category === categoryFilter;
      return isSearchMatch && isCategoryMatch;
    });
  }, [jobs, search, categoryFilter]);

  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  useEffect(() => {
    let active = true;
    const fetchJobs = async () => {
      if (!supabase) return;
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('job_listings')
        .select(
          'id, title, category, location_city, job_type, status, salary_min, salary_max, quota, created_at, expires_at, company_id, companies(id, name, verified, logo_url)',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (typeFilter !== 'all') query = query.eq('job_type', typeFilter);

      const { data, count, error } = await query.range(from, to);
      if (!active) return;
      if (error) {
        onToastRef.current('error', `Gagal memuat lowongan: ${error.message}`);
        setLoading(false);
        return;
      }

      setJobs((data || []) as Array<JobListing & { companies?: Company | Company[] }>);
      setTotal(count || 0);
      setLoading(false);
    };

    fetchJobs();
    return () => {
      active = false;
    };
  }, [page, statusFilter, typeFilter]);

  async function toggleJobStatus(job: JobListing) {
    if (!supabase) return;
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    const { error } = await supabase.from('job_listings').update({ status: newStatus }).eq('id', job.id);
    if (error) {
      onToast('error', `Gagal update status: ${error.message}`);
      return;
    }
    await logAdminAction(adminId, adminEmail, 'toggle_job_status', 'job', job.id, `${job.title}: ${job.status} -> ${newStatus}`);
    onToast('success', `Status lowongan "${job.title}" diubah ke ${newStatus}.`);
    setJobs((prev) => prev.map((item) => (item.id === job.id ? { ...item, status: newStatus } : item)));
  }

  async function deleteJob(job: JobListing) {
    if (!supabase) return;
    if (!window.confirm(`Hapus lowongan "${job.title}"?`)) return;

    const [deleteApplications, deleteJobRes] = await Promise.all([
      supabase.from('applications').delete().eq('job_id', job.id),
      supabase.from('job_listings').delete().eq('id', job.id),
    ]);
    if (deleteJobRes.error || deleteApplications.error) {
      onToast('error', 'Gagal menghapus lowongan.');
      return;
    }
    await logAdminAction(adminId, adminEmail, 'delete_job', 'job', job.id, `Delete job: ${job.title}`);
    onToast('success', 'Lowongan berhasil dihapus.');
    setJobs((prev) => prev.filter((item) => item.id !== job.id));
  }

  async function bulkUpdateStatus(nextStatus: 'active' | 'closed') {
    if (!supabase || selectedIds.length === 0) return;
    const { error } = await supabase.from('job_listings').update({ status: nextStatus }).in('id', selectedIds);
    if (error) {
      onToast('error', `Gagal update bulk: ${error.message}`);
      return;
    }
    await logAdminAction(
      adminId,
      adminEmail,
      'toggle_job_status',
      'job',
      selectedIds.join(','),
      `Bulk update status jobs to ${nextStatus}`
    );
    onToast('success', `${selectedIds.length} lowongan diubah ke ${nextStatus}.`);
    setJobs((prev) => prev.map((item) => (selectedIds.includes(item.id) ? { ...item, status: nextStatus } : item)));
    setSelectedIds([]);
  }

  async function bulkDelete() {
    if (!supabase || selectedIds.length === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.length} lowongan terpilih?`)) return;
    await supabase.from('applications').delete().in('job_id', selectedIds);
    const { error } = await supabase.from('job_listings').delete().in('id', selectedIds);
    if (error) {
      onToast('error', `Gagal hapus bulk: ${error.message}`);
      return;
    }
    await logAdminAction(adminId, adminEmail, 'delete_job', 'job', selectedIds.join(','), 'Bulk delete jobs');
    onToast('success', `${selectedIds.length} lowongan berhasil dihapus.`);
    setJobs((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <Filter className="h-4 w-4" />
          Filter Lowongan
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul / kota / perusahaan"
              className="w-full rounded-lg border border-white/10 bg-slate-800 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as typeof statusFilter);
            }}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setPage(1);
              setTypeFilter(e.target.value as typeof typeFilter);
            }}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Semua Tipe</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm">
          <span className="text-cyan-100">{selectedIds.length} item dipilih</span>
          <button onClick={() => bulkUpdateStatus('active')} className="rounded-lg border border-white/20 px-2 py-1 text-xs">
            Aktifkan Semua
          </button>
          <button onClick={() => bulkUpdateStatus('closed')} className="rounded-lg border border-white/20 px-2 py-1 text-xs">
            Tutup Semua
          </button>
          <button onClick={bulkDelete} className="rounded-lg border border-red-400/40 px-2 py-1 text-xs text-red-300">
            Hapus Semua
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900">
        {loading ? (
          <div className="space-y-3 p-4">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredJobs.length > 0 && selectedIds.length === filteredJobs.length}
                    onChange={(e) => setSelectedIds(e.target.checked ? filteredJobs.map((job) => job.id) : [])}
                  />
                </th>
                <th className="px-4 py-3 text-left">Judul</th>
                <th className="px-4 py-3 text-left">Perusahaan</th>
                <th className="px-4 py-3 text-left">Kategori</th>
                <th className="px-4 py-3 text-left">Tipe</th>
                <th className="px-4 py-3 text-left">Kota</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Gaji</th>
                <th className="px-4 py-3 text-left">Kuota</th>
                <th className="px-4 py-3 text-left">Tgl Posting</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, idx) => {
                const company = getFirstValue(job.companies);
                return (
                  <tr
                    key={job.id}
                    className={`border-b border-white/5 text-slate-300 transition-colors ${
                      idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(job.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) => (e.target.checked ? [...prev, job.id] : prev.filter((id) => id !== job.id)))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-white">{job.title}</td>
                    <td className="px-4 py-3">{company?.name || '-'}</td>
                    <td className="px-4 py-3">{job.category || '-'}</td>
                    <td className="px-4 py-3">{job.job_type}</td>
                    <td className="px-4 py-3">{job.location_city || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={classNames(
                          'rounded-full px-2 py-1 text-xs',
                          job.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : job.status === 'closed'
                              ? 'bg-slate-500/20 text-slate-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                        )}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      Rp {Number(job.salary_min || 0).toLocaleString('id-ID')} - Rp{' '}
                      {Number(job.salary_max || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">{job.quota}</td>
                    <td className="px-4 py-3">{new Date(job.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          onClick={() => window.alert(`${job.title}\n${company?.name || '-'}`)}
                          className="rounded-md border border-white/10 px-2 py-1"
                        >
                          Preview
                        </button>
                        <button onClick={() => toggleJobStatus(job)} className="rounded-md border border-white/10 px-2 py-1">
                          {job.status === 'active' ? 'Tutup' : 'Aktifkan'}
                        </button>
                        <button onClick={() => deleteJob(job)} className="rounded-md border border-red-400/30 px-2 py-1 text-red-300">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} onChange={setPage} />
    </section>
  );
}

function StatMini({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value.toLocaleString('id-ID')}</p>
    </div>
  );
}

type CompanyWithStats = Company & {
  owner_email?: string;
  active_jobs?: number;
  total_jobs?: number;
};

type JobAdWithCompany = {
  id: string;
  title: string;
  category?: string;
  location_city?: string;
  job_type?: JobType | string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_text?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  quota?: number;
  status: JobStatus | string;
  created_at: string;
  expires_at?: string;
  updated_at?: string;
  company_id?: string;
  company_name?: string;
  companies?: Company | null;
  applicant_count?: number;
  is_internal?: boolean;
  site?: string;
  source?: string;
  external_url?: string;
  poster_url?: string;
  application_url?: string;
};

const JOB_TYPE_DISPLAY: Record<string, string> = {
  'full-time': 'Full Time',
  'part-time': 'Part Time',
  contract: 'Kontrak',
  freelance: 'Freelance',
  internship: 'Magang',
};

function formatAdSalary(min?: number | null, max?: number | null, fallbackText?: string) {
  const nMin = Number(min || 0);
  const nMax = Number(max || 0);
  if (nMin <= 0 && nMax <= 0) return fallbackText || 'Kompetitif / Sesuai Pengalaman';
  if (nMin > 0 && nMax > 0) {
    return `Rp ${nMin.toLocaleString('id-ID')} - Rp ${nMax.toLocaleString('id-ID')}`;
  }
  if (nMin > 0) return `Mulai Rp ${nMin.toLocaleString('id-ID')}`;
  return `Hingga Rp ${nMax.toLocaleString('id-ID')}`;
}

const SMART_JOB_CATEGORIES = [
  'Teknologi & IT',
  'Pemasaran & Digital',
  'Keuangan & Akuntansi',
  'Desain & Kreatif',
  'Penjualan / Sales',
  'Operasional & Logistik',
  'SDM & HRD',
  'Hukum & Legal',
  'Layanan Pelanggan (CS)',
  'Manajemen Produk',
  'Teknik & Rekayasa',
  'Analisis Data',
  'F&B & Hospitality',
  'Pendidikan & Pelatihan',
  'Kesehatan & Medis',
];

const SMART_JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'full-time', label: 'Purna Waktu (Full Time)' },
  { value: 'part-time', label: 'Paruh Waktu (Part Time)' },
  { value: 'contract', label: 'Kontrak' },
  { value: 'freelance', label: 'Lepas Waktu (Freelance)' },
  { value: 'internship', label: 'Magang (Internship)' },
];

function SmartAddJobSection({
  adminId,
  adminEmail,
  onToast,
  onJobCreated,
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
  onJobCreated: () => void;
}) {
  const [inputMode, setInputMode] = useState<'poster' | 'link'>('poster');
  const [posterBase64, setPosterBase64] = useState<string>('');
  const [posterFileName, setPosterFileName] = useState<string>('');
  const [postUrl, setPostUrl] = useState<string>('');
  const [postText, setPostText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractStep, setExtractStep] = useState<number>(0);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    category: 'Teknik & Rekayasa',
    location_city: 'Kabupaten Bandung',
    job_type: 'full-time' as JobType,
    salary_min: 0,
    salary_max: 0,
    description: '',
    requirements: '',
    benefits: '',
    quota: 1,
    application_url: '',
    contact_phone: '',
    ai_notes: '',
    confidence_score: 95,
  });

  const [hasExtracted, setHasExtracted] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showOriginalPoster, setShowOriginalPoster] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLoadSampleStaffinc = async () => {
    try {
      setIsExtracting(true);
      setExtractError(null);
      setExtractStep(1);
      const res = await fetch('/samples/staffinc-poster.png');
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setPosterBase64(base64data);
        setPosterFileName('staffinc-poster-sample.png');
        setPostUrl('https://loker.staffinc.co/lJTDZ');
        setPostText('Lowongan Kerja Technician Staffinc Kab. Bandung. Seluruh proses rekrutmen gratis tidak dipungut biaya.');
        setIsExtracting(false);
        setExtractStep(0);
        onToast('info', 'Poster contoh Staffinc berhasil dimuat. Silakan klik tombol Ekstrak AI.');
      };
      reader.readAsDataURL(blob);
    } catch {
      setIsExtracting(false);
      setExtractStep(0);
      onToast('error', 'Gagal memuat file contoh poster.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast('error', 'Harap pilih berkas gambar (PNG, JPG, JPEG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPosterBase64(reader.result as string);
      setPosterFileName(file.name);
      setExtractError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast('error', 'Harap drop berkas gambar poster loker.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPosterBase64(reader.result as string);
      setPosterFileName(file.name);
      setExtractError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSmartExtract = async () => {
    if (!posterBase64 && !postUrl.trim() && !postText.trim()) {
      onToast('error', 'Harap upload gambar poster atau isi link postingan FB / teks caption.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setExtractStep(1);

    try {
      const stepTimer1 = setTimeout(() => setExtractStep(2), 1200);
      const stepTimer2 = setTimeout(() => setExtractStep(3), 3200);

      const { data: sessionData } = await (supabase ? supabase.auth.getSession() : { data: { session: null } });
      const token = sessionData?.session?.access_token || '';

      const resp = await fetch('/api/admin/smart-job-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageBase64: posterBase64,
          postUrl: postUrl.trim(),
          postText: postText.trim(),
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${resp.status} dari 9Router Gemini 3.8`);
      }

      const resData = await resp.json();
      const job = resData.job;
      if (!job) throw new Error('Data loker tidak ditemukan dalam respon AI.');

      setFormData({
        title: job.title || '',
        company_name: job.company_name || '',
        category: job.category || 'Teknik & Rekayasa',
        location_city: job.location_city || 'Kabupaten Bandung',
        job_type: (job.job_type as JobType) || 'full-time',
        salary_min: Number(job.salary_min) || 0,
        salary_max: Number(job.salary_max) || 0,
        description: job.description || '',
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        quota: Number(job.quota) || 1,
        application_url: job.application_url || postUrl || '',
        contact_phone: job.contact_phone || '',
        ai_notes: job.ai_notes || '',
        confidence_score: job.confidence_score || 95,
      });

      setHasExtracted(true);
      setIsExtracting(false);
      setExtractStep(0);
      onToast('success', `✨ AI Gemini 3.8 berhasil mengekstrak: "${job.title}" oleh ${job.company_name}`);

      setTimeout(() => {
        document.getElementById('smart-job-review-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err: any) {
      setIsExtracting(false);
      setExtractStep(0);
      setExtractError(err.message || 'Gagal mengekstrak data');
      onToast('error', `Ekstraksi gagal: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const handlePublish = async () => {
    if (!formData.title.trim()) {
      onToast('error', 'Judul posisi lowongan wajib diisi.');
      return;
    }
    if (!formData.company_name.trim()) {
      onToast('error', 'Nama perusahaan wajib diisi.');
      return;
    }

    setIsPublishing(true);

    try {
      const { data: sessionData } = await (supabase ? supabase.auth.getSession() : { data: { session: null } });
      const token = sessionData?.session?.access_token || '';

      const resp = await fetch('/api/admin/publish-smart-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          poster_url: posterBase64 || '',
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.message || `Gagal publikasi (HTTP ${resp.status})`);
      }

      setIsPublishing(false);
      onToast('success', `🚀 Iklan loker "${formData.title}" resmi tayang di portal LOXER!`);
      onJobCreated();
    } catch (err: any) {
      setIsPublishing(false);
      onToast('error', `Gagal menerbitkan loker: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: AI Smart Add Engine */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 shadow-xl backdrop-blur-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>Smart Add Iklan Loker • 9Router Gemini 3.8</span>
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-200">
                OCR Multimodal
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Buat Iklan Loker Instan dari Poster & Postingan Facebook</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload flyer poster loker atau tempel tautan postingan FB. Agen AI Gemini 3.8 membaca visual secara mendalam, mengekstrak kualifikasi, gaji, dan syarat kerja, lalu secara otomatis menyesuaikannya ke dalam struktur standar portal LOXER.
            </p>
          </div>

          <button
            onClick={handleLoadSampleStaffinc}
            disabled={isExtracting}
            className="flex items-center gap-2 self-start md:self-center whitespace-nowrap rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-300 transition-all shadow-sm shadow-amber-500/10 hover:scale-[1.02] active:scale-[0.98]"
            title="Klik untuk mencoba otomatis dengan contoh poster Staffinc Technician"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>⚡ Muat Contoh Poster Staffinc</span>
          </button>
        </div>
      </div>

      {/* Input Source Selector Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 backdrop-blur-md shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Langkah 1: Masukkan Sumber Informasi Loker</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Pilih metode input yang paling praktis: upload file gambar poster atau masukkan tautan link FB</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 p-1">
            <button
              onClick={() => setInputMode('poster')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                inputMode === 'poster'
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Upload Poster / Flyer</span>
            </button>
            <button
              onClick={() => setInputMode('link')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                inputMode === 'link'
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link Facebook / Teks</span>
            </button>
          </div>
        </div>

        {/* Mode: Poster Image Upload */}
        {inputMode === 'poster' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!posterBase64 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer rounded-2xl border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/80 bg-slate-950/50 hover:bg-cyan-950/10 p-8 text-center transition-all duration-300"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="mt-4 text-sm font-semibold text-white">
                  Tarik & lepas poster loker ke sini, atau <span className="text-cyan-400 underline underline-offset-2">pilih dari perangkat</span>
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Mendukung format PNG, JPG, JPEG, atau WEBP (Maks 10MB). AI Vision akan membaca seluruh teks flyer secara presisi.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-cyan-500/30 bg-slate-950/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-16 w-16 overflow-hidden rounded-xl border border-cyan-500/30 bg-black/40 flex-shrink-0">
                    <img src={posterBase64} alt="Poster loker" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                      {posterFileName || 'Poster Loker Terunggah'}
                    </p>
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Berkas gambar siap dianalisis oleh Gemini 3.8 Flash
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  >
                    Ganti Gambar
                  </button>
                  <button
                    onClick={() => {
                      setPosterBase64('');
                      setPosterFileName('');
                    }}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode: Link FB or Text Caption */}
        {inputMode === 'link' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Link Postingan Facebook / Tautan Karir Web
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="Contoh: https://facebook.com/groups/lokercimahi/posts/123456... atau https://loker.staffinc.co/..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teks Caption Postingan FB / Keterangan Tambahan (Opsional)
              </label>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows={3}
                placeholder="Tempel teks caption postingan Facebook atau deskripsi syarat loker di sini jika ada..."
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Action Button: Trigger AI Extraction */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {isExtracting ? (
              <div className="flex items-center gap-2 text-cyan-300">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>
                  {extractStep === 1 && 'Fase 1/3: Menghubungi 9Router AI Gateway...'}
                  {extractStep === 2 && 'Fase 2/3: Menjalankan OCR visual & ekstraksi multimodal poster...'}
                  {extractStep === 3 && 'Fase 3/3: Menyesuaikan struktur standar portal LOXER...'}
                  {extractStep === 0 && 'Sedang memproses...'}
                </span>
              </div>
            ) : extractError ? (
              <span className="text-red-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {extractError}
              </span>
            ) : (
              <span>Tekan tombol di samping untuk mengekstrak dan menyesuaikan konten secara otomatis.</span>
            )}
          </div>

          <button
            onClick={handleSmartExtract}
            disabled={isExtracting || (!posterBase64 && !postUrl.trim() && !postText.trim())}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Mengekstrak dengan Gemini 3.8...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Mulai Ekstraksi AI dengan Gemini 3.8</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Review Form & Live LOXER Flyer Preview */}
      {hasExtracted && (
        <div id="smart-job-review-section" className="space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Langkah 2: Review & Finalisasi Iklan Loker</span>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Akurasi {formData.confidence_score}%
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Data telah disesuaikan dengan struktur LOXER. Anda dapat mengedit setiap field di bawah ini sebelum menerbitkannya.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowOriginalPoster(!showOriginalPoster)}
              className="text-xs text-cyan-300 hover:text-white underline underline-offset-2 flex items-center gap-1 self-start sm:self-center"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showOriginalPoster ? 'Sembunyikan Gambar Asli' : 'Bandingkan dengan Poster Asli'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Editor (7 cols) */}
            <div className="lg:col-span-7 space-y-4 rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Formulir Data Iklan LOXER
                </h4>
                <span className="text-[11px] text-slate-400">Semua perubahan langsung ter-update di live preview</span>
              </div>

              {/* Title & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Judul Posisi Lowongan <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Technician Maintenance"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Perusahaan / Usaha <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Contoh: Staffinc"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold"
                  />
                </div>
              </div>

              {/* Category & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kategori Loker
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {SMART_JOB_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kota / Wilayah Penempatan
                  </label>
                  <input
                    type="text"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    placeholder="Contoh: Kabupaten Bandung"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Job Type & Quota */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipe Pekerjaan
                  </label>
                  <select
                    value={formData.job_type}
                    onChange={(e) => setFormData({ ...formData, job_type: e.target.value as JobType })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {SMART_JOB_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estimasi Kuota (Orang)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.quota}
                    onChange={(e) => setFormData({ ...formData, quota: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Salary Min & Max */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Gaji Minimal (Rp) <span className="text-[10px] text-slate-400 font-normal">(0 = Dirahasiakan)</span>
                  </label>
                  <input
                    type="number"
                    step={100000}
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Gaji Maksimal (Rp)
                  </label>
                  <input
                    type="number"
                    step={100000}
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Apply URL & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Link Pendaftaran Online
                  </label>
                  <input
                    type="text"
                    value={formData.application_url}
                    onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
                    placeholder="https://loker.staffinc.co/..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nomor WhatsApp / Kontak HRD
                  </label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+62 8111..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deskripsi Pekerjaan (LOXER Tone)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kualifikasi & Persyaratan (Poin-poin)
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed font-mono text-[11px]"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Benefit & Fasilitas yang Ditawarkan
                </label>
                <textarea
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows={3}
                  placeholder="BPJS Kesehatan, THR, dsb..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
                />
              </div>

              {/* AI Insight Box */}
              {formData.ai_notes && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
                  <Bot className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Catatan Analisis AI Gemini 3.8:</span>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">{formData.ai_notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live LOXER Flyer Card Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-md sticky top-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Live Card Preview di LOXER
                  </h4>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold">
                    Siap Tayang
                  </span>
                </div>

                {/* The Live Render Card */}
                <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-xl hover:border-cyan-400 transition-all duration-300 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-base font-black text-white shadow-md shadow-cyan-500/20">
                        {formData.company_name.slice(0, 2).toUpperCase() || 'LX'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white">
                            {formData.company_name || 'Nama Perusahaan'}
                          </h4>
                          <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          <span>{formData.location_city || 'Lokasi Kerja'}</span>
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                      ⭐ Mitra LOXER
                    </span>
                  </div>

                  {/* Title & Tags */}
                  <div>
                    <h3 className="text-base font-bold text-white hover:text-cyan-300 transition">
                      {formData.title || 'Judul Posisi Lowongan'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="rounded-md bg-slate-800 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                        {formData.category}
                      </span>
                      <span className="rounded-md bg-slate-800 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                        {JOB_TYPE_DISPLAY[formData.job_type] || formData.job_type}
                      </span>
                      <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {formatAdSalary(formData.salary_min, formData.salary_max)}
                      </span>
                    </div>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {formData.description || 'Deskripsi pekerjaan akan tampil di sini...'}
                  </p>

                  {/* Requirements Snippet */}
                  {formData.requirements && (
                    <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Kualifikasi Utama:
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono whitespace-pre-line line-clamp-4">
                        {formData.requirements}
                      </p>
                    </div>
                  )}

                  {/* Benefits Snippet */}
                  {formData.benefits && (
                    <div className="rounded-xl border border-white/5 bg-slate-950/60 p-2.5 text-[11px] text-emerald-300">
                      <strong className="text-white">Benefit: </strong>
                      <span className="whitespace-pre-line">{formData.benefits}</span>
                    </div>
                  )}

                  {/* Apply Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 py-2 text-center text-xs font-bold text-white shadow-md shadow-cyan-500/20"
                    >
                      Lamar Sekarang
                    </button>
                    {formData.application_url && (
                      <a
                        href={formData.application_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-300 hover:text-white"
                        title="Buka link pendaftaran"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Original Flyer Image Preview */}
                {posterBase64 && showOriginalPoster && (
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                      <span>Gambar Poster Asli (Input Visual):</span>
                      <span className="text-[10px] text-cyan-400 font-mono">OCR Visual Active</span>
                    </p>
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-black/50">
                      <img src={posterBase64} alt="Flyer Asli" className="w-full object-contain" />
                    </div>
                  </div>
                )}

                {/* Final Publish CTA */}
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mempublikasikan ke Portal LOXER...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>🚀 Publikasikan Iklan ke LOXER Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useJobAdsCatalog(onToast: (type: ToastType, message: string) => void) {
  const [jobAds, setJobAds] = useState<JobAdWithCompany[]>([]);
  const [jobAdsLoading, setJobAdsLoading] = useState(false);
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const fetchJobAds = useCallback(async () => {
    if (!supabase) return;
    setJobAdsLoading(true);
    try {
      const [adsRes, appsRes, unifiedPayload] = await Promise.all([
        supabase
          .from('job_listings')
          .select(
            'id, title, category, location_city, job_type, status, salary_min, salary_max, quota, description, requirements, benefits, poster_url, application_url, created_at, expires_at, company_id, companies(*)'
          )
          .order('created_at', { ascending: false }),
        supabase.from('applications').select('job_id'),
        fetchUnifiedJobs({ provider: 'all', limit: 500 }).catch((err) => {
          console.warn('[useJobAdsCatalog] fetchUnifiedJobs fallback:', err);
          return { jobs: [], hits: 0 };
        }),
      ]);

      if (adsRes.error) {
        onToastRef.current('error', `Gagal memuat katalog iklan loker: ${adsRes.error.message}`);
        setJobAdsLoading(false);
        return;
      }

      const appCounts: Record<string, number> = {};
      (appsRes.data || []).forEach((a) => {
        if (a.job_id) {
          appCounts[a.job_id] = (appCounts[a.job_id] || 0) + 1;
        }
      });

      // Internal jobs with DB linkage & management capabilities
      const internalJobMap = new Map<string, JobAdWithCompany>();
      const internalJobsList: JobAdWithCompany[] = ((adsRes.data || []) as any[]).map((j) => {
        const comp = getFirstValue(j.companies) || null;
        const mapped: JobAdWithCompany = {
          ...j,
          companies: comp,
          company_name: comp?.name || 'Mitra LOXER',
          applicant_count: appCounts[j.id] || 0,
          is_internal: true,
          site: 'LOXER Mitra',
          source: 'LOXER Verified Employer',
          external_url: `/seeker/browse?job_id=${j.id}`,
        };
        internalJobMap.set(j.id, mapped);
        return mapped;
      });

      // External / Partner feed jobs (Arbeitnow Global, etc.)
      const unifiedJobs = Array.isArray(unifiedPayload?.jobs) ? unifiedPayload.jobs : [];
      const externalJobsList: JobAdWithCompany[] = [];

      unifiedJobs.forEach((uj: any, idx: number) => {
        if (uj.is_internal && uj.job_id && internalJobMap.has(uj.job_id)) {
          return;
        }

        const compName = uj.company || 'Perusahaan Global';
        let inferredCategory = 'Teknologi & IT';
        const titleLower = (uj.title || '').toLowerCase();
        if (titleLower.includes('design') || titleLower.includes('ui/ux') || titleLower.includes('art') || titleLower.includes('grafis')) {
          inferredCategory = 'Desain & Kreatif';
        } else if (titleLower.includes('marketing') || titleLower.includes('seo') || titleLower.includes('sales') || titleLower.includes('growth') || titleLower.includes('pemasaran')) {
          inferredCategory = 'Pemasaran & Digital';
        } else if (titleLower.includes('hr') || titleLower.includes('recruiter') || titleLower.includes('people') || titleLower.includes('talent') || titleLower.includes('admin')) {
          inferredCategory = 'Admin & Operasional';
        } else if (titleLower.includes('manager') || titleLower.includes('lead') || titleLower.includes('director') || titleLower.includes('leiter')) {
          inferredCategory = 'Manajemen & Bisnis';
        } else if (titleLower.includes('engineer') || titleLower.includes('developer') || titleLower.includes('tech') || titleLower.includes('informatik') || titleLower.includes('software')) {
          inferredCategory = 'Teknologi & IT';
        } else {
          inferredCategory = 'Umum';
        }

        const extCompId = `partner-${compName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const extJobId = uj.job_id || `ext-${idx}-${(uj.url || uj.title || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;

        const extJob: JobAdWithCompany = {
          id: extJobId,
          company_id: extCompId,
          company_name: compName,
          title: uj.title || 'Lowongan Pekerjaan',
          category: inferredCategory,
          location_city: uj.locations || 'Remote / Global',
          job_type: 'full-time',
          salary_min: uj.salary_min || null,
          salary_max: uj.salary_max || null,
          salary_text: uj.salary || 'Kompetitif / Sesuai Pengalaman',
          description: uj.description || '',
          requirements: 'Kualifikasi lengkap dan tata cara pendaftaran dapat dilihat langsung di tautan sumber resmi mitra.',
          benefits: '',
          quota: 0,
          status: 'active',
          created_at: uj.date || new Date().toISOString(),
          companies: {
            id: extCompId,
            user_id: '',
            name: compName,
            city: uj.locations || 'Global',
            verified: true,
            created_at: uj.date || new Date().toISOString(),
            updated_at: uj.date || new Date().toISOString(),
            website: uj.url,
          },
          applicant_count: 0,
          is_internal: false,
          site: uj.site || 'Arbeitnow',
          source: uj.source || 'Arbeitnow Global Feed',
          external_url: uj.url,
        };

        externalJobsList.push(extJob);
      });

      const combined = [...internalJobsList, ...externalJobsList];
      setJobAds(combined);
    } catch (err: any) {
      onToastRef.current('error', `Terjadi kesalahan saat memuat iklan: ${err.message}`);
    } finally {
      setJobAdsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobAds();
  }, [fetchJobAds]);

  return { jobAds, setJobAds, jobAdsLoading, fetchJobAds };
}

interface AdminJobAdsCatalogSectionProps {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
  jobAds: JobAdWithCompany[];
  setJobAds: React.Dispatch<React.SetStateAction<JobAdWithCompany[]>>;
  jobAdsLoading: boolean;
  onRefreshJobAds: () => void;
  selectedCompanyId?: string;
  onSelectCompanyId?: (id: string) => void;
  onViewApplicants?: (jobTitle: string, companyName?: string) => void;
  registeredCompanies?: Company[];
}

function AdminJobAdsCatalogSection({
  adminId,
  adminEmail,
  onToast,
  jobAds,
  setJobAds,
  jobAdsLoading,
  onRefreshJobAds,
  selectedCompanyId: propCompanyId,
  onSelectCompanyId,
  onViewApplicants,
  registeredCompanies = [],
}: AdminJobAdsCatalogSectionProps) {
  const [localCompanyId, setLocalCompanyId] = useState('all');
  const activeCompanyId = propCompanyId !== undefined ? propCompanyId : localCompanyId;
  const setCompanyFilter = (id: string) => {
    if (onSelectCompanyId) onSelectCompanyId(id);
    else setLocalCompanyId(id);
  };

  const [adSearch, setAdSearch] = useState('');
  const [adSourceFilter, setAdSourceFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [adStatusFilter, setAdStatusFilter] = useState<'all' | 'active' | 'closed' | 'draft'>('all');
  const [adTypeFilter, setAdTypeFilter] = useState<'all' | JobType>('all');
  const [adCategoryFilter, setAdCategoryFilter] = useState('all');
  const [adViewMode, setAdViewMode] = useState<'grid' | 'table'>('grid');
  const [adPage, setAdPage] = useState(1);
  const AD_PAGE_SIZE = 18;
  const [previewJob, setPreviewJob] = useState<JobAdWithCompany | null>(null);
  const [adActionLoadingId, setAdActionLoadingId] = useState<string | null>(null);

  // Toggle Job Ad Status (active / closed)
  async function toggleAdStatus(ad: JobAdWithCompany) {
    if (!supabase) return;
    if (!ad.is_internal) {
      onToast('info', 'Status lowongan dari mitra global disinkronkan langsung dari feed agregator.');
      return;
    }
    setAdActionLoadingId(ad.id);
    const nextStatus: JobStatus = ad.status === 'active' ? 'closed' : 'active';
    const { error } = await supabase.from('job_listings').update({ status: nextStatus }).eq('id', ad.id);
    setAdActionLoadingId(null);
    if (error) {
      onToast('error', `Gagal mengubah status iklan: ${error.message}`);
      return;
    }
    await logAdminAction(
      adminId,
      adminEmail,
      'update_job_status',
      'job_listing',
      ad.id,
      `Status iklan diubah ke ${nextStatus} untuk ${ad.title}`
    );
    setJobAds((prev) =>
      prev.map((item) => (item.id === ad.id ? { ...item, status: nextStatus } : item))
    );
    if (previewJob?.id === ad.id) {
      setPreviewJob((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
    onToast('success', `Status iklan "${ad.title}" diubah menjadi ${nextStatus === 'active' ? 'Aktif (Tayang)' : 'Ditutup'}.`);
  }

  // Delete Job Ad
  async function deleteAd(ad: JobAdWithCompany) {
    if (!supabase) return;
    if (!ad.is_internal) {
      onToast('info', 'Lowongan mitra global dikelola melalui konfigurasi sumber integrasi API.');
      return;
    }
    if (!window.confirm(`Hapus iklan lowongan "${ad.title}" dari perusahaan "${ad.companies?.name || ad.company_name || 'Perusahaan'}"? Seluruh berkas pelamar pada iklan ini juga akan dihapus.`)) {
      return;
    }
    setAdActionLoadingId(ad.id);
    const [delApps, delJob] = await Promise.all([
      supabase.from('applications').delete().eq('job_id', ad.id),
      supabase.from('job_listings').delete().eq('id', ad.id),
    ]);
    setAdActionLoadingId(null);
    if (delJob.error) {
      onToast('error', `Gagal menghapus iklan: ${delJob.error.message}`);
      return;
    }
    await logAdminAction(
      adminId,
      adminEmail,
      'delete_job',
      'job_listing',
      ad.id,
      `Hapus iklan lowongan ${ad.title} (${ad.companies?.name || 'N/A'})`
    );
    setJobAds((prev) => prev.filter((item) => item.id !== ad.id));
    if (previewJob?.id === ad.id) {
      setPreviewJob(null);
    }
    onToast('success', `Iklan "${ad.title}" berhasil dihapus.`);
  }

  const adStats = useMemo(() => {
    const totalAds = jobAds.length;
    const activeAds = jobAds.filter((j) => j.status === 'active').length;
    const closedAds = jobAds.filter((j) => j.status === 'closed').length;
    const internalAds = jobAds.filter((j) => j.is_internal).length;
    const externalAds = jobAds.filter((j) => !j.is_internal).length;
    const uniqueCompanies = new Set(jobAds.map((j) => j.company_id)).size;
    const totalApplicants = jobAds.reduce((sum, j) => sum + (j.applicant_count || 0), 0);
    return { totalAds, activeAds, closedAds, internalAds, externalAds, uniqueCompanies, totalApplicants };
  }, [jobAds]);

  const companyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; is_internal: boolean }>();
    jobAds.forEach((j) => {
      const cId = j.company_id || (j.companies?.name ? `partner-${j.companies.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : 'unknown');
      const cName = j.companies?.name || j.company_name || 'Perusahaan';
      const existing = map.get(cId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(cId, {
          id: cId,
          name: cName,
          count: 1,
          is_internal: Boolean(j.is_internal),
        });
      }
    });

    (registeredCompanies || []).forEach((r) => {
      if (!map.has(r.id)) {
        map.set(r.id, {
          id: r.id,
          name: r.name,
          count: 0,
          is_internal: true,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.is_internal && !b.is_internal) return -1;
      if (!a.is_internal && b.is_internal) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [jobAds, registeredCompanies]);

  const adCategories = useMemo(() => {
    const unique = new Set(jobAds.map((j) => j.category).filter(Boolean));
    return Array.from(unique).sort();
  }, [jobAds]);

  const filteredAds = useMemo(() => {
    const q = adSearch.trim().toLowerCase();
    return jobAds.filter((job) => {
      const company = job.companies;
      const compName = company?.name || job.company_name || '';
      const matchSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        (job.category || '').toLowerCase().includes(q) ||
        (job.location_city || '').toLowerCase().includes(q) ||
        compName.toLowerCase().includes(q) ||
        (job.description || '').toLowerCase().includes(q);

      const matchSource =
        adSourceFilter === 'all' ||
        (adSourceFilter === 'internal' && job.is_internal) ||
        (adSourceFilter === 'external' && !job.is_internal);

      const matchCompany = activeCompanyId === 'all' || job.company_id === activeCompanyId;
      const matchStatus = adStatusFilter === 'all' || job.status === adStatusFilter;
      const matchType = adTypeFilter === 'all' || job.job_type === adTypeFilter;
      const matchCategory = adCategoryFilter === 'all' || job.category === adCategoryFilter;

      return matchSearch && matchSource && matchCompany && matchStatus && matchType && matchCategory;
    });
  }, [jobAds, adSearch, adSourceFilter, activeCompanyId, adStatusFilter, adTypeFilter, adCategoryFilter]);

  useEffect(() => {
    setAdPage(1);
  }, [adSearch, adSourceFilter, activeCompanyId, adStatusFilter, adTypeFilter, adCategoryFilter]);

  const totalAdPages = Math.max(1, Math.ceil(filteredAds.length / AD_PAGE_SIZE));
  const paginatedAds = useMemo(() => {
    const start = (adPage - 1) * AD_PAGE_SIZE;
    return filteredAds.slice(start, start + AD_PAGE_SIZE);
  }, [filteredAds, adPage]);

  const filteredCompanyObj = useMemo(() => {
    if (activeCompanyId === 'all') return null;
    return (
      companyOptions.find((c) => c.id === activeCompanyId) ||
      jobAds.find((j) => j.company_id === activeCompanyId)?.companies ||
      null
    );
  }, [activeCompanyId, companyOptions, jobAds]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Controls: View Mode & Refresh */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-0.5">
          <button
            onClick={() => setAdViewMode('grid')}
            className={`p-1.5 rounded-md text-xs transition ${
              adViewMode === 'grid' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilan Grid Katalog"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAdViewMode('table')}
            className={`p-1.5 rounded-md text-xs transition ${
              adViewMode === 'table' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilan Tabel Data"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onRefreshJobAds}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
          title="Segarkan data lowongan"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${jobAdsLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Iklan</span>
        </button>
      </div>

      {/* Ad Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-cyan-500/20 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-400 font-semibold flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5" /> Total Iklan Loker
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{adStats.totalAds.toLocaleString('id-ID')}</p>
          <p className="mt-1 text-[11px] text-slate-400">Tersinkronisasi portal publik</p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Iklan Aktif (Tayang)
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{adStats.activeAds.toLocaleString('id-ID')}</p>
          <p className="mt-1 text-[11px] text-slate-400">Siap dilamar kandidat</p>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-sky-400 font-semibold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Mitra LOXER Internal
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-300">{adStats.internalAds.toLocaleString('id-ID')}</p>
          <p className="mt-1 text-[11px] text-slate-400">{adStats.totalApplicants} pelamar masuk</p>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-purple-400 font-semibold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Global Partner Feed
          </p>
          <p className="mt-1 text-2xl font-bold text-purple-300">{adStats.externalAds.toLocaleString('id-ID')}</p>
          <p className="mt-1 text-[11px] text-slate-400">Arbeitnow Live API</p>
        </div>
      </div>

      {/* Source Tabs Filter */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-white/5">
        <span className="text-xs text-slate-400 font-medium px-1">Sumber Lowongan:</span>
        <button
          onClick={() => setAdSourceFilter('all')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            adSourceFilter === 'all'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          <span>Semua Sumber</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{adStats.totalAds}</span>
        </button>

        <button
          onClick={() => setAdSourceFilter('internal')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            adSourceFilter === 'internal'
              ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          <span>⭐ Mitra LOXER Internal</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{adStats.internalAds}</span>
        </button>

        <button
          onClick={() => setAdSourceFilter('external')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            adSourceFilter === 'external'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          <span>🌍 Arbeitnow Global</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{adStats.externalAds}</span>
        </button>
      </div>

      {/* Active Company Filter Notification Banner */}
      {activeCompanyId !== 'all' && filteredCompanyObj && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3 text-xs text-cyan-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Menampilkan katalog iklan khusus perusahaan: <strong className="text-white text-sm">{filteredCompanyObj.name}</strong> ({filteredAds.length} iklan)
            </span>
          </div>
          <button
            onClick={() => setCompanyFilter('all')}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-cyan-500/30 transition"
          >
            ✕ Tampilkan Seluruh Perusahaan
          </button>
        </div>
      )}

      {/* Search & Advanced Filters */}
      <div className="rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={adSearch}
              onChange={(e) => setAdSearch(e.target.value)}
              placeholder="Cari judul loker, keahlian, kota, atau nama perusahaan..."
              className="w-full rounded-lg border border-white/10 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={activeCompanyId}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Perusahaan ({jobAds.length} Loker)</option>
            {companyOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.is_internal ? '⭐ ' : ''}{c.name} ({c.count} loker)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-white/5">
          <select
            value={adStatusFilter}
            onChange={(e) => setAdStatusFilter(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Status Iklan</option>
            <option value="active">Tayang (Aktif)</option>
            <option value="closed">Ditutup</option>
          </select>

          <select
            value={adTypeFilter}
            onChange={(e) => setAdTypeFilter(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Tipe Pekerjaan</option>
            <option value="full-time">Full-time (Purna Waktu)</option>
            <option value="part-time">Part-time (Paruh Waktu)</option>
            <option value="contract">Kontrak</option>
            <option value="freelance">Freelance (Lepas Waktu)</option>
            <option value="internship">Magang</option>
          </select>

          <select
            value={adCategoryFilter}
            onChange={(e) => setAdCategoryFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Kategori</option>
            {adCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CATALOG DISPLAY (Grid vs Table) */}
      {jobAdsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Tidak ada iklan loker yang ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter perusahaan/sumber.</p>
          {(activeCompanyId !== 'all' || adSourceFilter !== 'all') && (
            <button
              onClick={() => {
                setCompanyFilter('all');
                setAdSourceFilter('all');
              }}
              className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
            >
              Tampilkan Semua Loker & Sumber
            </button>
          )}
        </div>
      ) : adViewMode === 'grid' ? (
        /* GRID VIEW: KATALOG VISUAL IKLAN LOKER (FLYER CARD) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedAds.map((job) => {
            const company = job.companies;
            const isAktif = job.status === 'active';
            const isActionLoading = adActionLoadingId === job.id;
            const isInternal = Boolean(job.is_internal);
            const compName = company?.name || job.company_name || 'Perusahaan';

            return (
              <div
                key={job.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 shadow-lg transition-all duration-200 group relative ${
                  isInternal
                    ? 'border-cyan-500/30 bg-slate-900/95 hover:border-cyan-400 hover:shadow-cyan-500/10'
                    : 'border-purple-500/20 bg-slate-900/90 hover:border-purple-400/50 hover:shadow-purple-500/10'
                }`}
              >
                <div>
                  {/* Top Bar: Company Monogram & Source/Status Badge */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {company?.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={compName}
                          className="w-9 h-9 rounded-xl border border-white/10 object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                            isInternal
                              ? 'bg-gradient-to-br from-sky-500 to-cyan-500 text-white'
                              : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                          }`}
                        >
                          {(compName[0] || 'C').toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate flex items-center gap-1" title={compName}>
                          {compName}
                          {company?.verified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" title="Verified" />
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {job.location_city || 'Remote / Global'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isInternal ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            isAktif
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-800 border-white/10 text-slate-400'
                          }`}
                        >
                          {isAktif ? '● Tayang' : 'Tutup'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                          {job.site || 'Global'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges: Category & Job Type */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      {job.category || 'Umum'}
                    </span>
                    <span className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      {JOB_TYPE_DISPLAY[job.job_type || ''] || job.job_type || 'Full Time'}
                    </span>
                  </div>

                  {/* Job Title */}
                  <h3
                    className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug mb-2"
                    title={job.title}
                  >
                    {job.title}
                  </h3>

                  {/* Salary Display */}
                  <p className="text-xs font-bold text-emerald-300 mb-3 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {job.salary_text || formatAdSalary(job.salary_min, job.salary_max)}
                    </span>
                  </p>

                  {/* Brief Description */}
                  {job.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                      {job.description.replace(/<[^>]*>/g, '').trim()}
                    </p>
                  )}

                  {/* Key Indicators */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5 mb-3">
                    {isInternal ? (
                      <span className="flex items-center gap-1 font-medium text-slate-300">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <strong>{job.applicant_count || 0}</strong> Pelamar
                      </span>
                    ) : (
                      <span className="text-purple-300/90 font-medium flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-purple-400" /> Partner Feed
                      </span>
                    )}

                    {job.quota && job.quota > 0 ? (
                      <span className="text-slate-400">Kuota: {job.quota}</span>
                    ) : null}

                    <span className="text-slate-500 text-[10px]">
                      {new Date(job.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-1.5">
                  <button
                    onClick={() => setPreviewJob(job)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-1.5 px-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pratinjau</span>
                  </button>

                  {onViewApplicants && isInternal && (
                    <button
                      onClick={() => onViewApplicants(job.title, compName)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-500/30 bg-sky-500/10 py-1.5 px-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                      title="Lihat pelamar untuk lowongan ini"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Pelamar ({job.applicant_count || 0})</span>
                    </button>
                  )}

                  {isInternal ? (
                    <>
                      <button
                        onClick={() => toggleAdStatus(job)}
                        disabled={isActionLoading}
                        className={`rounded-xl border py-1.5 px-2.5 text-xs font-semibold transition ${
                          isAktif
                            ? 'border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10'
                            : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                        }`}
                        title={isAktif ? 'Tutup lowongan' : 'Tayangkan lowongan'}
                      >
                        {isActionLoading ? '...' : isAktif ? 'Tutup' : 'Tayangkan'}
                      </button>

                      <a
                        href={`/seeker/browse?job_id=${job.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/5 transition"
                        title="Buka lowongan di halaman publik"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => deleteAd(job)}
                        disabled={isActionLoading}
                        className="rounded-xl border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10 transition"
                        title="Hapus iklan lowongan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <a
                      href={job.external_url || `/browse?search=${encodeURIComponent(job.title)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-950/40 py-1.5 px-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-900/50 hover:text-white transition"
                      title="Kunjungi sumber resmi lowongan"
                    >
                      <span>Sumber</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW: TABEL DATA RINCI KATALOG IKLAN LOKER */
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Perusahaan</th>
                <th className="px-4 py-3 text-left">Judul Iklan Loker</th>
                <th className="px-4 py-3 text-left">Sumber</th>
                <th className="px-4 py-3 text-left">Kategori & Tipe</th>
                <th className="px-4 py-3 text-left">Lokasi</th>
                <th className="px-4 py-3 text-left">Kisaran Gaji</th>
                <th className="px-4 py-3 text-left">Pelamar</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAds.map((job, idx) => {
                const company = job.companies;
                const isInternal = Boolean(job.is_internal);
                const isAktif = job.status === 'active';
                const compName = company?.name || job.company_name || 'Perusahaan';

                return (
                  <tr
                    key={job.id}
                    className={`border-b border-white/5 transition ${
                      idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {company?.logo_url ? (
                          <img src={company.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-slate-800 text-[10px] font-bold text-cyan-400 flex items-center justify-center">
                            {(compName[0] || 'C').toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-white truncate max-w-[140px]" title={compName}>
                          {compName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-[200px]" title={job.title}>
                        {job.title}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(job.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {isInternal ? (
                        <span className="rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold">
                          Mitra LOXER
                        </span>
                      ) : (
                        <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold">
                          {job.site || 'Global'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <div>{job.category || 'Umum'}</div>
                      <span className="text-[10px] text-slate-400">
                        {JOB_TYPE_DISPLAY[job.job_type || ''] || job.job_type || 'Full Time'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{job.location_city || 'Remote'}</td>
                    <td className="px-4 py-3 text-xs text-emerald-300 font-medium">
                      {job.salary_text || formatAdSalary(job.salary_min, job.salary_max)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {isInternal ? (
                        <span className="font-bold text-white">{job.applicant_count || 0}</span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isAktif ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isAktif ? 'Tayang' : 'Tutup'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          onClick={() => setPreviewJob(job)}
                          className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-300 hover:bg-cyan-500/20 transition flex items-center gap-1"
                          title="Lihat Pratinjau Iklan"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Pratinjau</span>
                        </button>
                        {onViewApplicants && isInternal && (
                          <button
                            onClick={() => onViewApplicants(job.title, compName)}
                            className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-300 hover:bg-sky-500/20 transition flex items-center gap-1"
                            title="Lihat Pelamar Lowongan Ini"
                          >
                            <Users className="w-3 h-3" />
                            <span>Pelamar</span>
                          </button>
                        )}
                        {isInternal ? (
                          <>
                            <button
                              onClick={() => toggleAdStatus(job)}
                              className="rounded-md border border-white/10 px-2 py-1 text-slate-300 hover:bg-white/10 transition"
                            >
                              {isAktif ? 'Tutup' : 'Tayang'}
                            </button>
                            <button
                              onClick={() => deleteAd(job)}
                              className="rounded-md border border-red-500/20 px-2 py-1 text-red-300 hover:bg-red-500/10 transition"
                            >
                              Hapus
                            </button>
                          </>
                        ) : (
                          <a
                            href={job.external_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-purple-500/30 bg-purple-950/40 px-2 py-1 text-purple-300 hover:bg-purple-900/50 hover:text-white transition flex items-center gap-1"
                          >
                            <span>Lamar</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredAds.length > AD_PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-xs text-slate-300">
          <div>
            Menampilkan <strong className="text-white">{(adPage - 1) * AD_PAGE_SIZE + 1}</strong> - <strong className="text-white">{Math.min(filteredAds.length, adPage * AD_PAGE_SIZE)}</strong> dari <strong className="text-cyan-300">{filteredAds.length}</strong> iklan loker
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAdPage((p) => Math.max(1, p - 1))}
              disabled={adPage <= 1}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white transition"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-medium text-slate-400">
              Halaman <span className="text-white font-bold">{adPage}</span> / {totalAdPages}
            </span>
            <button
              onClick={() => setAdPage((p) => Math.min(totalAdPages, p + 1))}
              disabled={adPage >= totalAdPages}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white transition"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* FLYER PREVIEW MODAL */}
      {previewJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setPreviewJob(null)}
              className="absolute right-4 top-4 rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Poster image if available */}
            {previewJob.poster_url && (
              <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex justify-center max-h-72">
                <img
                  src={previewJob.poster_url}
                  alt={previewJob.title}
                  className="object-contain max-h-72 w-full"
                />
              </div>
            )}

            {/* Company Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4 pr-10">
              {previewJob.companies?.logo_url ? (
                <img
                  src={previewJob.companies.logo_url}
                  alt={previewJob.companies.name}
                  className="w-12 h-12 rounded-xl border border-white/20 object-cover"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
                    previewJob.is_internal
                      ? 'bg-gradient-to-br from-sky-500 to-cyan-500 shadow-cyan-500/30'
                      : 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/30'
                  }`}
                >
                  {((previewJob.companies?.name || previewJob.company_name || 'C')[0]).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-white font-bold text-base truncate">
                    {previewJob.companies?.name || previewJob.company_name || 'Perusahaan'}
                  </h3>
                  {previewJob.companies?.verified && (
                    <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" title="Verified Company" />
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {previewJob.is_internal ? '⭐ Mitra Resmi Terverifikasi LOXER' : `🌍 Sumber: ${previewJob.site || 'Arbeitnow Global'}`} • {previewJob.location_city || 'Indonesia'}
                </p>
                {previewJob.companies?.website && (
                  <a
                    href={previewJob.companies.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Globe className="w-3 h-3" /> {previewJob.companies.website}
                  </a>
                )}
              </div>
            </div>

            {/* Job Title & Badges */}
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                    previewJob.status === 'active'
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-800 border-white/10 text-slate-400'
                  }`}
                >
                  {previewJob.status === 'active' ? '● Sedang Tayang' : 'Ditutup'}
                </span>
                {previewJob.is_internal ? (
                  <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                    Mitra LOXER
                  </span>
                ) : (
                  <span className="rounded-lg bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-xs font-semibold text-purple-300">
                    Arbeitnow Feed
                  </span>
                )}
                <span className="rounded-lg bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-xs font-semibold text-sky-300">
                  {previewJob.category || 'Umum'}
                </span>
                <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                  {JOB_TYPE_DISPLAY[previewJob.job_type || ''] || previewJob.job_type || 'Full Time'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">{previewJob.title}</h2>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3.5 mb-5 text-xs">
              <div>
                <p className="text-slate-400 flex items-center gap-1 mb-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kisaran Gaji</span>
                </p>
                <p className="font-bold text-emerald-300 text-sm">
                  {previewJob.salary_text || formatAdSalary(previewJob.salary_min, previewJob.salary_max)}
                </p>
              </div>

              <div>
                <p className="text-slate-400 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Lokasi Penempatan</span>
                </p>
                <p className="font-semibold text-white">
                  {previewJob.location_city || 'Sesuai Lokasi Perusahaan'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 flex items-center gap-1 mb-1">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pelamar / Kuota</span>
                </p>
                <p className="font-semibold text-white">
                  {previewJob.is_internal ? (
                    <>
                      <strong className="text-cyan-300">{previewJob.applicant_count || 0}</strong> Pelamar
                      {previewJob.quota && previewJob.quota > 0 ? ` (Kuota: ${previewJob.quota})` : ''}
                    </>
                  ) : (
                    <span className="text-purple-300">Global Direct Apply</span>
                  )}
                </p>
              </div>
            </div>

            {/* Job Description */}
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div>
                <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Deskripsi Pekerjaan</span>
                </h4>
                <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3.5 whitespace-pre-line text-slate-300">
                  {previewJob.description || 'Tidak ada deskripsi pekerjaan khusus.'}
                </div>
              </div>

              {previewJob.requirements && (
                <div>
                  <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-sky-400" />
                    <span>Persyaratan & Kualifikasi</span>
                  </h4>
                  <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3.5 whitespace-pre-line text-slate-300">
                    {previewJob.requirements}
                  </div>
                </div>
              )}

              {previewJob.benefits && (
                <div>
                  <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span>Benefit & Fasilitas</span>
                  </h4>
                  <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3.5 whitespace-pre-line text-slate-300">
                    {previewJob.benefits}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-500">
                <span>ID Lowongan: <code className="text-slate-400 font-mono">{previewJob.id}</code></span>
                <span>Diposting: {new Date(previewJob.created_at).toLocaleString('id-ID')}</span>
                {previewJob.expires_at && (
                  <span>Kadaluarsa: {new Date(previewJob.expires_at).toLocaleDateString('id-ID')}</span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
              {onViewApplicants && previewJob.is_internal && (
                <button
                  onClick={() => {
                    const title = previewJob.title;
                    const comp = previewJob.companies?.name || previewJob.company_name;
                    setPreviewJob(null);
                    onViewApplicants(title, comp);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 hover:border-sky-400 transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Lihat Pelamar ({previewJob.applicant_count || 0})</span>
                </button>
              )}

              {previewJob.is_internal ? (
                <>
                  <button
                    onClick={() => toggleAdStatus(previewJob)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                      previewJob.status === 'active'
                        ? 'border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10'
                        : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                    }`}
                  >
                    {previewJob.status === 'active' ? 'Tutup Iklan' : 'Aktifkan Iklan'}
                  </button>

                  <a
                    href={`/seeker/browse?job_id=${previewJob.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka di Portal Publik</span>
                  </a>

                  <button
                    onClick={() => deleteAd(previewJob)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
                  >
                    Hapus Iklan
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={previewJob.external_url || 'https://www.arbeitnow.com'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:brightness-110 transition"
                  >
                    <span>Lamar di Sumber Resmi ({previewJob.site || 'Arbeitnow'})</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <a
                    href={`/browse?search=${encodeURIComponent(previewJob.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Cari di Portal Publik</span>
                  </a>
                </>
              )}

              <button
                onClick={() => setPreviewJob(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminApplications({
  adminId,
  adminEmail,
  onToast,
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
}) {
  const { session } = useAuth();

  // Sub-tabs: 'applications' | 'talents' | 'smart-cv'
  const [activeSubTab, setActiveSubTab] = useState<'applications' | 'talents' | 'smart-cv'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('view') === 'smart-cv' || p.get('sub') === 'smart-cv' || p.get('view') === 'smart-add' || p.get('sub') === 'smart-add') return 'smart-cv';
      if (
        p.get('view') === 'talents' ||
        p.get('view') === 'pelamar' ||
        p.get('sub') === 'talents' ||
        p.get('sub') === 'pelamar' ||
        p.get('view') === 'iklan' ||
        p.get('view') === 'ads'
      ) return 'talents';
    }
    return 'applications';
  });

  const handleSubTabChange = (tab: 'applications' | 'talents' | 'smart-cv') => {
    setActiveSubTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'applications') {
        url.searchParams.delete('view');
        url.searchParams.delete('sub');
      } else if (tab === 'talents') {
        url.searchParams.set('view', 'talents');
      } else if (tab === 'smart-cv') {
        url.searchParams.set('view', 'smart-cv');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Talent catalog hook
  const { talents, loading: talentsLoading, fetchTalents } = useTalentCatalog(onToast);

  // Applications table state
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((item) => {
      const seeker = getFirstValue(item.seeker_profiles as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
      const job = getFirstValue(item.job_listings as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
      const company = getFirstValue(job?.companies as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
      return (
        String(seeker?.full_name || '')
          .toLowerCase()
          .includes(query) ||
        String(job?.title || '')
          .toLowerCase()
          .includes(query) ||
        String(company?.name || '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [rows, search]);

  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const fetchApplications = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from('applications')
      .select(
        'id, status, applied_at, updated_at, seeker_profiles(full_name, domicile_city), job_listings(id, title, companies(name))',
        { count: 'exact' }
      )
      .order('applied_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (dateFrom) query = query.gte('applied_at', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('applied_at', `${dateTo}T23:59:59`);

    const { data, count, error } = await query.range(from, to);
    if (error) {
      onToastRef.current('error', `Gagal memuat lamaran: ${error.message}`);
      setLoading(false);
      return;
    }
    setRows((data || []) as Array<Record<string, unknown>>);
    setTotal(count || 0);
    setLoading(false);
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const refreshAll = () => {
    fetchApplications();
    fetchTalents();
  };

  async function forceUpdateStatus(row: Record<string, unknown>) {
    if (!supabase) return;
    const current = String(row.status || 'applied') as ApplicationStatus;
    const next = window.prompt(
      'Status baru (applied/reviewed/shortlisted/interview_scheduled/hired/rejected/expired)',
      current
    ) as ApplicationStatus | null;
    if (!next || !['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'hired', 'rejected', 'expired'].includes(next)) return;

    const { error } = await supabase
      .from('applications')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', String(row.id));
    if (error) {
      onToast('error', `Gagal update status: ${error.message}`);
      return;
    }
    await logAdminAction(adminId, adminEmail, 'force_update_status', 'application', String(row.id), `${current} -> ${next}`);
    setRows((prev) =>
      prev.map((item) =>
        String(item.id) === String(row.id) ? { ...item, status: next, updated_at: new Date().toISOString() } : item
      )
    );
    onToast('success', 'Status lamaran berhasil diperbarui.');
  }

  async function deleteApplication(row: Record<string, unknown>) {
    if (!supabase) return;
    if (!window.confirm('Hapus lamaran ini?')) return;
    const { error } = await supabase.from('applications').delete().eq('id', String(row.id));
    if (error) {
      onToast('error', `Gagal hapus lamaran: ${error.message}`);
      return;
    }
    await logAdminAction(adminId, adminEmail, 'delete_application', 'application', String(row.id), 'Delete application');
    setRows((prev) => prev.filter((item) => String(item.id) !== String(row.id)));
    onToast('success', 'Lamaran berhasil dihapus.');
  }

  function exportCSV() {
    const headers = ['ID', 'Seeker', 'Lowongan', 'Perusahaan', 'Status', 'Tgl Lamar'];
    const csvRows = filteredRows.map((item) => {
      const seeker = getFirstValue(item.seeker_profiles as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
      const job = getFirstValue(item.job_listings as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
      const company = getFirstValue(job?.companies as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
      return [
        String(item.id || ''),
        String(seeker?.full_name || ''),
        String(job?.title || ''),
        String(company?.name || ''),
        String(item.status || ''),
        new Date(String(item.applied_at || '')).toLocaleDateString('id-ID'),
      ];
    });

    const csv = [headers, ...csvRows]
      .map((row) => row.map((value) => `"${String(value).split('"').join('""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lamaran_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('success', 'CSV berhasil diekspor.');
  }

  async function voidStaleApplications() {
    const daysInput = window.prompt('Tandai lamaran sebagai kadaluarsa jika lebih dari N hari tanpa tindakan dari employer.\nMasukkan jumlah hari (default: 30):', '30');
    if (daysInput === null) return;
    const days = Math.max(1, parseInt(daysInput || '30', 10));
    if (!window.confirm(`Yakin ingin membatalkan semua lamaran 'applied'/'reviewed' yang sudah lebih dari ${days} hari? Aksi ini tidak dapat diurungkan.`)) return;

    setVoidLoading(true);
    try {
      const token = session?.access_token || localStorage.getItem('loxer_local_auth_token') || '';
      const resp = await fetch('/api/admin/applications/void-stale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ days_threshold: days }),
      });
      const result = await resp.json();
      if (resp.ok && result.ok) {
        onToast('success', `${result.voided} lamaran telah ditandai kadaluarsa.`);
        setPage(1);
      } else {
        onToast('error', result.message || 'Gagal membatalkan lamaran kadaluarsa.');
      }
    } catch {
      onToast('error', 'Gagal terhubung ke server.');
    } finally {
      setVoidLoading(false);
    }
  }

  const reviewCount = useMemo(() => {
    return rows.filter((r) => r.status === 'applied' || r.status === 'reviewed').length;
  }, [rows]);

  const shortlistedCount = useMemo(() => {
    return rows.filter((r) => r.status === 'shortlisted' || r.status === 'interview_scheduled').length;
  }, [rows]);

  return (
    <section className="space-y-5">
      {/* Sub-Feature Tab Navigator: Data Lamaran vs Katalog Pelamar Kerja vs Smart Add CV */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/90 p-2.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-white/5 overflow-x-auto max-w-full">
          <button
            onClick={() => handleSubTabChange('applications')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'applications'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>Data Lamaran Masuk</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeSubTab === 'applications' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {total}
            </span>
          </button>

          <button
            onClick={() => handleSubTabChange('talents')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'talents'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Katalog Pelamar Kerja</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeSubTab === 'talents' ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-300'
              }`}
            >
              {talents.length}
            </span>
          </button>

          <button
            onClick={() => handleSubTabChange('smart-cv')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'smart-cv'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/25 ring-1 ring-white/20'
                : 'text-amber-400 hover:text-white hover:bg-white/5 border border-amber-500/30 bg-amber-500/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Smart Add CV</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                activeSubTab === 'smart-cv'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
              }`}
            >
              Gemini 3.8
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="Segarkan data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || talentsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DATA PELAMAR KERJA (APPLICATIONS MONITORING) */}
      {activeSubTab === 'applications' && (
        <div className="space-y-4 animate-fade-in">
          {/* Mini Stats Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatMini title="Total Lamaran Masuk" value={total} />
            <StatMini title="Menunggu Review" value={reviewCount} />
            <StatMini title="Shortlist & Interview" value={shortlistedCount} />
            <div
              onClick={() => handleSubTabChange('talents')}
              className="cursor-pointer rounded-xl border border-cyan-500/20 bg-slate-900 p-4 transition hover:border-cyan-500/50 hover:bg-slate-800/80 group"
              title="Klik untuk membuka Katalog Pelamar Kerja"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-cyan-400 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Total Talent Pelamar
                </p>
                <ChevronRight className="w-4 h-4 text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="mt-1 text-2xl font-bold text-white group-hover:text-cyan-300 transition">
                {talents.length.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Active Job / Search Filter Notification Banner */}
          {search && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3 text-xs text-cyan-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Memfilter pelamar untuk kata kunci / lowongan: <strong className="text-white">{search}</strong> ({filteredRows.length} pelamar)
                </span>
              </div>
              <button
                onClick={() => setSearch('')}
                className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-cyan-500/30 transition"
              >
                ✕ Tampilkan Semua Pelamar
              </button>
            </div>
          )}

          {/* Action & Filter Bar */}
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Monitoring Lamaran</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={voidStaleApplications}
                  disabled={voidLoading}
                  className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-500/20 disabled:opacity-50 transition"
                >
                  {voidLoading ? 'Memproses...' : 'Void Kadaluarsa'}
                </button>
                <button
                  onClick={exportCSV}
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 transition"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari seeker / lowongan / perusahaan..."
                  className="w-full rounded-lg border border-white/10 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value as 'all' | ApplicationStatus);
                }}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Status</option>
                <option value="applied">Applied</option>
                <option value="reviewed">Reviewed</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview_scheduled">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired (Kadaluarsa)</option>
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900">
            {loading ? (
              <div className="space-y-3 p-4">
                <SkeletonBlock className="h-10" />
                <SkeletonBlock className="h-10" />
                <SkeletonBlock className="h-10" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Seeker</th>
                    <th className="px-4 py-3 text-left">Lowongan</th>
                    <th className="px-4 py-3 text-left">Perusahaan</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Tgl Lamar</th>
                    <th className="px-4 py-3 text-left">Tgl Update</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada berkas lamaran yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const seeker = getFirstValue(
                        row.seeker_profiles as Record<string, unknown> | Array<Record<string, unknown>> | undefined
                      );
                      const job = getFirstValue(row.job_listings as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
                      const company = getFirstValue(job?.companies as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
                      return (
                        <tr
                          key={String(row.id)}
                          className={`border-b border-white/5 text-slate-300 transition-colors ${
                            idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                          }`}
                        >
                          <td className="px-4 py-3">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-white">{String(seeker?.full_name || '-')}</td>
                          <td className="px-4 py-3 text-cyan-300">{String(job?.title || '-')}</td>
                          <td className="px-4 py-3">{String(company?.name || '-')}</td>
                          <td className="px-4 py-3">
                            <ApplicationStatusBadge status={String(row.status || 'applied') as ApplicationStatus} />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{new Date(String(row.applied_at || '')).toLocaleDateString('id-ID')}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{new Date(String(row.updated_at || '')).toLocaleDateString('id-ID')}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                              <button
                                onClick={() =>
                                  window.alert(
                                    `Lamaran ${String(row.id)}\nSeeker: ${String(seeker?.full_name || '-')}\nJob: ${String(job?.title || '-')}`
                                  )
                                }
                                className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10 transition"
                              >
                                Detail
                              </button>
                              <button onClick={() => forceUpdateStatus(row)} className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10 transition">
                                Ubah Status
                              </button>
                              <button onClick={() => deleteApplication(row)} className="rounded-md border border-red-400/30 px-2 py-1 text-red-300 hover:bg-red-500/10 transition">
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <Pagination page={page} total={total} onChange={setPage} />
        </div>
      )}

      {/* SUB-TAB 2: KATALOG PELAMAR KERJA (COMPREHENSIVE TALENTS & CANDIDATES CATALOG) */}
      {activeSubTab === 'talents' && (
        <AdminTalentCatalogSection
          onToast={onToast}
          onNavigateToSmartAdd={() => handleSubTabChange('smart-cv')}
        />
      )}

      {/* SUB-TAB 3: SMART ADD CV (GEMINI 3.8 AI MULTIMODAL PARSING PDF/JPG/PNG) */}
      {activeSubTab === 'smart-cv' && (
        <SmartAddCvSection
          onToast={onToast}
          onSaved={() => {
            fetchTalents();
            handleSubTabChange('talents');
          }}
        />
      )}
    </section>
  );
}

function AdminCompanies({
  adminId,
  adminEmail,
  onToast,
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
}) {
  // Sub-tab selection: 'companies' = Daftar Perusahaan, 'ads' = Katalog Iklan Loker, 'smart-add' = Smart Add Iklan (AI)
  const [activeSubTab, setActiveSubTab] = useState<'companies' | 'ads' | 'smart-add'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('view') === 'smart-add' || p.get('sub') === 'smart-add') return 'smart-add';
      if (p.get('view') === 'iklan' || p.get('sub') === 'iklan') return 'ads';
    }
    return 'companies';
  });

  const handleSubTabChange = (tab: 'companies' | 'ads' | 'smart-add') => {
    setActiveSubTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'companies') {
        url.searchParams.delete('view');
        url.searchParams.delete('sub');
      } else if (tab === 'ads') {
        url.searchParams.set('view', 'iklan');
      } else if (tab === 'smart-add') {
        url.searchParams.set('view', 'smart-add');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Shared Job ads catalog hook
  const { jobAds, setJobAds, jobAdsLoading, fetchJobAds } = useJobAdsCatalog(onToast);

  // Companies Directory State
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CompanyWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  // Fetch Companies & compute stats
  const fetchCompanies = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      onToastRef.current('error', `Gagal memuat perusahaan: ${error.message}`);
      setLoading(false);
      return;
    }

    const companies = (data || []) as Company[];
    const ownerIds = companies.map((item) => item.user_id);
    const companyIds = companies.map((item) => item.id);

    const [ownerRes, jobsRes] = await Promise.all([
      ownerIds.length
        ? supabase.from('users_meta').select('id, email').in('id', ownerIds)
        : Promise.resolve({ data: [], error: null } as { data: Array<{ id: string; email: string }>; error: null }),
      companyIds.length
        ? supabase.from('job_listings').select('company_id, status').in('company_id', companyIds)
        : Promise.resolve({ data: [], error: null } as { data: Array<{ company_id: string; status: string }>; error: null }),
    ]);

    const ownerMap = new Map((ownerRes.data || []).map((owner) => [owner.id, owner.email]));
    const activeMap = new Map<string, number>();
    const totalJobsMap = new Map<string, number>();

    (jobsRes.data || []).forEach((item) => {
      totalJobsMap.set(item.company_id, (totalJobsMap.get(item.company_id) || 0) + 1);
      if (item.status === 'active') {
        activeMap.set(item.company_id, (activeMap.get(item.company_id) || 0) + 1);
      }
    });

    setRows(
      companies.map((company) => ({
        ...company,
        owner_email: ownerMap.get(company.user_id),
        active_jobs: activeMap.get(company.id) || 0,
        total_jobs: totalJobsMap.get(company.id) || 0,
      }))
    );
    setTotal(count || 0);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const refreshAll = () => {
    fetchCompanies();
    fetchJobAds();
  };

  // Company verification toggle
  async function toggleVerify(company: Company & { owner_email?: string }) {
    if (!supabase) return;
    const next = !company.verified;
    const { error } = await supabase.from('companies').update({ verified: next }).eq('id', company.id);
    if (error) {
      onToast('error', `Gagal update verifikasi: ${error.message}`);
      return;
    }
    await logAdminAction(
      adminId,
      adminEmail,
      next ? 'verify_company' : 'unverify_company',
      'company',
      company.id,
      `${next ? 'Verify' : 'Unverify'}: ${company.name}`
    );
    setRows((prev) => prev.map((item) => (item.id === company.id ? { ...item, verified: next } : item)));
    onToast('success', next ? 'Perusahaan berhasil diverifikasi.' : 'Verifikasi perusahaan dicabut.');
  }

  // Delete company
  async function deleteCompany(company: Company) {
    if (!supabase) return;
    if (!window.confirm(`Hapus perusahaan "${company.name}"? Semua lowongan terkait perusahaan ini juga akan terhapus.`)) return;
    const { error } = await supabase.from('companies').delete().eq('id', company.id);
    if (error) {
      onToast('error', `Gagal hapus perusahaan: ${error.message}`);
      return;
    }
    await logAdminAction(adminId, adminEmail, 'delete_company', 'company', company.id, `Delete company ${company.name}`);
    setRows((prev) => prev.filter((item) => item.id !== company.id));
    setJobAds((prev) => prev.filter((j) => j.company_id !== company.id));
    onToast('success', 'Perusahaan dan seluruh data terkait berhasil dihapus.');
  }

  const handleViewCompanyAds = (companyId: string) => {
    setSelectedCompanyId(companyId);
    handleSubTabChange('ads');
  };

  const companyStats = useMemo(() => {
    const totalCompanies = rows.length;
    const verified = rows.filter((c) => c.verified).length;
    const pending = rows.filter((c) => !c.verified).length;
    const active = rows.filter((c) => (c.active_jobs || 0) > 0).length;
    const totalAds = jobAds.length;
    return { totalCompanies, verified, pending, active, totalAds };
  }, [rows, jobAds]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const match =
        !query ||
        row.name.toLowerCase().includes(query) ||
        (row.city || '').toLowerCase().includes(query) ||
        (row.owner_email || '').toLowerCase().includes(query);
      const verifiedMatch =
        verifiedFilter === 'all' || (verifiedFilter === 'verified' ? row.verified : !row.verified);
      return match && verifiedMatch;
    });
  }, [rows, search, verifiedFilter]);

  return (
    <section className="space-y-5">
      {/* Sub-Feature Tab Navigator: Data Perusahaan vs Katalog Iklan Loker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/90 p-2.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-white/5 overflow-x-auto max-w-full">
          <button
            onClick={() => handleSubTabChange('companies')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'companies'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Data Perusahaan</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeSubTab === 'companies' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {rows.length}
            </span>
          </button>

          <button
            onClick={() => handleSubTabChange('ads')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'ads'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Katalog Iklan Loker</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeSubTab === 'ads' ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-300'
              }`}
            >
              {jobAds.length}
            </span>
          </button>

          <button
            onClick={() => handleSubTabChange('smart-add')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'smart-add'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/25 ring-1 ring-white/20'
                : 'text-amber-400 hover:text-white hover:bg-white/5 border border-amber-500/30 bg-amber-500/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Smart Add Iklan</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                activeSubTab === 'smart-add'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
              }`}
            >
              Gemini 3.8
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="Segarkan data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || jobAdsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DAFTAR PERUSAHAAN (DIRECTORY & LEGALITAS) */}
      {activeSubTab === 'companies' && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatMini title="Total Perusahaan" value={companyStats.totalCompanies} />
            <StatMini title="Verified" value={companyStats.verified} />
            <div
              onClick={() => handleSubTabChange('ads')}
              className="cursor-pointer rounded-xl border border-cyan-500/20 bg-slate-900 p-4 transition hover:border-cyan-500/50 hover:bg-slate-800/80 group"
              title="Klik untuk membuka Katalog Iklan Loker"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-cyan-400 font-semibold flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" /> Total Iklan Loker
                </p>
                <ChevronRight className="w-4 h-4 text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="mt-1 text-2xl font-bold text-white group-hover:text-cyan-300 transition">
                {companyStats.totalAds.toLocaleString('id-ID')}
              </p>
            </div>
            <StatMini title="Perusahaan Aktif (Punya Iklan)" value={companyStats.active} />
          </div>

          {/* Filter Bar */}
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama perusahaan / kota / email owner..."
                  className="w-full rounded-lg border border-white/10 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={verifiedFilter}
                onChange={(e) => {
                  setPage(1);
                  setVerifiedFilter(e.target.value as 'all' | 'verified' | 'pending');
                }}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Status Verifikasi</option>
                <option value="verified">Verified Saja</option>
                <option value="pending">Pending Saja</option>
              </select>
            </div>
          </div>

          {/* Companies Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900">
            {loading ? (
              <div className="space-y-3 p-4">
                <SkeletonBlock className="h-10" />
                <SkeletonBlock className="h-10" />
                <SkeletonBlock className="h-10" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Logo</th>
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left">Industri</th>
                    <th className="px-4 py-3 text-left">Kota</th>
                    <th className="px-4 py-3 text-left">Owner Email</th>
                    <th className="px-4 py-3 text-left">Karyawan</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Iklan Loker</th>
                    <th className="px-4 py-3 text-left">Dibuat</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada perusahaan yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((company, idx) => (
                      <tr
                        key={company.id}
                        className={`border-b border-white/5 transition-colors ${
                          idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                        }`}
                      >
                        <td className="px-4 py-3">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={company.name}
                              className="h-8 w-8 rounded-lg object-cover border border-white/10"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300">
                              {company.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{company.name}</span>
                            {company.verified && (
                              <BadgeCheck className="h-4 w-4 text-cyan-400 shrink-0" title="Verified" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{company.industry || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{company.city || '-'}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{company.owner_email || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{company.employee_count || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              company.verified
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {company.verified ? '✓ Verified' : '⌛ Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleViewCompanyAds(company.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                            title="Buka katalog iklan perusahaan ini"
                          >
                            <Megaphone className="w-3 h-3" />
                            <span>{company.total_jobs || 0} Loker</span>
                            {(company.active_jobs || 0) > 0 && (
                              <span className="rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] px-1 font-bold">
                                {company.active_jobs} Aktif
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(company.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <button
                              onClick={() => toggleVerify(company)}
                              className={`rounded-md border px-2 py-1 transition ${
                                company.verified
                                  ? 'border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10'
                                  : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                              }`}
                            >
                              {company.verified ? 'Cabut' : 'Verifikasi'}
                            </button>
                            <button
                              onClick={() => handleViewCompanyAds(company.id)}
                              className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-300 hover:bg-cyan-500/20 transition flex items-center gap-1"
                              title="Lihat katalog iklan perusahaan ini"
                            >
                              <Megaphone className="w-3 h-3" />
                              <span>Iklan</span>
                            </button>
                            <button
                              onClick={() =>
                                window.alert(
                                  `Nama Perusahaan: ${company.name}\nIndustri: ${company.industry || '-'}\nKota: ${company.city || '-'}\nWebsite: ${company.website || '-'}\nJumlah Karyawan: ${company.employee_count || '-'}\nDeskripsi:\n${company.description || '-'}`
                                )
                              }
                              className="rounded-md border border-white/10 px-2 py-1 text-slate-300 hover:bg-white/10 transition"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => deleteCompany(company)}
                              className="rounded-md border border-red-400/30 px-2 py-1 text-red-300 hover:bg-red-500/10 transition"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <Pagination page={page} total={total} onChange={setPage} />
        </div>
      )}

      {/* SUB-TAB 2: KATALOG IKLAN LOKER PERUSAHAAN */}
      {activeSubTab === 'ads' && (
        <AdminJobAdsCatalogSection
          adminId={adminId}
          adminEmail={adminEmail}
          onToast={onToast}
          jobAds={jobAds}
          setJobAds={setJobAds}
          jobAdsLoading={jobAdsLoading}
          onRefreshJobAds={fetchJobAds}
          selectedCompanyId={selectedCompanyId}
          onSelectCompanyId={setSelectedCompanyId}
          registeredCompanies={rows}
        />
      )}

      {/* SUB-TAB 3: SMART ADD IKLAN (GEMINI 3.8 AI VISION & POST STRUCTURING) */}
      {activeSubTab === 'smart-add' && (
        <SmartAddJobSection
          adminId={adminId}
          adminEmail={adminEmail}
          onToast={onToast}
          onJobCreated={() => {
            fetchJobAds();
            fetchCompanies();
            handleSubTabChange('ads');
          }}
        />
      )}
    </section>
  );
}

type IntegrationProvider = {
  id: string;
  label: string;
  configured: boolean;
  endpoint: string;
  docsUrl: string;
  mode: string;
  note: string;
};

interface IntegratedJobItem {
  title: string;
  company: string;
  locations: string;
  salary: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency_code?: string;
  salary_type?: string;
  description: string;
  url: string;
  date: string;
  site?: string;
  source?: string;
  is_internal?: boolean;
  job_id?: string;
  contract_type?: string;
  work_hours?: string;
}

function LiveJobIntegrationsValidator({ onToast }: { onToast: (type: ToastType, message: string) => void }) {
  const [provider, setProvider] = useState<'all' | 'internal' | 'arbeitnow' | 'facebook-group'>('all');
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('Indonesia');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<IntegratedJobItem[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeJsonJob, setActiveJsonJob] = useState<IntegratedJobItem | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const fetchJobs = useCallback(
    async (selectedProvider = provider, kw = keyword, loc = location) => {
      setLoading(true);
      setError(null);
      const start = performance.now();
      try {
        const q = new URLSearchParams();
        q.set('provider', selectedProvider);
        if (kw.trim()) q.set('keywords', kw.trim());
        if (loc.trim()) q.set('location', loc.trim());
        const url = `/api/jobs?${q.toString()}`;

        const res = await fetch(url);
        const elapsed = Math.round(performance.now() - start);
        setLatency(elapsed);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const list: IntegratedJobItem[] = Array.isArray(data.jobs) ? data.jobs : [];
        setJobs(list);
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        setLatency(elapsed);
        const msg = err instanceof Error ? err.message : 'Gagal memuat lowongan dari provider.';
        setError(msg);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    },
    [provider, keyword, location]
  );

  useEffect(() => {
    void fetchJobs(provider, keyword, location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleCopyJson = async (job: IntegratedJobItem) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(job, null, 2));
      setCopiedJson(true);
      onToast('success', 'Schema JSON loker berhasil disalin!');
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      onToast('error', 'Gagal menyalin JSON.');
    }
  };

  const handleReset = () => {
    setKeyword('');
    setLocation('Indonesia');
    void fetchJobs(provider, '', 'Indonesia');
  };

  const cleanDescription = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const providerTabs = [
    { id: 'all', label: 'Semua Feed (Unified)', desc: 'Agregator terpadu seluruh sumber', icon: Globe },
    { id: 'facebook-group', label: 'Facebook Group (Vision AI)', desc: 'Loker terekstraksi oleh AI Scraper', icon: Database },
    { id: 'internal', label: 'Mitra Internal LOXER', desc: 'Loker verified employer LOXER', icon: Building2 },
    { id: 'arbeitnow', label: 'Arbeitnow Global', desc: 'Remote & global tech jobs', icon: Briefcase },
  ] as const;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <h3 className="text-lg font-bold text-white">Validasi Tampilan Loker Terintegrasi</h3>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              Live Feed Inspector
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Validasi tampilan kartu loker, kelengkapan metadata (gaji, lokasi, nama perusahaan), dan fungsionalitas link pelamar secara real-time.
          </p>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          <div className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-slate-300">
            <span className="text-slate-500">Status: </span>
            <span className={error ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {loading ? 'Memuat...' : error ? 'Error' : 'Feed Aktif & Valid'}
            </span>
          </div>
          {latency !== null && (
            <div className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-cyan-300">
              <span className="text-slate-500">Latency: </span>
              {latency}ms
            </div>
          )}
          <div className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-purple-300">
            <span className="text-slate-500">Total: </span>
            {jobs.length} Loker
          </div>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {providerTabs.map((tab) => {
          const isActive = provider === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProvider(tab.id)}
              className={classNames(
                'flex flex-col items-start p-3 rounded-xl border text-left transition cursor-pointer',
                isActive
                  ? 'border-cyan-400/50 bg-cyan-500/10 text-white shadow-lg'
                  : 'border-white/5 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <TabIcon className={classNames('h-3.5 w-3.5', isActive ? 'text-cyan-400' : 'text-slate-400')} />
                <span className={classNames('text-xs font-bold', isActive ? 'text-cyan-300' : 'text-slate-300')}>
                  {tab.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 line-clamp-1">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 rounded-xl bg-slate-950/80 p-3 border border-white/10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari kata kunci loker (cth: Staff, Kasir, Engineer, Admin)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void fetchJobs(provider, keyword, location)}
            className="w-full rounded-lg border border-white/10 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="relative w-full sm:w-60">
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Lokasi (cth: Indonesia, Bandung, Cimahi)..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void fetchJobs(provider, keyword, location)}
            className="w-full rounded-lg border border-white/10 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => void fetchJobs(provider, keyword, location)}
            disabled={loading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={classNames('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span>{loading ? 'Memvalidasi...' : 'Uji Validasi'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-bold">Gagal mengambil feed loker:</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Job Cards View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-slate-800/40 p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-700/60 rounded w-2/3" />
              <div className="h-3 bg-slate-700/40 rounded w-1/2" />
              <div className="h-6 bg-slate-700/30 rounded w-full" />
              <div className="h-10 bg-slate-700/20 rounded w-full" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center">
          <Briefcase className="h-8 w-8 mx-auto text-slate-500 mb-2" />
          <p className="text-sm font-semibold text-white">Tidak ada lowongan yang sesuai kriteria</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Coba kosongkan kata kunci atau gunakan lokasi yang lebih luas seperti "Indonesia" untuk memuat seluruh feed loker.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 transition cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((job, idx) => {
            const isInternal = job.is_internal || job.site === 'LOXER Mitra' || (job.source || '').includes('LOXER');
            const isArbeit = (job.site || '').toLowerCase().includes('arbeitnow') || (job.source || '').toLowerCase().includes('arbeitnow');
            const isFb = (job.site || '').toLowerCase().includes('facebook') || (job.source || '').toLowerCase().includes('fb');

            return (
              <div
                key={job.job_id || job.url || idx}
                className="group rounded-xl border border-white/10 bg-slate-800/80 hover:border-cyan-400/50 hover:bg-slate-800 transition p-4 flex flex-col justify-between shadow-sm hover:shadow-cyan-500/5 hover:shadow-xl"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-300 truncate">
                          {job.company || 'Perusahaan Terdaftar'}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-white group-hover:text-cyan-200 transition line-clamp-2">
                        {job.title}
                      </h4>
                    </div>

                    {/* Source Tag */}
                    <span
                      className={classNames(
                        'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border',
                        isInternal
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : isArbeit
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-slate-700/50 text-slate-300 border-white/10'
                      )}
                    >
                      {isInternal ? 'Mitra LOXER' : isFb ? 'Facebook Group AI' : isArbeit ? 'Arbeitnow' : job.site || 'Aggregator'}
                    </span>
                  </div>

                  {/* Metadata Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                    {/* Location */}
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/90 border border-white/5 px-2 py-1 text-[11px] text-slate-300">
                      <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span className="truncate max-w-[140px]">{job.locations || 'Indonesia'}</span>
                    </span>

                    {/* Salary */}
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                      <Banknote className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[160px]">
                        {job.salary && !job.salary.includes('US$0') && !job.salary.includes('$0')
                          ? job.salary
                          : 'Gaji Kompetitif'}
                      </span>
                    </span>

                    {/* Contract / Hours */}
                    {(job.contract_type || job.work_hours) && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/20 px-2 py-1 text-[11px] text-purple-300">
                        <Clock className="h-3 w-3 text-purple-400 shrink-0" />
                        <span>
                          {job.work_hours === 'f'
                            ? 'Penuh Waktu'
                            : job.work_hours === 'p'
                            ? 'Paruh Waktu'
                            : job.contract_type === 'c'
                            ? 'Kontrak'
                            : 'Reguler'}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Description Preview */}
                  <p className="mt-3 text-xs leading-relaxed text-slate-400 line-clamp-3">
                    {cleanDescription(job.description) || 'Tidak ada ringkasan deskripsi.'}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="mt-4 border-t border-white/10 pt-3">
                  {/* Schema Validation Checklist Pill */}
                  <div className="mb-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="h-3 w-3" />
                      Validasi Schema Sukses
                    </span>
                    <span className="text-slate-500">
                      {job.date ? new Date(job.date).toLocaleDateString('id-ID') : 'Aktif'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveJsonJob(job)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-900 transition cursor-pointer"
                      title="Inspeksi data schema JSON mentah"
                    >
                      <Code className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Schema JSON</span>
                    </button>

                    {job.url && job.url !== '#' ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 transition"
                      >
                        <span>Lihat Loker</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Link internal</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw JSON Inspector Modal */}
      {activeJsonJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-slate-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Inspeksi Schema JSON Loker</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveJsonJob(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900 p-3 max-h-[380px] overflow-auto font-mono text-xs text-cyan-200 no-scrollbar">
              <pre>{JSON.stringify(activeJsonJob, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Data divalidasi dan dinormalisasi untuk interface pencari kerja (Seeker).
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyJson(activeJsonJob)}
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition cursor-pointer"
                >
                  {copiedJson ? 'Tersalin!' : 'Salin JSON'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveJsonJob(null)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminIntegrations({ onToast }: { onToast: (type: ToastType, message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [publicIp, setPublicIp] = useState('');
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      setLoading(true);

      try {
        const response = await fetch('/api/integrations-status');
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || 'Gagal memuat status integrasi.');
        }

        if (!active) return;

        setPublicIp(payload.publicIp || '');
        setProviders(Array.isArray(payload.integrations) ? payload.integrations : []);
      } catch (error) {
        if (!active) return;
        onToast('error', error instanceof Error ? error.message : 'Status integrasi belum bisa dimuat.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadStatus();

    return () => {
      active = false;
    };
  }, [onToast]);

  async function copyPublicIp() {
    if (!publicIp) {
      onToast('info', 'IP publik belum tersedia.');
      return;
    }

    try {
      await navigator.clipboard.writeText(publicIp);
      onToast('success', 'IP publik server berhasil disalin.');
    } catch {
      onToast('error', 'Gagal menyalin IP publik.');
    }
  }

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latency: number; count: number; message: string }>>({});

  async function handleTestProvider(provider: IntegrationProvider) {
    setTestingId(provider.id);
    const start = performance.now();
    try {
      let url = `/api/jobs?provider=${provider.id}`;
      if (provider.id === 'internal') {
        url = `/api/jobs?provider=internal`;
      } else if (provider.id === 'arbeitnow') {
        url = `/api/jobs?provider=arbeitnow`;
      }
      const res = await fetch(url);
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const count = Array.isArray(data.jobs) ? data.jobs.length : (data.totalCount || 0);
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          ok: true,
          latency,
          count,
          message: `Berhasil (${count} lowongan ditemukan, respon ${latency}ms)`,
        },
      }));
      onToast('success', `Tes koneksi ${provider.label} sukses (${latency}ms)!`);
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const msg = err instanceof Error ? err.message : 'Koneksi gagal';
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          ok: false,
          latency,
          count: 0,
          message: msg,
        },
      }));
      onToast('error', `Tes ${provider.label} gagal: ${msg}`);
    } finally {
      setTestingId(null);
    }
  }

  const readyProviders = providers.filter((provider) => provider.configured).length;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-5 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Hub Integrasi</p>
          <h2 className="mt-2 text-2xl font-black text-white">Kelola semua sumber lowongan dari satu tempat</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Halaman ini dipakai untuk memantau koneksi API, mencatat endpoint proxy LOXER, dan menyiapkan provider seperti
            Mitra LOXER, Careerjet, dan Arbeitnow.
          </p>
        </div>

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">IP Publik Server</p>
          <p className="mt-3 text-2xl font-black text-white">{publicIp || (loading ? 'Memuat...' : 'Belum tersedia')}</p>
          <p className="mt-2 text-sm text-cyan-100/80">Gunakan IP ini untuk whitelist provider yang mewajibkan server IP.</p>
          <button
            onClick={copyPublicIp}
            className="mt-4 rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10 cursor-pointer"
          >
            Salin IP
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatMini title="Total Provider" value={providers.length} />
        <StatMini title="Provider Aktif" value={readyProviders} />
        <StatMini title="Perlu Setup" value={Math.max(providers.length - readyProviders, 0)} />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Daftar Integrasi API</p>
            <p className="text-xs text-slate-500">Pantau status konfigurasi, endpoint proxy, dan uji koneksi secara langsung.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-48" />)
            : providers.map((provider) => {
                const test = testResults[provider.id];
                const isTesting = testingId === provider.id;

                return (
                  <div key={provider.id} className="rounded-xl border border-white/10 bg-slate-800/70 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold text-white">{provider.label}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{provider.mode}</p>
                        </div>
                        <span
                          className={classNames(
                            'rounded-full px-2.5 py-1 text-xs font-semibold',
                            provider.configured
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          )}
                        >
                          {provider.configured ? 'Configured' : 'Perlu Setup'}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Endpoint LOXER</p>
                          <p className="mt-1 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 font-mono text-xs text-cyan-200">
                            {provider.endpoint}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Catatan</p>
                          <p className="mt-1 leading-relaxed text-slate-300">{provider.note}</p>
                        </div>
                      </div>

                      {test && (
                        <div
                          className={classNames(
                            'mt-3 rounded-lg border px-3 py-2 text-xs font-mono',
                            test.ok
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-red-500/30 bg-red-500/10 text-red-300'
                          )}
                        >
                          {test.message}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() => handleTestProvider(provider)}
                        disabled={isTesting}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isTesting ? 'Menguji...' : 'Uji Koneksi API'}
                      </button>

                      {provider.docsUrl && provider.docsUrl !== '#' && (
                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5 transition"
                        >
                          Dokumentasi
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Validasi Tampilan Loker Terintegrasi (Live Feed & Inspector) */}
      <LiveJobIntegrationsValidator onToast={onToast} />

      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-white">Checklist Operasional Integrasi</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Mitra Internal LOXER</p>
            <p className="mt-2 text-sm text-slate-300">
              1. <strong>Mitra LOXER:</strong> Mengambil postingan aktif langsung dari database employer terverifikasi.
            </p>
            <p className="mt-1 text-sm text-slate-300">
              2. <strong>Sinkronisasi Real-time:</strong> Data terhubung langsung dengan sistem rekrutmen internal LOXER.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Careerjet & Feed Publik</p>
            <p className="mt-2 text-sm text-slate-300">
              1. <strong>Arbeitnow:</strong> Feed publik aktif tanpa perlu API key, menyajikan ribuan remote & tech jobs global.
            </p>
            <p className="mt-1 text-sm text-slate-300">
              2. <strong>Careerjet:</strong> Pasang <code>CAREERJET_API_KEY</code> dan daftarkan IP server di dashboard partner.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Semua sumber terintegrasi otomatis di halaman pencarian seeker LOXER.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminAuditLogs() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!supabase) return;
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false });

      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (targetFilter !== 'all') query = query.eq('target_type', targetFilter);
      if (adminFilter.trim()) query = query.ilike('admin_email', `%${adminFilter.trim()}%`);
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

      const { data, count, error } = await query.range(from, to);
      if (error) {
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setRows((data || []) as AuditLog[]);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchLogs();
  }, [page, actionFilter, targetFilter, adminFilter, dateFrom, dateTo]);

  const hasActiveFilters = actionFilter !== 'all' || targetFilter !== 'all' || adminFilter || dateFrom || dateTo;

  return (
    <section className="space-y-4">
      {/* Filter Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Filter className="w-4 h-4" />
            </span>
            <p className="text-sm font-semibold text-white">Filter Audit Log</p>
            <span className="text-xs text-slate-500">({total} total record)</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setActionFilter('all');
                setTargetFilter('all');
                setAdminFilter('');
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Aksi Admin</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Semua Aksi</option>
              {Object.keys(ACTION_COLORS).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Target Entitas</label>
            <select
              value={targetFilter}
              onChange={(e) => {
                setTargetFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Semua Target</option>
              <option value="user">User</option>
              <option value="job">Job</option>
              <option value="company">Company</option>
              <option value="application">Application</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Email Admin</label>
            <input
              value={adminFilter}
              onChange={(e) => {
                setAdminFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Cari email admin..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl scrollbar-thin scrollbar-thumb-slate-700">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
            <p className="font-semibold text-slate-300 text-sm">Tidak ada riwayat audit log yang cocok</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Coba sesuaikan filter atau reset untuk melihat semua riwayat aktivitas.'
                : 'Aktivitas administratif seperti penyesuaian role, moderasi, atau perubahan entitas akan otomatis tercatat di sini.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left w-44">Waktu</th>
                <th className="px-4 py-3 text-left w-52">Admin</th>
                <th className="px-4 py-3 text-left w-44">Aksi</th>
                <th className="px-4 py-3 text-left w-32">Target</th>
                <th className="px-4 py-3 text-left">Detail Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`text-slate-300 transition-colors ${
                    idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                  }`}
                >
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap font-mono">
                    {new Date(row.created_at).toLocaleString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-200 truncate max-w-[200px]" title={row.admin_email || row.admin_id}>
                    {row.admin_email || row.admin_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className={classNames('inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold border border-current/20', ACTION_COLORS[row.action] || 'bg-slate-500/20 text-slate-200')}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium">
                      {row.target_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono truncate max-w-[280px]" title={row.detail || '-'}>
                    {row.detail || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} total={total} onChange={setPage} />
    </section>
  );
}
