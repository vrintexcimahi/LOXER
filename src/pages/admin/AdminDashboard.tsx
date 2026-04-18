import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Building,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Flag,
  Home,
  Link2,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  UserCheck,
  Users,
  X,
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
import { useAuth } from '../../contexts/useAuth';
import { formatDayLabel, formatRelativeTime, logAdminAction, toISODateOnly } from '../../lib/adminUtils';
import { isDefaultAdminEmail, normalizeComparableEmail } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { AdminStats, AdminUserRow, ApplicationStatus, AuditLog, ChartDataPoint, Company, JobListing, UserRole } from '../../lib/types';

type AdminTab = 'overview' | 'users' | 'jobs' | 'applications' | 'companies' | 'logs' | 'integrations';
type ToastType = 'success' | 'error' | 'info';

interface AdminDashboardProps {
  tab?: AdminTab;
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
  icon: ComponentType<{ className?: string }>;
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
  return 'Admin (Administrator)';
}

function normalizeRoleByEmail(email: string | undefined, role: UserRole): UserRole {
  if (isDefaultAdminEmail(email)) return 'admin';
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

export default function AdminDashboard({ tab = 'overview' }: AdminDashboardProps) {
  const { user, userMeta, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>(tab);
  const [toast, setToast] = useState<ToastState | null>(null);
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = usePersistentSidebar('loxer-admin-sidebar');
  const effectiveRole = user ? normalizeRoleByEmail(user.email || userMeta?.email, userMeta?.role || 'seeker') : null;
  const adminEmail = normalizeComparableEmail(userMeta?.email || user?.email) || userMeta?.email || user?.email || '';

  useEffect(() => setActiveTab(tab), [tab]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const menuItems: AdminMenuItem[] = useMemo(
    () => [
      { key: 'overview', label: 'Dashboard Admin', description: 'Pantau statistik dan kesehatan platform', href: '/admin/dashboard', icon: Home },
      { key: 'users', label: 'Manajemen Users', description: 'Kelola role, suspend, dan detail akun', href: '/admin/users', icon: Users },
      { key: 'jobs', label: 'Manajemen Jobs', description: 'Atur seluruh lowongan yang tayang', href: '/admin/jobs', icon: Briefcase },
      { key: 'applications', label: 'Pelamar', description: 'Monitor semua kandidat lintas perusahaan', href: '/admin/applications', icon: ListChecks },
      { key: 'companies', label: 'Perusahaan', description: 'Verifikasi profil dan aktivitas bisnis', href: '/admin/companies', icon: Building2 },
      { key: 'logs', label: 'Audit Log', description: 'Lihat semua jejak aksi admin', href: '/admin/logs', icon: FileText },
      { key: 'integrations', label: 'Integrasi API', description: 'Atur sumber lowongan dan status koneksi', href: '/admin/integrations', icon: Link2 },
      { key: 'analytics', label: 'Advanced Analytics', description: 'Funnel, growth, dan health score', href: '/admin/analytics', icon: BarChart3 },
      { key: 'flags', label: 'Feature Flags', description: 'Toggle fitur tanpa redeploy', href: '/admin/flags', icon: Flag },
      { key: 'moderation', label: 'Moderation Queue', description: 'Review konten dan AI scoring', href: '/admin/moderation', icon: AlertTriangle },
      { key: 'broadcast', label: 'Broadcast System', description: 'Kirim notifikasi ke segmen user', href: '/admin/broadcast', icon: Megaphone },
      { key: 'security', label: 'Security Center', description: 'IP block, session, dan alerts', href: '/admin/security', icon: Shield },
    ],
    []
  );

  const showToast = (type: ToastType, message: string) => setToast({ type, message });
  const handleSignOut = async () => {
    closeMobile();
    await signOut();
    window.location.assign('/');
  };

  if (!user || effectiveRole !== 'admin') {
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
      : activeTab === 'users'
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
            'fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-slate-900 transition-all duration-300',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full',
            isCollapsed ? 'lg:w-20' : 'lg:w-64',
            'lg:translate-x-0'
          )}
        >
          <div className={classNames('flex h-16 items-center border-b border-white/10', isCollapsed ? 'justify-center px-3' : 'gap-2 px-5')}>
            <div className="rounded-lg bg-cyan-500/20 p-2">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
            </div>
            <BrandText className={classNames('text-lg font-black', isCollapsed ? 'lg:hidden' : '')} />
            <button onClick={closeMobile} className="ml-auto rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === window.location.pathname || item.key === activeTab;
              return (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={closeMobile}
                  title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                  className={classNames(
                    'mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-400'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    isCollapsed ? 'lg:justify-center lg:px-2' : ''
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <div className={classNames('min-w-0', isCollapsed ? 'lg:hidden' : '')}>
                    <p className={classNames('truncate font-semibold', isActive ? 'text-white' : 'text-slate-200')}>
                      {item.label}
                    </p>
                    <p className={classNames('truncate text-[11px]', isActive ? 'text-cyan-200/90' : 'text-slate-500')}>
                      {item.description}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </aside>

        <div className={classNames('flex w-full flex-col transition-all duration-300', isCollapsed ? 'lg:pl-20' : 'lg:pl-64')}>
          <header className="sticky top-0 z-30 border-b border-white/10 gradient-sidebar px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (window.innerWidth >= 1024) {
                      toggleCollapsed();
                      return;
                    }
                    toggleMobile();
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950/35 p-2 text-slate-100 transition hover:bg-white/10 hover:text-cyan-200"
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
                <div>
                  <p className="text-xs uppercase tracking-wider text-cyan-300">Admin / {tabTitle}</p>
                  <p className="text-sm font-semibold text-slate-100">Pusat kendali data dan monitoring LOXER</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle compact />
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
                  {roleLabel(effectiveRole || 'admin')}
                </span>
                <NotificationBell variant="dark" compact />
                <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-slate-950/35 px-3 py-1.5 sm:flex">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
                    {(adminEmail || 'A')[0].toUpperCase()}
                  </div>
                  <p className="max-w-[180px] truncate text-xs text-slate-200">{adminEmail}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
                >
                  <span className="inline-flex items-center gap-1">
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6">
            {activeTab === 'overview' && (
              <AdminOverview adminId={user.id} adminEmail={adminEmail} onToast={showToast} />
            )}
            {activeTab === 'users' && (
              <AdminUsers adminId={user.id} adminEmail={adminEmail} onToast={showToast} />
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
    { label: 'Total User', value: stats.totalUsers, today: stats.newUsersToday, Icon: Users, color: 'text-cyan-400' },
    { label: 'Seeker', value: stats.totalSeekers, today: stats.newUsersToday, Icon: UserCheck, color: 'text-blue-400' },
    { label: 'Employer (Perusahaan)', value: stats.totalEmployers, today: stats.newUsersToday, Icon: Building2, color: 'text-purple-400' },
    { label: 'Total Lowongan', value: stats.totalJobs, today: stats.newJobsToday, Icon: Briefcase, color: 'text-emerald-400' },
    { label: 'Lowongan Aktif', value: stats.activeJobs, today: stats.newJobsToday, Icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Total Lamaran', value: stats.totalApplications, today: stats.newApplicationsToday, Icon: FileText, color: 'text-orange-400' },
    { label: 'Total Perusahaan', value: stats.totalCompanies, today: 0, Icon: Building, color: 'text-violet-400' },
    { label: 'Perusahaan Verified', value: stats.verifiedCompanies, today: 0, Icon: BadgeCheck, color: 'text-teal-400' },
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
                period === value ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, idx) => <SkeletonBlock key={idx} className="h-[122px]" />)
          : statCards.map(({ label, value, today, Icon, color }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-slate-800 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">{label}</span>
                  <Icon className={classNames('h-5 w-5', color)} />
                </div>
                <p className="text-3xl font-bold text-white">{value.toLocaleString('id-ID')}</p>
                <p className="mt-1 text-xs text-slate-500">+{today.toLocaleString('id-ID')} hari ini</p>
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
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/70 text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Aktivitas</th>
                    <th className="px-4 py-2 text-left">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((item, idx) => (
                    <tr key={`${item.type}-${idx}`} className="border-t border-white/5 text-slate-200">
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

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
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
                <tr key={row.id} className="border-b border-white/5 text-slate-300 hover:bg-white/5">
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

  useEffect(() => {
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
      if (error) {
        onToast('error', `Gagal memuat lowongan: ${error.message}`);
        setLoading(false);
        return;
      }

      setJobs((data || []) as Array<JobListing & { companies?: Company | Company[] }>);
      setTotal(count || 0);
      setLoading(false);
    };

    fetchJobs();
  }, [page, statusFilter, typeFilter, onToast]);

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

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
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
              {filteredJobs.map((job) => {
                const company = getFirstValue(job.companies);
                return (
                  <tr key={job.id} className="border-b border-white/5 text-slate-300 hover:bg-white/5">
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

function AdminApplications({
  adminId,
  adminEmail,
  onToast,
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  useEffect(() => {
    const fetchRows = async () => {
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
        onToast('error', `Gagal memuat lamaran: ${error.message}`);
        setLoading(false);
        return;
      }
      setRows((data || []) as Array<Record<string, unknown>>);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchRows();
  }, [page, statusFilter, dateFrom, dateTo, onToast]);

  async function forceUpdateStatus(row: Record<string, unknown>) {
    if (!supabase) return;
    const current = String(row.status || 'applied') as ApplicationStatus;
    const next = window.prompt(
      'Status baru (applied/reviewed/shortlisted/interview_scheduled/hired/rejected)',
      current
    ) as ApplicationStatus | null;
    if (!next || !['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'hired', 'rejected'].includes(next)) return;

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

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Monitoring Lamaran</p>
          <button
            onClick={exportCSV}
            className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200"
          >
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari seeker / lowongan / perusahaan"
              className="w-full rounded-lg border border-white/10 bg-slate-800 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as 'all' | ApplicationStatus);
            }}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="applied">Applied</option>
            <option value="reviewed">Reviewed</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview_scheduled">Interview</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
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
              {filteredRows.map((row, idx) => {
                const seeker = getFirstValue(
                  row.seeker_profiles as Record<string, unknown> | Array<Record<string, unknown>> | undefined
                );
                const job = getFirstValue(row.job_listings as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
                const company = getFirstValue(job?.companies as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
                return (
                  <tr key={String(row.id)} className="border-b border-white/5 text-slate-300 hover:bg-white/5">
                    <td className="px-4 py-3">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3">{String(seeker?.full_name || '-')}</td>
                    <td className="px-4 py-3 text-white">{String(job?.title || '-')}</td>
                    <td className="px-4 py-3">{String(company?.name || '-')}</td>
                    <td className="px-4 py-3">
                      <ApplicationStatusBadge status={String(row.status || 'applied') as ApplicationStatus} />
                    </td>
                    <td className="px-4 py-3">{new Date(String(row.applied_at || '')).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3">{new Date(String(row.updated_at || '')).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          onClick={() =>
                            window.alert(
                              `Lamaran ${String(row.id)}\nSeeker: ${String(seeker?.full_name || '-')}\nJob: ${String(job?.title || '-')}`
                            )
                          }
                          className="rounded-md border border-white/10 px-2 py-1"
                        >
                          Detail
                        </button>
                        <button onClick={() => forceUpdateStatus(row)} className="rounded-md border border-white/10 px-2 py-1">
                          Ubah Status
                        </button>
                        <button onClick={() => deleteApplication(row)} className="rounded-md border border-red-400/30 px-2 py-1 text-red-300">
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

function AdminCompanies({
  adminId,
  adminEmail,
  onToast,
}: {
  adminId: string;
  adminEmail: string;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<Company & { owner_email?: string; active_jobs?: number }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'pending'>('all');

  const stats = useMemo(() => {
    const totalCompanies = rows.length;
    const verified = rows.filter((c) => c.verified).length;
    const pending = rows.filter((c) => !c.verified).length;
    const active = rows.filter((c) => (c.active_jobs || 0) > 0).length;
    return { totalCompanies, verified, pending, active };
  }, [rows]);

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

  useEffect(() => {
    const fetchRows = async () => {
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
        onToast('error', `Gagal memuat perusahaan: ${error.message}`);
        setLoading(false);
        return;
      }

      const companies = (data || []) as Company[];
      const ownerIds = companies.map((item) => item.user_id);
      const companyIds = companies.map((item) => item.id);

      const [ownerRes, activeJobsRes] = await Promise.all([
        ownerIds.length
          ? supabase.from('users_meta').select('id, email').in('id', ownerIds)
          : Promise.resolve({ data: [], error: null } as { data: Array<{ id: string; email: string }>; error: null }),
        companyIds.length
          ? supabase.from('job_listings').select('company_id, status').in('company_id', companyIds)
          : Promise.resolve({ data: [], error: null } as { data: Array<{ company_id: string; status: string }>; error: null }),
      ]);

      const ownerMap = new Map((ownerRes.data || []).map((owner) => [owner.id, owner.email]));
      const activeMap = new Map<string, number>();
      (activeJobsRes.data || []).forEach((item) => {
        if (item.status === 'active') activeMap.set(item.company_id, (activeMap.get(item.company_id) || 0) + 1);
      });

      setRows(
        companies.map((company) => ({
          ...company,
          owner_email: ownerMap.get(company.user_id),
          active_jobs: activeMap.get(company.id) || 0,
        }))
      );
      setTotal(count || 0);
      setLoading(false);
    };

    fetchRows();
  }, [page, onToast]);

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

  async function deleteCompany(company: Company) {
    if (!supabase) return;
    if (!window.confirm(`Hapus perusahaan ${company.name}?`)) return;
    const { error } = await supabase.from('companies').delete().eq('id', company.id);
    if (error) {
      onToast('error', `Gagal hapus perusahaan: ${error.message}`);
      return;
    }
    await logAdminAction(adminId, adminEmail, 'delete_company', 'company', company.id, `Delete company ${company.name}`);
    setRows((prev) => prev.filter((item) => item.id !== company.id));
    onToast('success', 'Perusahaan berhasil dihapus.');
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatMini title="Total Perusahaan" value={stats.totalCompanies} />
        <StatMini title="Verified" value={stats.verified} />
        <StatMini title="Pending" value={stats.pending} />
        <StatMini title="Perusahaan Aktif" value={stats.active} />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama perusahaan/kota/owner"
              className="w-full rounded-lg border border-white/10 bg-slate-800 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value as typeof verifiedFilter)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
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
                <th className="px-4 py-3 text-left">Tgl Daftar</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((company) => (
                <tr key={company.id} className="border-b border-white/5 text-slate-300 hover:bg-white/5">
                  <td className="px-4 py-3">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded-full border border-white/20 object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs">N/A</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white">{company.name}</td>
                  <td className="px-4 py-3">{company.industry || '-'}</td>
                  <td className="px-4 py-3">{company.city || '-'}</td>
                  <td className="px-4 py-3">{company.owner_email || '-'}</td>
                  <td className="px-4 py-3">{company.employee_count || '-'}</td>
                  <td className="px-4 py-3">
                    {company.verified ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">✓ Verified</span>
                    ) : (
                      <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-300">⏳ Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{new Date(company.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button onClick={() => toggleVerify(company)} className="rounded-md border border-white/10 px-2 py-1">
                        {company.verified ? 'Cabut' : 'Verifikasi'}
                      </button>
                      <button
                        onClick={() =>
                          window.alert(
                            `Nama: ${company.name}\nIndustri: ${company.industry}\nWebsite: ${company.website || '-'}\nDeskripsi: ${
                              company.description || '-'
                            }`
                          )
                        }
                        className="rounded-md border border-white/10 px-2 py-1"
                      >
                        Detail
                      </button>
                      <button onClick={() => deleteCompany(company)} className="rounded-md border border-red-400/30 px-2 py-1 text-red-300">
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

function AdminIntegrations({ onToast }: { onToast: (type: ToastType, message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [publicIp, setPublicIp] = useState('');
  const [providers, setProviders] = useState<
    Array<{
      id: string;
      label: string;
      configured: boolean;
      endpoint: string;
      docsUrl: string;
      mode: string;
      note: string;
    }>
  >([]);

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

  const readyProviders = providers.filter((provider) => provider.configured).length;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900 p-5 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Hub Integrasi</p>
          <h2 className="mt-2 text-2xl font-black text-white">Kelola semua sumber lowongan dari satu tempat</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Halaman ini dipakai untuk memantau koneksi API, mencatat endpoint proxy LOXER, dan menyiapkan provider baru seperti
            Careerjet, Jooble, Arbeitnow, atau JSearch.
          </p>
        </div>

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">IP Publik Server</p>
          <p className="mt-3 text-2xl font-black text-white">{publicIp || (loading ? 'Memuat...' : 'Belum tersedia')}</p>
          <p className="mt-2 text-sm text-cyan-100/80">Gunakan IP ini untuk whitelist provider yang mewajibkan server IP.</p>
          <button
            onClick={copyPublicIp}
            className="mt-4 rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10"
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
            <p className="text-xs text-slate-500">Pantau status konfigurasi, endpoint proxy, dan dokumentasi provider.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-48" />)
            : providers.map((provider) => (
                <div key={provider.id} className="rounded-xl border border-white/10 bg-slate-800/70 p-5">
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
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"
                    >
                      Buka dokumentasi
                    </a>
                  </div>
                </div>
              ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-white">Checklist operasional</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Langkah Careerjet</p>
            <p className="mt-2 text-sm text-slate-300">
              1. Isi `CAREERJET_API_KEY` di environment server.
            </p>
            <p className="mt-1 text-sm text-slate-300">
              2. Whitelist IP publik server LOXER di dashboard Careerjet.
            </p>
            <p className="mt-1 text-sm text-slate-300">
              3. Uji endpoint proxy `/api/jobs` dari halaman seeker browse.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Rencana provider berikutnya</p>
            <p className="mt-2 text-sm text-slate-300">Jooble untuk agregator Indonesia, Arbeitnow untuk feed publik, dan JSearch untuk pencarian lintas negara.</p>
            <p className="mt-2 text-sm text-slate-400">Begitu proxy endpoint ditambahkan, halaman ini otomatis bisa jadi pusat status dan monitoringnya.</p>
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

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
        <p className="mb-3 text-sm font-semibold">Filter Audit Log</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Semua Aksi</option>
            {Object.keys(ACTION_COLORS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="all">Semua Target</option>
            <option value="user">user</option>
            <option value="job">job</option>
            <option value="company">company</option>
            <option value="application">application</option>
          </select>
          <input
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            placeholder="Filter email admin"
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
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
                <th className="px-4 py-3 text-left">Waktu</th>
                <th className="px-4 py-3 text-left">Admin</th>
                <th className="px-4 py-3 text-left">Aksi</th>
                <th className="px-4 py-3 text-left">Target</th>
                <th className="px-4 py-3 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 text-slate-300 hover:bg-white/5">
                  <td className="px-4 py-3">{new Date(row.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3">{row.admin_email || row.admin_id}</td>
                  <td className="px-4 py-3">
                    <span className={classNames('rounded-full px-2 py-1 text-xs', ACTION_COLORS[row.action] || 'bg-slate-500/20 text-slate-200')}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.target_type}</td>
                  <td className="px-4 py-3">{row.detail || '-'}</td>
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
