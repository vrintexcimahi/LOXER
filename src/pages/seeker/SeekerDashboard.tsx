import { useCallback, useEffect, useState } from 'react';
import { Briefcase, TrendingUp, Clock, CheckCircle, ArrowRight, MapPin, Bell } from 'lucide-react';
import SeekerLayout from '../../components/layout/SeekerLayout';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, SeekerProfile, JobListing, Notification, Company } from '../../lib/types';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';

type JobWithCompany = JobListing & { companies?: Company | null };
type ApplicationWithJob = Application & { job_listings?: JobWithCompany | null };

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SeekerProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobWithCompany[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!supabase || !user) return;

    setLoading(true);
    const [profileRes, jobRes, notifRes] = await Promise.all([
      supabase.from('seeker_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('job_listings').select('*, companies(*)').eq('status', 'active').order('created_at', { ascending: false }).limit(6),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    setProfile(profileRes.data);
    setNotifications(notifRes.data || []);
    setRecentJobs((jobRes.data || []) as JobWithCompany[]);

    if (profileRes.data) {
      const { data: apps } = await supabase
        .from('applications')
        .select('*, job_listings(*, companies(*))')
        .eq('seeker_id', profileRes.data.id)
        .order('applied_at', { ascending: false })
        .limit(5);
      setApplications((apps || []) as ApplicationWithJob[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void loadData();
  }, [loadData, user]);

  const stats = [
    { label: 'Total Lamaran', value: applications.length, icon: Briefcase, color: 'from-sky-500 to-cyan-400' },
    { label: 'Dalam Proses', value: applications.filter(a => ['reviewed', 'shortlisted'].includes(a.status)).length, icon: Clock, color: 'from-sky-600 to-sky-400' },
    { label: 'Interview', value: applications.filter(a => a.status === 'interview_scheduled').length, icon: TrendingUp, color: 'from-cyan-500 to-teal-400' },
    { label: 'Diterima', value: applications.filter(a => a.status === 'hired').length, icon: CheckCircle, color: 'from-emerald-500 to-emerald-400' },
  ];

  if (loading) {
    return (
      <SeekerLayout currentPath="/seeker/dashboard">
        <div className="animate-pulse space-y-6">
          <div className="h-40 bg-sky-100 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-sky-100 rounded-2xl" />)}
          </div>
        </div>
      </SeekerLayout>
    );
  }

  return (
    <SeekerLayout currentPath="/seeker/dashboard">
      {/* Profile Banner */}
      <div className="relative gradient-card rounded-3xl overflow-hidden mb-6 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400 rounded-full opacity-10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 gradient-badge rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl flex-shrink-0">
            {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-xl font-black truncate">
              Halo, {profile?.full_name || 'Pencari Kerja'}! 👋
            </h1>
            {profile?.domicile_city && (
              <p className="text-cyan-200 text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" /> {profile.domicile_city}
              </p>
            )}
            {!profile?.about && (
              <a href="/seeker/profile" className="inline-flex items-center gap-1 mt-2 text-xs text-white/70 hover:text-white bg-white/10 rounded-full px-3 py-1 transition-colors">
                Lengkapi profil untuk meningkatkan peluang <ArrowRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-sky-100 p-4 card-hover shadow-sm">
            <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3 shadow-md`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-black text-slate-800">{value}</div>
            <div className="text-slate-500 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Lamaran Terkini</h2>
            <a href="/seeker/applications" className="text-sky-500 text-xs font-medium hover:text-sky-700 flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          {applications.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Briefcase className="w-8 h-8 text-sky-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Belum ada lamaran</p>
              <p className="text-slate-400 text-xs mt-1">Mulai lamar lowongan favoritmu</p>
              <a href="/seeker/browse" className="inline-flex items-center gap-1.5 mt-3 gradient-cta text-white rounded-xl px-4 py-2 text-xs font-semibold">
                Cari Lowongan
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-100">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0 text-sky-600 font-black text-sm">
                    {(app.job_listings?.companies?.name || 'C')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm font-semibold truncate">{app.job_listings?.title}</p>
                    <p className="text-slate-400 text-xs truncate">{app.job_listings?.companies?.name}</p>
                  </div>
                  <ApplicationStatusBadge status={app.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-500" /> Notifikasi
            </h2>
          </div>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 text-sky-200 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className={`p-3 rounded-xl border text-xs ${!n.is_read ? 'border-l-2 border-l-cyan-400 bg-cyan-50 border-cyan-100' : 'border-sky-50 bg-sky-50/50'}`}>
                  <p className="text-slate-700 font-semibold">{n.title}</p>
                  <p className="text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-slate-400 mt-1 text-[10px]">{new Date(n.created_at).toLocaleDateString('id-ID')}</p>
                </div>
              ))}
            </div>
          )}
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
              <a key={job.id} href="/seeker/browse" className="flex items-center gap-3 p-3 rounded-xl border border-sky-100 hover:border-sky-300 hover:bg-sky-50 transition-all group">
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
