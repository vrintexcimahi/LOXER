import { useCallback, useEffect, useState } from 'react';
import { Briefcase, TrendingUp, Clock, CheckCircle, ArrowRight, Bell, Sparkles, Video, Award, ChevronRight } from 'lucide-react';
import SeekerLayout from '../../components/layout/SeekerLayout';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, SeekerProfile, JobListing, Notification, Company } from '../../lib/types';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { getInterviewHistory, InterviewSession } from '../../services/interviewClientService';

type JobWithCompany = JobListing & { companies?: Company | null };
type ApplicationWithJob = Application & { job_listings?: JobWithCompany | null };

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [, setProfile] = useState<SeekerProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [allApplicationStats, setAllApplicationStats] = useState<Pick<Application, 'id' | 'status'>[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobWithCompany[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestInterview, setLatestInterview] = useState<InterviewSession | null>(null);
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

      // Load Interview History / Latest Evaluation
      try {
        const history = await getInterviewHistory(user.id);
        if (history && history.length > 0) {
          const completedWithScore = history.find((h: InterviewSession) => h.scorecard || h.status === 'completed');
          if (completedWithScore) {
            setLatestInterview(completedWithScore);
          } else {
            setLatestInterview(history[0]);
          }
        } else {
          const localSaved = localStorage.getItem('loxer_latest_interview_eval');
          if (localSaved) {
            setLatestInterview(JSON.parse(localSaved));
          }
        }
      } catch (err) {
        console.warn('[SeekerDashboard] Failed to fetch interview history:', err);
        try {
          const localSaved = localStorage.getItem('loxer_latest_interview_eval');
          if (localSaved) setLatestInterview(JSON.parse(localSaved));
        } catch {
          // ignore
        }
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
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 sm:h-28 bg-sky-100 dark:bg-slate-800 rounded-2xl" />)}
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
          <div key={label} className="bg-white dark:bg-slate-900/90 rounded-2xl border border-sky-100 dark:border-white/10 p-2.5 sm:p-4 card-hover shadow-sm flex flex-col justify-between">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2 sm:mb-3 shadow-md shrink-0`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{value}</div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs mt-0.5 truncate" title={label}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 1 Baris 2 Grid: Lamaran Terkini & Notifikasi (Kompak & Hemat Ruang) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {/* Recent Applications */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-sky-100 dark:border-white/10 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-3">
              <div className="flex items-center gap-1.5 truncate">
                <h2 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm truncate">Lamaran Terkini</h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30" title="Sinkronisasi status otomatis aktif">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <a href="/seeker/applications" className="text-sky-500 dark:text-sky-400 text-[10px] sm:text-xs font-semibold hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-0.5 shrink-0">
                <span className="hidden sm:inline">Lihat </span>Semua <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </a>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-4 sm:py-6 flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 dark:bg-slate-800/80 rounded-xl flex items-center justify-center mb-2">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold">Belum ada lamaran</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-tight line-clamp-1">Mulai lamar lowongan favorit</p>
                <a href="/seeker/browse" className="inline-flex items-center justify-center gap-1 mt-2.5 gradient-cta text-white rounded-xl px-3 py-1.5 text-[10px] sm:text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition">
                  Cari Lowongan
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {applications.slice(0, 3).map((app) => (
                  <div key={app.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-sky-100 dark:hover:border-slate-700">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-100 dark:bg-cyan-500/20 text-sky-600 dark:text-cyan-300 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                      {(app.job_listings?.companies?.name || 'C')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs font-bold truncate">{app.job_listings?.title}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] sm:text-[10px] truncate">{app.job_listings?.companies?.name}</p>
                    </div>
                    <ApplicationStatusBadge status={app.status} compact />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-sky-100 dark:border-white/10 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-3">
              <h2 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm flex items-center gap-1.5 truncate">
                <Bell className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span>Notifikasi</span>
              </h2>
              {notifications.length > 0 && (
                <span className="text-[9px] bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-full font-bold">
                  {notifications.length}
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-4 sm:py-6 flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 dark:bg-slate-800/80 rounded-xl flex items-center justify-center mb-2">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 dark:text-cyan-400" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold">Tidak ada notifikasi</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-tight">Pemberitahuan terbaru akan muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    className={`p-2 sm:p-2.5 rounded-xl border text-[11px] transition-colors ${
                      !n.is_read
                        ? 'border-l-2 border-l-cyan-400 bg-cyan-500/10 border-cyan-500/25 dark:bg-cyan-500/15 dark:border-cyan-500/30'
                        : 'border-slate-200/80 bg-slate-50/60 dark:border-white/10 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold truncate text-[11px] text-slate-800 dark:text-slate-200">{n.title}</p>
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Belum dibaca" />
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] line-clamp-1 mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Live Interview Practice & Evaluation Widget */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-cyan-500/25 p-4 sm:p-5 shadow-lg text-white relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base text-white">Simulasi Wawancara Kerja AI</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  Live Gemini 3.8
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                Latihan 1-on-1 dengan video & audio interaktif adaptif sebelum wawancara resmi
              </p>
            </div>
          </div>
          <a
            href="/interview"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-xs font-black shadow-md shadow-cyan-500/20 active:scale-95 transition shrink-0 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" />
            <span>{latestInterview ? 'Latihan Ulang' : 'Mulai Latihan'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {latestInterview?.scorecard || latestInterview?.overall_score ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 sm:p-4 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <p className="text-xs font-bold text-cyan-300 truncate">
                  {latestInterview.role_title || 'Staff Profesional'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {latestInterview.company_name || 'Simulasi LOXER'} • Evaluasi Terakhir
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-[10px] font-semibold text-slate-300">Skor Keseluruhan:</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-xs">
                  {latestInterview.scorecard?.overall_score || latestInterview.overall_score || 85} / 100
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-[10px] font-semibold">
                  {latestInterview.scorecard?.recommendation || latestInterview.recommendation || 'Sangat Disarankan'}
                </span>
              </div>
            </div>

            {/* 4 Pillars Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
              <div className="bg-slate-950/40 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-slate-400">Teknis</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {latestInterview.scorecard?.technical_score || 86}%
                </div>
              </div>
              <div className="bg-slate-950/40 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-slate-400">Komunikasi</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {latestInterview.scorecard?.communication_score || 83}%
                </div>
              </div>
              <div className="bg-slate-950/40 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-slate-400">Problem Solving</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {latestInterview.scorecard?.problem_solving_score || 85}%
                </div>
              </div>
              <div className="bg-slate-950/40 rounded-lg p-2 border border-white/5">
                <div className="text-[10px] text-slate-400">Cultural Fit</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {latestInterview.scorecard?.cultural_fit_score || 88}%
                </div>
              </div>
            </div>

            {(latestInterview.scorecard?.summary_feedback || latestInterview.summary_feedback) && (
              <p className="text-[11px] text-slate-300 italic mt-3 bg-slate-950/30 p-2.5 rounded-lg border border-white/5 line-clamp-2">
                "{latestInterview.scorecard?.summary_feedback || latestInterview.summary_feedback}"
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-3.5 mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Award className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Belum ada riwayat simulasi. Ikuti latihan wawancara untuk mengukur kesiapan kerja Anda.</span>
            </div>
            <a
              href="/interview"
              className="text-cyan-400 hover:text-cyan-300 text-xs font-bold shrink-0 inline-flex items-center gap-1"
            >
              Coba Sekarang <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Recommended Jobs */}
      {recentJobs.length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-sky-100 dark:border-white/10 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 dark:text-white">Lowongan Terbaru</h2>
            <a href="/seeker/browse" className="text-sky-500 dark:text-sky-400 text-xs font-medium hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {recentJobs.slice(0, 4).map((job) => (
              <a key={job.id} href={`/seeker/browse?job_id=${job.id}`} className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-sky-100 dark:border-white/5 hover:border-sky-300 dark:hover:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-800/60 transition-all group text-center sm:text-left">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sky-100 dark:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-sky-600 dark:text-cyan-300 font-black text-xs sm:text-sm">
                  {(job.companies?.name || 'C')[0]}
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{job.title}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] truncate">{job.companies?.name}</p>
                  <p className="text-sky-500 dark:text-sky-400 text-[10px] font-medium truncate">{job.location_city}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </SeekerLayout>
  );
}
