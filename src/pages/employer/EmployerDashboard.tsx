import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Users, Calendar, TrendingUp, ArrowRight, PlusCircle, Eye } from 'lucide-react';
import EmployerLayout from '../../components/layout/EmployerLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { Company, JobListing, Application, SeekerProfile } from '../../lib/types';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';

type EmployerRecentApplication = Application & {
  job_listings?: Pick<JobListing, 'title'> | null;
  seeker_profiles?: Pick<SeekerProfile, 'full_name' | 'domicile_city'> | null;
};

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [recentApps, setRecentApps] = useState<EmployerRecentApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!supabase || !user) {
      setCompany(null);
      setJobs([]);
      setRecentApps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: comp } = await supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle();
    setCompany(comp);

    if (comp) {
      const { data: companyJobs } = await supabase.from('job_listings').select('id').eq('company_id', comp.id);
      const jobIds = companyJobs?.map((job) => job.id) || [];

      const [jobsRes, appsRes] = await Promise.all([
        supabase.from('job_listings').select('*').eq('company_id', comp.id).order('created_at', { ascending: false }),
        supabase
          .from('applications')
          .select('*, job_listings(title), seeker_profiles(full_name, domicile_city)')
          .in('job_id', jobIds)
          .order('applied_at', { ascending: false })
          .limit(8),
      ]);
      setJobs(jobsRes.data || []);
      setRecentApps((appsRes.data || []) as EmployerRecentApplication[]);
    } else {
      setJobs([]);
      setRecentApps([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const totalApps = recentApps.length;
  const interviews = recentApps.filter((a) => a.status === 'interview_scheduled').length;
  const hired = recentApps.filter((a) => a.status === 'hired').length;

  if (loading) {
    return (
      <EmployerLayout currentPath="/employer/dashboard">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-sky-100 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-sky-100 rounded-2xl" />)}
          </div>
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout currentPath="/employer/dashboard">
      {/* Welcome Banner */}
      <div className="relative gradient-card rounded-3xl overflow-hidden mb-6 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-300 rounded-full opacity-10 blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-white text-xl font-black">
              {company ? `Halo, ${company.name}! 🚀` : 'Selamat Datang, Employer!'}
            </h1>
            <p className="text-cyan-200 text-sm mt-1">
              {company ? `${activeJobs} lowongan aktif · ${totalApps} pelamar` : 'Lengkapi profil perusahaanmu untuk memulai rekrutmen'}
            </p>
          </div>
          {!company ? (
            <a href="/employer/company" className="bg-white text-sky-700 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-sky-50 transition-colors whitespace-nowrap">
              Setup Perusahaan
            </a>
          ) : (
            <a href="/employer/jobs/new" className="bg-white text-sky-700 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-sky-50 transition-colors whitespace-nowrap flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Pasang Lowongan
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Lowongan Aktif', value: activeJobs, icon: Briefcase, color: 'from-sky-500 to-cyan-400', trend: null },
          { label: 'Total Pelamar', value: totalApps, icon: Users, color: 'from-sky-600 to-sky-400', trend: '+12%' },
          { label: 'Interview Dijadwal', value: interviews, icon: Calendar, color: 'from-cyan-500 to-teal-400', trend: null },
          { label: 'Berhasil Rekrut', value: hired, icon: TrendingUp, color: 'from-emerald-500 to-emerald-400', trend: null },
        ].map(({ label, value, icon: Icon, color, trend }) => (
          <div key={label} className="bg-white rounded-2xl border border-sky-100 shadow-sm card-hover p-4">
            <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3 shadow-md`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-black text-slate-800">{value}</div>
                <div className="text-slate-500 text-xs mt-0.5">{label}</div>
              </div>
              {trend && <span className="text-emerald-500 text-xs font-semibold">{trend}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Pelamar Terbaru</h2>
            <a href="/employer/applicants" className="text-sky-500 text-xs font-medium hover:text-sky-700 flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          {recentApps.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-sky-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Belum ada pelamar</p>
              {!company ? (
                <p className="text-slate-400 text-xs mt-1">Setup perusahaan terlebih dahulu</p>
              ) : (
                <a href="/employer/jobs/new" className="inline-flex items-center gap-1.5 mt-3 gradient-cta text-white rounded-xl px-4 py-2 text-xs font-semibold">
                  <PlusCircle className="w-3.5 h-3.5" /> Pasang Lowongan Baru
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {recentApps.map((app) => {
                const seeker = app.seeker_profiles;
                const job = app.job_listings;
                return (
                  <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sky-50 transition-colors group cursor-pointer border border-transparent hover:border-sky-100">
                    <div className="w-9 h-9 gradient-cta rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(seeker?.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-semibold truncate">{seeker?.full_name || 'Pelamar'}</p>
                      <p className="text-slate-400 text-xs truncate">{job?.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ApplicationStatusBadge status={app.status} />
                      <Eye className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Job Listings */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Lowongan Aktif</h2>
            <a href="/employer/jobs" className="text-sky-500 text-xs font-medium hover:text-sky-700 flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          {jobs.filter(j => j.status === 'active').length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-8 h-8 text-sky-200 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">Belum ada lowongan aktif</p>
              <a href="/employer/jobs/new" className="inline-flex items-center gap-1 mt-3 text-sky-500 text-xs font-semibold hover:text-sky-700">
                <PlusCircle className="w-3.5 h-3.5" /> Buat lowongan
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.filter(j => j.status === 'active').slice(0, 5).map((job) => (
                <div key={job.id} className="p-3 rounded-xl border border-sky-50 hover:border-sky-200 hover:bg-sky-50 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-slate-800 text-xs font-semibold truncate group-hover:text-sky-600 transition-colors">{job.title}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{job.location_city} · {job.job_type}</p>
                    </div>
                    <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] flex-shrink-0">Aktif</span>
                  </div>
                  <p className="text-sky-600 text-[10px] font-medium mt-1">Kuota: {job.quota}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </EmployerLayout>
  );
}
