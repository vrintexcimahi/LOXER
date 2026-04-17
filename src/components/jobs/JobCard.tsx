import { useState } from 'react';
import { MapPin, Clock, DollarSign, Bookmark, CheckCircle } from 'lucide-react';
import { JobListing } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';

interface JobCardProps {
  job: JobListing;
  appliedJobIds?: string[];
  onApplied?: () => void;
  onClick?: () => void;
}

const jobTypeColors: Record<string, string> = {
  'full-time': 'bg-sky-100 text-sky-700',
  'part-time': 'bg-cyan-100 text-cyan-700',
  'contract': 'bg-amber-100 text-amber-700',
  'freelance': 'bg-emerald-100 text-emerald-700',
  'internship': 'bg-violet-100 text-violet-700',
};

const jobTypeLabels: Record<string, string> = {
  'full-time': 'Full Time',
  'part-time': 'Part Time',
  'contract': 'Kontrak',
  'freelance': 'Freelance',
  'internship': 'Magang',
};

function formatSalary(min: number, max: number) {
  const fmt = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(0)}jt`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}rb`;
    return n.toString();
  };
  if (!min && !max) return 'Nego';
  if (min && max) return `Rp ${fmt(min)} - ${fmt(max)}`;
  if (min) return `Rp ${fmt(min)}+`;
  return `s/d Rp ${fmt(max)}`;
}

export default function JobCard({ job, appliedJobIds = [], onApplied, onClick }: JobCardProps) {
  const { user, userMeta } = useAuth();
  const [applying, setApplying] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const isApplied = appliedJobIds.includes(job.id) || justApplied;

  async function handleApply(e: React.MouseEvent) {
    e.stopPropagation();
    if (!supabase || !user || !userMeta || userMeta.role !== 'seeker' || isApplied) return;
    setApplying(true);
    try {
      const { data: profile } = await supabase
        .from('seeker_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const { error } = await supabase.from('applications').insert({
        job_id: job.id,
        seeker_id: profile.id,
        status: 'applied',
      });

      if (!error) {
        setJustApplied(true);
        onApplied?.();
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-sky-100 shadow-sm card-hover cursor-pointer relative overflow-hidden group"
    >
      {/* Left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-cyan-400 rounded-l-2xl" />

      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          {/* Company Logo */}
          <div className="w-12 h-12 rounded-xl border border-sky-100 shadow-sm bg-sky-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {job.companies?.logo_url ? (
              <img src={job.companies.logo_url} alt={job.companies.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sky-600 font-black text-lg">
                {(job.companies?.name || 'C')[0]}
              </span>
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-slate-800 font-semibold text-sm group-hover:text-sky-600 transition-colors truncate">
              {job.title}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5 truncate">{job.companies?.name}</p>
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-cyan-400" /> {job.location_city || 'Remote'}
            </p>
          </div>

          {/* Bookmark */}
          <button className="text-slate-300 hover:text-sky-500 transition-colors flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Bookmark className="w-4 h-4" />
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`badge ${jobTypeColors[job.job_type] || 'bg-sky-100 text-sky-700'} border-transparent`}>
            <Clock className="w-3 h-3 mr-1" />
            {jobTypeLabels[job.job_type] || job.job_type}
          </span>
          {job.category && (
            <span className="badge bg-slate-100 text-slate-600 border-transparent text-[10px]">
              {job.category}
            </span>
          )}
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sky-600 font-semibold text-sm flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            {formatSalary(job.salary_min, job.salary_max)}
          </span>

          {userMeta?.role === 'seeker' && (
            <button
              onClick={handleApply}
              disabled={isApplied || applying}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
                isApplied
                  ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                  : 'gradient-cta text-white shadow-md shadow-cyan-500/20 hover:shadow-lg hover:brightness-110 active:scale-95'
              }`}
            >
              {applying ? (
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Melamar...
                </span>
              ) : isApplied ? (
                <><CheckCircle className="w-3.5 h-3.5" /> Terlamar</>
              ) : (
                'Lamar Sekarang'
              )}
            </button>
          )}
        </div>

        {/* Posted */}
        <p className="text-slate-300 text-[10px] mt-2">
          {new Date(job.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
