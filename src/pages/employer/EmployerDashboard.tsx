import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Users, Calendar, ArrowRight, PlusCircle, Eye, CheckCircle } from 'lucide-react';
import EmployerLayout from '../../components/layout/EmployerLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { Company, JobListing, Application, SeekerProfile } from '../../lib/types';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

type EmployerRecentApplication = Application & {
  job_listings?: Pick<JobListing, 'title'> | null;
  seeker_profiles?: Pick<SeekerProfile, 'full_name' | 'domicile_city'> | null;
};

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [allAppStats, setAllAppStats] = useState<Pick<Application, 'id' | 'status'>[]>([]);
  const [recentApps, setRecentApps] = useState<EmployerRecentApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (isSilent = false) => {
    if (!supabase || !user) {
      setCompany(null);
      setJobs([]);
      setRecentApps([]);
      if (!isSilent) setLoading(false);
      return;
    }

    if (!isSilent) {
      setLoading(true);
    }
    try {
      const { data: comp } = await supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle();
      setCompany(comp);

      if (comp) {
        const { data: companyJobs } = await supabase.from('job_listings').select('id').eq('company_id', comp.id);
        const jobIds = companyJobs?.map((job) => job.id) || [];

        const [jobsRes, allAppsRes, recentAppsRes] = await Promise.all([
          supabase.from('job_listings').select('*').eq('company_id', comp.id).order('created_at', { ascending: false }),
          jobIds.length > 0
            ? supabase.from('applications').select('id, status').in('job_id', jobIds)
            : Promise.resolve({ data: [] }),
          jobIds.length > 0
            ? supabase
                .from('applications')
                .select('*, job_listings(title), seeker_profiles(full_name, domicile_city)')
                .in('job_id', jobIds)
                .order('applied_at', { ascending: false })
                .limit(8)
            : Promise.resolve({ data: [] }),
        ]);
        setJobs(jobsRes.data || []);
        setAllAppStats((allAppsRes.data || []) as Pick<Application, 'id' | 'status'>[]);
        setRecentApps((recentAppsRes.data || []) as EmployerRecentApplication[]);
      } else {
        setJobs([]);
        setAllAppStats([]);
        setRecentApps([]);
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useRealtimeSync(loadData, { enabled: Boolean(user), intervalMs: 15000 });

  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const totalApps = allAppStats.length;
  const interviews = allAppStats.filter((a) => a.status === 'interview_scheduled').length;
  const hired = allAppStats.filter((a) => a.status === 'hired').length;

  if (loading) {
    return (
      <EmployerLayout currentPath="/employer/dashboard">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 sm:h-28 bg-sky-100 rounded-2xl" />)}
          </div>
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout currentPath="/employer/dashboard">
      {/* 1 Baris 4 Grid: Stats Cards */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-6">
        {[
          { label: 'Lowongan Aktif', value: activeJobs, icon: Briefcase, color: 'from-emerald-500 to-teal-400', trend: null },
          { label: 'Total Pelamar', value: totalApps, icon: Users, color: 'from-teal-500 to-emerald-400', trend: null },
          { label: 'Jadwal Interview', value: interviews, icon: Calendar, color: 'from-amber-500 to-emerald-400', trend: null },
          { label: 'Diterima Kerja', value: hired, icon: CheckCircle, color: 'from-emerald-600 to-teal-500', trend: null },
        ].map(({ label, value, icon: Icon, color, trend }) => (
          <div key={label} className="bg-white rounded-2xl border border-sky-100 shadow-sm card-hover p-2.5 sm:p-4 flex flex-col justify-between">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2 sm:mb-3 shadow-md shrink-0`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-lg sm:text-2xl font-black text-slate-800 leading-tight">{value}</div>
                <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5 truncate" title={label}>{label}</div>
              </div>
              {trend && <span className="text-emerald-500 text-[10px] sm:text-xs font-semibold">{trend}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 1 Baris 2 Grid: Pelamar Terbaru & Lowongan Aktif */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-3">
              <div className="flex items-center gap-1.5 truncate">
                <h2 className="font-bold text-slate-800 text-xs sm:text-sm truncate">Pelamar Terbaru</h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200" title="Sinkronisasi otomatis aktif">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <a href="/employer/applicants" className="text-sky-500 text-[10px] sm:text-xs font-semibold hover:text-sky-700 flex items-center gap-0.5 shrink-0">
                <span className="hidden sm:inline">Lihat </span>Semua <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </a>
            </div>
            {recentApps.length === 0 ? (
              <div className="text-center py-4 sm:py-6 flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 rounded-xl flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
                </div>
                <p className="text-slate-700 text-xs sm:text-sm font-bold">Belum ada pelamar</p>
                {!company ? (
                  <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 leading-tight line-clamp-1">Lengkapi data perusahaan</p>
                ) : (
                  <a href="/employer/jobs/new" className="inline-flex items-center justify-center gap-1 mt-2.5 gradient-cta text-white rounded-xl px-3 py-1.5 text-[10px] sm:text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition">
                    <PlusCircle className="w-3 h-3" /> Pasang Lowongan Baru
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {recentApps.slice(0, 5).map((app) => {
                  const seeker = app.seeker_profiles;
                  const job = app.job_listings;
                  return (
                    <div key={app.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-sky-50 transition-colors group cursor-pointer border border-transparent hover:border-sky-100">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {(seeker?.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 text-[11px] sm:text-xs font-bold truncate">{seeker?.full_name || 'Pelamar'}</p>
                        <p className="text-slate-400 text-[9px] sm:text-[10px] truncate">{job?.title}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <ApplicationStatusBadge status={app.status} compact />
                        <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-500 transition-colors hidden sm:block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active Job Listings */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-3">
              <h2 className="font-bold text-slate-800 text-xs sm:text-sm truncate">Lowongan Aktif</h2>
              <a href="/employer/jobs" className="text-sky-500 text-[10px] sm:text-xs font-semibold hover:text-sky-700 flex items-center gap-0.5 shrink-0">
                <span className="hidden sm:inline">Lihat </span>Semua <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </a>
            </div>
            {jobs.filter(j => j.status === 'active').length === 0 ? (
              <div className="text-center py-4 sm:py-6 flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 rounded-xl flex items-center justify-center mb-2">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
                </div>
                <p className="text-slate-700 text-xs sm:text-sm font-bold">Belum ada lowongan aktif</p>
                <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 leading-tight line-clamp-1">Mulai pasang lowongan kerja</p>
                <a href="/employer/jobs/new" className="inline-flex items-center justify-center gap-1 mt-2.5 gradient-cta text-white rounded-xl px-3 py-1.5 text-[10px] sm:text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition">
                  <PlusCircle className="w-3 h-3" /> Buat Lowongan
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.filter(j => j.status === 'active').slice(0, 5).map((job) => (
                  <div key={job.id} className="p-2 sm:p-2.5 rounded-xl border border-sky-50 hover:border-sky-200 hover:bg-sky-50 transition-all group cursor-pointer">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <p className="text-slate-800 text-[11px] sm:text-xs font-bold truncate group-hover:text-sky-600 transition-colors">{job.title}</p>
                        <p className="text-slate-400 text-[9px] sm:text-[10px] truncate">{job.location_city} · {job.job_type}</p>
                      </div>
                      <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] px-1.5 py-0.2 flex-shrink-0">Aktif</span>
                    </div>
                    <p className="text-sky-600 text-[9px] sm:text-[10px] font-medium mt-0.5">Kuota: {job.quota}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
}
