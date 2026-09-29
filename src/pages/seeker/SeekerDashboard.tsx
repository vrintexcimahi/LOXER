import { useCallback, useEffect, useState } from 'react';
import { Briefcase, TrendingUp, Clock, CheckCircle, ArrowRight, Bell } from 'lucide-react';
import SeekerLayout from '../../components/layout/SeekerLayout';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, SeekerProfile, JobListing, Notification, Company } from '../../lib/types';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

type JobWithCompany = JobListing & { companies?: Company | null };
type ApplicationWithJob = Application & { job_listings?: JobWithCompany | null };

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [, setProfile] = useState<SeekerProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [allApplicationStats, setAllApplicationStats] = useState<Pick<Application, 'id' | 'status'>[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobWithCompany[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (isSilent = false) => {
    if (!supabase || !user) return;

    if (!isSilent) {
      setLoading(true);
    }
    try {
      const [profileRes, jobRes, notifRes] = await Promise.all([
        supabase.from('seeker_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('job_listings').select('*, companies(*)').eq('status', 'active').order('created_at', { ascending: false }).limit(6),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      setProfile(profileRes.data);
      setNotifications(notifRes.data || []);
      setRecentJobs((jobRes.data || []) as JobWithCompany[]);

      if (profileRes.data) {
        const [allAppsRes, recentAppsRes] = await Promise.all([
          supabase.from('applications').select('id, status').eq('seeker_id', profileRes.data.id),
          supabase
            .from('applications')
            .select('*, job_listings(*, companies(*))')
            .eq('seeker_id', profileRes.data.id)
            .order('applied_at', { ascending: false })
            .limit(5),
        ]);
        setAllApplicationStats((allAppsRes.data || []) as Pick<Application, 'id' | 'status'>[]);
        setApplications((recentAppsRes.data || []) as ApplicationWithJob[]);
      } else {
        setAllApplicationStats([]);
        setApplications([]);
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) void loadData(false);
  }, [loadData, user]);

  useRealtimeSync(loadData, { enabled: Boolean(user), intervalMs: 15000 });

  const stats = [
    { label: 'Total Lamaran', value: allApplicationStats.length, icon: Briefcase, color: 'from-sky-500 to-cyan-400' },
    { label: 'Dalam Proses', value: allApplicationStats.filter(a => ['reviewed', 'shortlisted'].includes(a.status)).length, icon: Clock, color: 'from-sky-600 to-sky-400' },
    { label: 'Interview', value: allApplicationStats.filter(a => a.status === 'interview_scheduled').length, icon: TrendingUp, color: 'from-cyan-500 to-teal-400' },
    { label: 'Diterima', value: allApplicationStats.filter(a => a.status === 'hired').length, icon: CheckCircle, color: 'from-emerald-500 to-emerald-400' },
  ];

  if (loading) {
    return (
      <SeekerLayout currentPath="/seeker/dashboard">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 sm:h-28 bg-sky-100 rounded-2xl" />)}
          </div>
        </div>
      </SeekerLayout>
    );
  }

  return (
    <SeekerLayout currentPath="/seeker/dashboard">
      {/* 1 Baris 4 Grid: Stats Cards */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-sky-100 p-2.5 sm:p-4 card-hover shadow-sm flex flex-col justify-between">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2 sm:mb-3 shadow-md shrink-0`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-black text-slate-800 leading-tight">{value}</div>
              <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5 truncate" title={label}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 1 Baris 2 Grid: Lamaran Terkini & Notifikasi (Kompak & Hemat Ruang) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-3">
              <div className="flex items-center gap-1.5 truncate">
                <h2 className="font-bold text-slate-800 text-xs sm:text-sm truncate">Lamaran Terkini</h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200" title="Sinkronisasi status otomatis aktif">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <a href="/seeker/applications" className="text-sky-500 text-[10px] sm:text-xs font-semibold hover:text-sky-700 flex items-center gap-0.5 shrink-0">
                <span className="hidden sm:inline">Lihat </span>Semua <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </a>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-4 sm:py-6 flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 rounded-xl flex items-center justify-center mb-2">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
                </div>
                <p className="text-slate-700 text-xs sm:text-sm font-bold">Belum ada lamaran</p>
                <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 leading-tight line-clamp-1">Mulai lamar lowongan favorit</p>
                <a href="/seeker/browse" className="inline-flex items-center justify-center gap-1 mt-2.5 gradient-cta text-white rounded-xl px-3 py-1.5 text-[10px] sm:text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition">
                  Cari Lowongan
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {applications.slice(0, 3).map((app) => (
                  <div key={app.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-100">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0 text-sky-600 font-bold text-xs">
                      {(app.job_listings?.companies?.name || 'C')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-[11px] sm:text-xs font-bold truncate">{app.job_listings?.title}</p>
                      <p className="text-slate-400 text-[9px] sm:text-[10px] truncate">{app.job_listings?.companies?.name}</p>
                    </div>
                    <ApplicationStatusBadge status={app.status} compact />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-3">
              <h2 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                <Bell className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span>Notifikasi</span>
              </h2>
              {notifications.length > 0 && (
                <span className="text-[9px] bg-cyan-100 text-cyan-700 px-1.5 py-0.2 rounded-full font-bold">
                  {notifications.length}
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-4 sm:py-6 flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 rounded-xl flex items-center justify-center mb-2">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-sky-300" />
                </div>
                <p className="text-slate-700 text-xs sm:text-sm font-bold">Tidak ada notifikasi</p>
                <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 leading-tight">Pemberitahuan terbaru akan muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className={`p-2 rounded-xl border text-[11px] ${!n.is_read ? 'border-l-2 border-l-cyan-400 bg-cyan-50/70 border-cyan-100' : 'border-sky-50 bg-sky-50/40'}`}>
                    <p className="text-slate-800 font-bold truncate text-[11px]">{n.title}</p>
                    <p className="text-slate-500 text-[10px] line-clamp-1 mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Jobs */}
      {recentJobs.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Lowongan Terbaru</h2>
            <a href="/seeker/browse" className="text-sky-500 text-xs font-medium hover:text-sky-700 flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentJobs.slice(0, 3).map((job) => (
              <a key={job.id} href={`/seeker/browse?job_id=${job.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-sky-100 hover:border-sky-300 hover:bg-sky-50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0 text-sky-600 font-black text-sm">
                  {(job.companies?.name || 'C')[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-slate-800 text-xs font-semibold truncate group-hover:text-sky-600 transition-colors">{job.title}</p>
                  <p className="text-slate-400 text-[10px] truncate">{job.companies?.name}</p>
                  <p className="text-sky-500 text-[10px] font-medium">{job.location_city}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </SeekerLayout>
  );
}
