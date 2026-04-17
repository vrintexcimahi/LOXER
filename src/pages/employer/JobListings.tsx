import { useCallback, useEffect, useState } from 'react';
import { PlusCircle, Eye, Pencil, Archive, Briefcase, MapPin, Users } from 'lucide-react';
import EmployerLayout from '../../components/layout/EmployerLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { Company, JobListing, JobStatus } from '../../lib/types';

const STATUS_TABS: { label: string; value: JobStatus | 'all' }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Ditutup', value: 'closed' },
];

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full Time', 'part-time': 'Part Time',
  'contract': 'Kontrak', 'freelance': 'Freelance', 'internship': 'Magang',
};

function formatSalary(min: number, max: number) {
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(0)}jt` : `${(n / 1000).toFixed(0)}rb`;
  if (!min && !max) return 'Nego';
  if (min && max) return `Rp ${fmt(min)} - ${fmt(max)}`;
  return min ? `Rp ${fmt(min)}+` : `s/d Rp ${fmt(max)}`;
}

export default function JobListings() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<JobStatus | 'all'>('all');

  const loadData = useCallback(async () => {
    if (!supabase || !user) return;

    setLoading(true);
    const { data: comp } = await supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle();
    setCompany(comp);

    if (comp) {
      const { data: jobsData } = await supabase.from('job_listings').select('*').eq('company_id', comp.id).order('created_at', { ascending: false });
      setJobs(jobsData || []);

      if (jobsData?.length) {
        const ids = jobsData.map((j) => j.id);
        const { data: apps } = await supabase.from('applications').select('job_id').in('job_id', ids);
        const counts: Record<string, number> = {};
        (apps || []).forEach((a) => { counts[a.job_id] = (counts[a.job_id] || 0) + 1; });
        setAppCounts(counts);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void loadData();
  }, [loadData, user]);

  async function toggleStatus(job: JobListing, newStatus: JobStatus) {
    if (!supabase) return;
    await supabase.from('job_listings').update({ status: newStatus }).eq('id', job.id);
    setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: newStatus } : j));
  }

  const filtered = tab === 'all' ? jobs : jobs.filter((j) => j.status === tab);

  return (
    <EmployerLayout currentPath="/employer/jobs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Kelola Lowongan</h1>
          <p className="text-slate-500 text-sm mt-1">{jobs.filter(j => j.status === 'active').length} lowongan aktif · {jobs.length} total</p>
        </div>
        {company && (
          <a href="/employer/jobs/new" className="gradient-cta text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg shadow-cyan-500/30 hover:brightness-110 transition-all flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Pasang Lowongan
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {STATUS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-xl px-4 py-2 text-xs font-medium border transition-all ${
              tab === value ? 'gradient-cta text-white border-transparent shadow-md' : 'bg-white text-slate-600 border-sky-200 hover:border-sky-400'
            }`}
          >
            {label} ({value === 'all' ? jobs.length : jobs.filter(j => j.status === value).length})
          </button>
        ))}
      </div>

      {!company ? (
        <div className="bg-white rounded-2xl border border-sky-100 py-16 text-center">
          <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-10 h-10 text-sky-300" />
          </div>
          <h3 className="text-slate-700 font-bold mb-2">Setup profil perusahaan dahulu</h3>
          <a href="/employer/company" className="inline-flex items-center gap-1.5 gradient-cta text-white rounded-xl px-5 py-2.5 text-sm font-semibold mt-3 hover:brightness-110 transition-all">
            Setup Perusahaan
          </a>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-sky-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sky-100 py-16 text-center">
          <Briefcase className="w-12 h-12 text-sky-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Tidak ada lowongan {tab !== 'all' ? `dengan status "${tab}"` : ''}</p>
          <a href="/employer/jobs/new" className="inline-flex items-center gap-1.5 gradient-cta text-white rounded-xl px-5 py-2.5 text-sm font-semibold mt-4 hover:brightness-110 transition-all">
            <PlusCircle className="w-4 h-4" /> Buat Lowongan Baru
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div key={job.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm card-hover p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-slate-800 font-bold text-sm">{job.title}</h3>
                    <span className={`badge border text-[10px] ${
                      job.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      job.status === 'draft' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {job.status === 'active' ? 'Aktif' : job.status === 'draft' ? 'Draft' : 'Ditutup'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="text-slate-500 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" /> {job.location_city}
                    </span>
                    <span className="text-slate-500 text-xs">{JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
                    <span className="text-sky-600 text-xs font-semibold">{formatSalary(job.salary_min, job.salary_max)}</span>
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" /> {appCounts[job.id] || 0} pelamar
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-1">Dibuat: {new Date(job.created_at).toLocaleDateString('id-ID')} · Kuota: {job.quota}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`/employer/applicants?job=${job.id}`}
                    className="flex items-center gap-1.5 border border-sky-200 text-sky-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-sky-50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Pelamar
                  </a>
                  <a
                    href={`/employer/jobs/${job.id}/edit`}
                    className="flex items-center gap-1.5 border border-sky-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-sky-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </a>
                  {job.status === 'active' ? (
                    <button
                      onClick={() => toggleStatus(job, 'closed')}
                      className="flex items-center gap-1.5 border border-slate-200 text-slate-500 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" /> Tutup
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleStatus(job, 'active')}
                      className="flex items-center gap-1.5 gradient-cta text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:brightness-110 transition-all"
                    >
                      Aktifkan
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </EmployerLayout>
  );
}
