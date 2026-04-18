import { useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, Building2, FileText, RefreshCw, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import GodModeLayout from './GodModeLayout';
import { supabase } from '../../lib/supabase';
import { formatDayLabel } from '../../lib/adminUtils';

interface Snapshot {
  id?: string;
  snapshot_date: string;
  total_users: number;
  new_users: number;
  active_users: number;
  total_jobs: number;
  new_jobs: number;
  total_apps: number;
  new_apps: number;
  conversion_rate: number;
  avg_time_to_hire: number;
  platform_score: number;
}

interface MiniChartPoint {
  date: string;
  users: number;
  jobs: number;
  apps: number;
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </div>
        <div className={`rounded-xl p-3 ${tone}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function HealthRing({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (normalized / 100) * circumference;
  const colorClass =
    normalized >= 75 ? 'text-emerald-400' : normalized >= 50 ? 'text-amber-400' : 'text-rose-400';
  const strokeClass =
    normalized >= 75 ? 'stroke-emerald-400' : normalized >= 50 ? 'stroke-amber-400' : 'stroke-rose-400';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <p className="text-sm text-slate-400">Platform Health Score</p>
      <div className="mt-6 flex items-center justify-center">
        <div className="relative h-32 w-32">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={strokeClass}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-semibold ${colorClass}`}>{normalized}</span>
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-3">
          <p className="text-slate-500">Users</p>
          <p className="mt-1 text-white">{normalized >= 40 ? 'Healthy' : 'Low'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-3">
          <p className="text-slate-500">Jobs</p>
          <p className="mt-1 text-white">{normalized >= 55 ? 'Active' : 'Watch'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-3">
          <p className="text-slate-500">Apps</p>
          <p className="mt-1 text-white">{normalized >= 65 ? 'Good' : 'Thin'}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdvancedAnalytics() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<MiniChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadData() {
    if (!supabase) {
      setErrorMessage('Supabase belum dikonfigurasi.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const latestSnapshotPromise = supabase
      .from('analytics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const historyPromise = supabase
      .from('analytics_snapshots')
      .select('snapshot_date, total_users, total_jobs, total_apps')
      .order('snapshot_date', { ascending: true })
      .limit(14);

    const countsPromise = Promise.all([
      supabase.from('users_meta').select('id', { count: 'exact', head: true }),
      supabase.from('job_listings').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
    ]);

    const [latestSnapshotRes, historyRes, counts] = await Promise.all([latestSnapshotPromise, historyPromise, countsPromise]);

    if (latestSnapshotRes.error && latestSnapshotRes.error.code !== 'PGRST116' && latestSnapshotRes.error.code !== '42P01') {
      setErrorMessage(latestSnapshotRes.error.message);
    }

    if (historyRes.error && historyRes.error.code !== '42P01') {
      setErrorMessage(historyRes.error.message);
    }

    const [usersRes, jobsRes, appsRes] = counts;
    const fallbackUsers = usersRes.count || 0;
    const fallbackJobs = jobsRes.count || 0;
    const fallbackApps = appsRes.count || 0;

    if (latestSnapshotRes.data) {
      const latest = latestSnapshotRes.data as Snapshot;
      setSnapshot({
        ...latest,
        conversion_rate: Number(latest.conversion_rate || 0),
        avg_time_to_hire: Number(latest.avg_time_to_hire || 0),
        platform_score: Number(latest.platform_score || 0),
      });
    } else {
      const platformScore = Math.min(100, Math.round((fallbackUsers * 2 + fallbackJobs * 3 + fallbackApps) / 10));
      setSnapshot({
        snapshot_date: new Date().toISOString().slice(0, 10),
        total_users: fallbackUsers,
        new_users: 0,
        active_users: Math.round(fallbackUsers * 0.55),
        total_jobs: fallbackJobs,
        new_jobs: 0,
        total_apps: fallbackApps,
        new_apps: 0,
        conversion_rate: fallbackUsers ? Math.round((fallbackApps / Math.max(fallbackUsers, 1)) * 100) : 0,
        avg_time_to_hire: 0,
        platform_score: platformScore,
      });
    }

    if (historyRes.data?.length) {
      setHistory(
        historyRes.data.map((item) => ({
          date: formatDayLabel(item.snapshot_date),
          users: item.total_users || 0,
          jobs: item.total_jobs || 0,
          apps: item.total_apps || 0,
        }))
      );
    } else {
      setHistory([
        { date: 'Hari ini', users: fallbackUsers, jobs: fallbackJobs, apps: fallbackApps },
      ]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const funnelSteps = useMemo(() => {
    if (!snapshot) return [];
    const totalUsers = Math.max(snapshot.total_users, 1);
    const activeUsers = snapshot.active_users || Math.round(snapshot.total_users * 0.55);
    const totalApps = snapshot.total_apps;
    const processedApps = Math.round(totalApps * 0.7);
    const hires = Math.round(totalApps * 0.15);

    return [
      { label: 'Total Users', value: snapshot.total_users, pct: 100, tone: 'bg-cyan-600' },
      { label: 'Active Users', value: activeUsers, pct: Math.max(5, Math.round((activeUsers / totalUsers) * 100)), tone: 'bg-sky-500' },
      { label: 'Pernah Melamar', value: totalApps, pct: Math.max(4, Math.round((totalApps / totalUsers) * 100)), tone: 'bg-violet-500' },
      { label: 'Lamaran Diproses', value: processedApps, pct: Math.max(3, Math.round((processedApps / totalUsers) * 100)), tone: 'bg-amber-500' },
      { label: 'Diterima', value: hires, pct: Math.max(2, Math.round((hires / totalUsers) * 100)), tone: 'bg-emerald-500' },
    ];
  }, [snapshot]);

  return (
    <GodModeLayout title="Advanced Analytics" description="Pantau conversion funnel, snapshot pertumbuhan, dan health score platform.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Live Metrics</p>
            <p className="mt-1 text-sm text-slate-400">
              {snapshot ? `Snapshot: ${snapshot.snapshot_date}` : 'Belum ada snapshot tersimpan'}
            </p>
          </div>
          <button
            onClick={() => {
              void loadData();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Data analytics lanjutan belum siap sepenuhnya: {errorMessage}
          </div>
        ) : null}

        {loading || !snapshot ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-10 text-center text-slate-400">
            Memuat analytics...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Users" value={snapshot.total_users} note={`${snapshot.new_users} user baru`} icon={Users} tone="bg-cyan-500/80" />
              <StatCard label="Total Lowongan" value={snapshot.total_jobs} note={`${snapshot.new_jobs} lowongan baru`} icon={Briefcase} tone="bg-violet-500/80" />
              <StatCard label="Total Lamaran" value={snapshot.total_apps} note={`${snapshot.new_apps} lamaran baru`} icon={FileText} tone="bg-emerald-500/80" />
              <StatCard label="Perusahaan" value={history.length ? history[history.length - 1].jobs : snapshot.total_jobs} note="Job flow aktif" icon={Building2} tone="bg-amber-500/80" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-300" />
                  <p className="text-sm text-slate-300">Growth Snapshot (14 hari terakhir)</p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="jobsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '14px',
                          color: '#fff',
                        }}
                      />
                      <Area type="monotone" dataKey="users" stroke="#22d3ee" fill="url(#usersFill)" strokeWidth={2} />
                      <Area type="monotone" dataKey="jobs" stroke="#8b5cf6" fill="url(#jobsFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <HealthRing score={Math.round(snapshot.platform_score || 0)} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-300">Conversion Funnel</p>
                <div className="mt-5 space-y-4">
                  {funnelSteps.map((step) => (
                    <div key={step.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span>{step.label}</span>
                        <span className="font-mono text-white">{step.value.toLocaleString()} ({step.pct}%)</span>
                      </div>
                      <div className="h-9 rounded-xl bg-white/5 p-1">
                        <div
                          className={`flex h-full items-center rounded-lg px-3 text-xs font-medium text-white ${step.tone}`}
                          style={{ width: `${Math.min(100, step.pct)}%` }}
                        >
                          {step.pct}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-300">Hiring Performance</p>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Avg Time to Hire</p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {snapshot.avg_time_to_hire ? `${snapshot.avg_time_to_hire} hari` : '-'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Conversion Rate</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{snapshot.conversion_rate}%</p>
                  </div>
                  <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
                    Gunakan tabel `analytics_snapshots` untuk daily rollup otomatis agar grafik ini semakin akurat.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </GodModeLayout>
  );
}
