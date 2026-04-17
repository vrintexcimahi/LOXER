import { useCallback, useEffect, useState } from 'react';
import { FileText, Building2, MapPin, Calendar, Clock } from 'lucide-react';
import SeekerLayout from '../../components/layout/SeekerLayout';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { Application, ApplicationStatus, Company, JobListing } from '../../lib/types';

type ApplicationJob = JobListing & { companies?: Company | null };
type ApplicationRow = Application & { job_listings?: ApplicationJob | null };

const STATUS_FILTERS: { label: string; value: ApplicationStatus | 'all' }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Melamar', value: 'applied' },
  { label: 'Ditinjau', value: 'reviewed' },
  { label: 'Shortlist', value: 'shortlisted' },
  { label: 'Interview', value: 'interview_scheduled' },
  { label: 'Diterima', value: 'hired' },
  { label: 'Ditolak', value: 'rejected' },
];

export default function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');

  const loadApplications = useCallback(async () => {
    if (!supabase || !user) return;

    const { data: profile } = await supabase.from('seeker_profiles').select('id').eq('user_id', user.id).maybeSingle();
    if (!profile) { setLoading(false); return; }

    const { data } = await supabase
      .from('applications')
      .select('*, job_listings(*, companies(*))')
      .eq('seeker_id', profile.id)
      .order('applied_at', { ascending: false });

    setApplications((data || []) as ApplicationRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void loadApplications();
  }, [loadApplications, user]);

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s.value] = s.value === 'all' ? applications.length : applications.filter((a) => a.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <SeekerLayout currentPath="/seeker/applications">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Lamaran Saya</h1>
        <p className="text-slate-500 text-sm mt-1">Pantau status setiap lamaran kerjamu</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium border transition-all ${
              filter === value
                ? 'gradient-cta text-white border-transparent shadow-md shadow-cyan-500/20'
                : 'bg-white text-slate-600 border-sky-200 hover:border-sky-400'
            }`}
          >
            {label}
            {counts[value] > 0 && (
              <span className={`rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold ${filter === value ? 'bg-white/20' : 'bg-sky-100 text-sky-600'}`}>
                {counts[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-sky-100 p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-sky-100 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-sky-100 rounded mb-2 w-1/2" />
                  <div className="h-3 bg-sky-50 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sky-100 py-16 text-center">
          <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-sky-300" />
          </div>
          <h3 className="text-slate-700 font-bold mb-2">Tidak ada lamaran</h3>
          <p className="text-slate-400 text-sm mb-4">
            {filter === 'all' ? 'Mulai lamar lowongan favoritmu' : `Tidak ada lamaran dengan status "${STATUS_FILTERS.find(s => s.value === filter)?.label}"`}
          </p>
          <a href="/seeker/browse" className="inline-flex items-center gap-1.5 gradient-cta text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition-all">
            Cari Lowongan
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const job = app.job_listings;
            const company = job?.companies;
            return (
              <div key={app.id} className="bg-white rounded-2xl border border-sky-100 shadow-sm card-hover p-5">
                <div className="flex items-start gap-4">
                  {/* Company Logo */}
                  <div className="w-14 h-14 rounded-xl border border-sky-100 bg-sky-50 flex items-center justify-center flex-shrink-0 text-sky-600 font-black text-lg shadow-sm">
                    {(company?.name || 'C')[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="text-slate-800 font-bold text-sm">{job?.title}</h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-sky-400" /> {company?.name}
                          </span>
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" /> {job?.location_city || 'Remote'}
                          </span>
                        </div>
                      </div>
                      <ApplicationStatusBadge status={app.status} />
                    </div>

                    {/* Timeline */}
                    <div className="mt-3 flex items-center gap-4 flex-wrap">
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Dilamar: {formatDate(app.applied_at)}
                      </span>
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Diperbarui: {formatDate(app.updated_at)}
                      </span>
                    </div>

                    {/* Progress Steps */}
                    <div className="mt-4">
                      <div className="flex items-center gap-1">
                        {(['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'hired'] as ApplicationStatus[]).map((step, i, arr) => {
                          const statusOrder = ['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'hired'];
                          const currentIdx = statusOrder.indexOf(app.status);
                          const stepIdx = statusOrder.indexOf(step);
                          const isCompleted = stepIdx <= currentIdx && app.status !== 'rejected';
                          const isRejected = app.status === 'rejected';
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                isRejected && step === 'applied' ? 'bg-red-400' :
                                isCompleted ? 'gradient-cta' : 'bg-sky-100 border border-sky-200'
                              }`} />
                              {i < arr.length - 1 && (
                                <div className={`flex-1 h-0.5 ${isCompleted && stepIdx < currentIdx ? 'gradient-cta' : 'bg-sky-100'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        {['Melamar', 'Ditinjau', 'Shortlist', 'Interview', 'Diterima'].map((label) => (
                          <span key={label} className="text-[9px] text-slate-400 flex-1 text-center first:text-left last:text-right">{label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SeekerLayout>
  );
}
