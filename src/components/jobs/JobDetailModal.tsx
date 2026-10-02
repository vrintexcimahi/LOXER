import { useEffect, useState, useCallback } from 'react';
import {
  X,
  Building2,
  MapPin,
  Clock,
  Banknote,
  CheckCircle2,
  Sparkles,
  Send,
  Share2,
  ExternalLink,
  Briefcase,
  Users,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { queueApplicationOffline, getQueuedApplications } from '../../lib/offlineSyncService';
import { useAppAccess } from '../../contexts/AppAccessContext';
import { JobListing } from '../../lib/types';

interface JobDetailModalProps {
  jobId: string | null;
  initialJob?: Partial<JobListing & { company?: string; locations?: string; salary?: string }> | null;
  onClose: () => void;
  onRequireAuth?: (mode: 'login' | 'register') => void;
  onApplied?: (jobId: string) => void;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Purna Waktu (Full Time)',
  'part-time': 'Paruh Waktu (Part Time)',
  contract: 'Kontrak',
  freelance: 'Lepas Waktu (Freelance)',
  internship: 'Magang (Internship)',
};

function formatSalary(min?: number | null, max?: number | null, fallbackText?: string) {
  if (fallbackText && typeof fallbackText === 'string') {
    const trimmed = fallbackText.trim().toLowerCase();
    if (
      trimmed === '0' ||
      trimmed === 'gaji tidak dicantumkan' ||
      trimmed.includes('us$0') ||
      trimmed.includes('$0') ||
      trimmed.includes('rp 0') ||
      trimmed.includes('rp0') ||
      trimmed === 'null' ||
      trimmed === 'undefined'
    ) {
      // Fall through to numeric or default
    } else {
      return fallbackText.replace(/US\$/gi, 'Rp ').replace(/\$/g, 'Rp ');
    }
  }
  const numMin = Number(min) || 0;
  const numMax = Number(max) || 0;
  if (numMin <= 0 && numMax <= 0) return 'Kompetitif / Sesuai Pengalaman';
  const fmt = (n: number) => {
    if (n >= 1000000) {
      const millions = n / 1000000;
      return millions % 1 === 0 ? `${millions} Juta` : `${millions.toFixed(1)} Juta`;
    }
    if (n >= 1000) return `${(n / 1000).toFixed(0)} Ribu`;
    return n.toLocaleString('id-ID');
  };
  if (numMin > 0 && numMax > 0) return `Rp ${fmt(numMin)} - Rp ${fmt(numMax)} / bulan`;
  if (numMin > 0) return `Mulai Rp ${fmt(numMin)} / bulan`;
  return `s/d Rp ${fmt(numMax)} / bulan`;
}

export default function JobDetailModal({
  jobId,
  initialJob,
  onClose,
  onRequireAuth,
  onApplied,
}: JobDetailModalProps) {
  const { user, userMeta } = useAuth();
  const { requireApp } = useAppAccess();
  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [appliedDate, setAppliedDate] = useState<string | null>(null);

  // Check offline queue
  const isQueuedOffline = jobId ? getQueuedApplications().some((q) => q.jobId === jobId) : false;

  const loadJobDetail = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('job_listings')
          .select('*, companies(*)')
          .eq('id', jobId)
          .maybeSingle();

        if (data && !error) {
          setJob(data as JobListing);
        } else if (initialJob) {
          setJob(initialJob as JobListing);
        }
      } else if (initialJob) {
        setJob(initialJob as JobListing);
      }
    } catch {
      if (initialJob) setJob(initialJob as JobListing);
    } finally {
      setLoading(false);
    }
  }, [jobId, initialJob]);

  // Check if seeker has already applied to this job
  const checkApplicationStatus = useCallback(async () => {
    if (!supabase || !user || !jobId || (userMeta?.role !== 'seeker' && userMeta?.role !== 'freelancer')) {
      setAlreadyApplied(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('seeker_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const seekerId = profile?.id || user.id;

      const { data: app } = await supabase
        .from('applications')
        .select('id, status, applied_at')
        .eq('job_id', jobId)
        .eq('seeker_id', seekerId)
        .maybeSingle();

      if (app) {
        setAlreadyApplied(true);
        setAppliedDate(app.applied_at);
      } else {
        setAlreadyApplied(false);
      }
    } catch {
      setAlreadyApplied(false);
    }
  }, [user, jobId, userMeta?.role]);

  useEffect(() => {
    void loadJobDetail();
  }, [loadJobDetail]);

  useEffect(() => {
    void checkApplicationStatus();
  }, [checkApplicationStatus]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleApply = async () => {
    if (!requireApp('Melamar Lowongan Pekerjaan')) {
      return;
    }
    if (!jobId || !user) return;
    if (userMeta?.role !== 'seeker' && userMeta?.role !== 'freelancer') return;

    setApplying(true);
    try {
      let profileId = user.id;
      if (supabase) {
        const { data: profile } = await supabase
          .from('seeker_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          profileId = profile.id;
        } else {
          const { data: newProfile } = await supabase
            .from('seeker_profiles')
            .insert({
              user_id: user.id,
              full_name: userMeta.email?.split('@')[0] || 'Pelamar',
            })
            .select('id')
            .maybeSingle();
          if (newProfile) profileId = newProfile.id;
        }
      }

      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline || !supabase) {
        queueApplicationOffline({
          jobId,
          jobTitle: job?.title || 'Lowongan Kerja',
          companyName: job?.companies?.name || 'Mitra LOXER',
          seekerId: profileId,
        });
        setJustApplied(true);
        setAlreadyApplied(true);
        onApplied?.(jobId);
        return;
      }

      const { error } = await supabase.from('applications').insert({
        job_id: jobId,
        seeker_id: profileId,
        status: 'applied',
      });

      if (!error) {
        // Send in-app notification to applicant
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Lamaran Berhasil Dikirim',
          message: `Lamaran Anda untuk posisi "${job?.title || 'Lowongan'}" di ${job?.companies?.name || 'Perusahaan'} telah diterima oleh sistem.`,
          is_read: 0,
        });

        setJustApplied(true);
        setAlreadyApplied(true);
        setAppliedDate(new Date().toISOString());
        onApplied?.(jobId);
      } else {
        const errStr = String((error as { message?: string })?.message || '');
        const isDuplicate = errStr.includes('UNIQUE') || errStr.includes('duplicate') || (error as { code?: string })?.code === '23505';

        if (isDuplicate) {
          setJustApplied(true);
          setAlreadyApplied(true);
          onApplied?.(jobId);
        } else {
          // Fallback to offline queue on connection or DB error
          queueApplicationOffline({
            jobId,
            jobTitle: job?.title || 'Lowongan Kerja',
            companyName: job?.companies?.name || 'Mitra LOXER',
            seekerId: profileId,
          });
          setJustApplied(true);
          setAlreadyApplied(true);
          onApplied?.(jobId);
        }
      }
    } catch {
      queueApplicationOffline({
        jobId,
        jobTitle: job?.title || 'Lowongan Kerja',
        companyName: job?.companies?.name || 'Mitra LOXER',
        seekerId: user.id,
      });
      setJustApplied(true);
      setAlreadyApplied(true);
      onApplied?.(jobId);
    } finally {
      setApplying(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (!jobId) return null;

  const isApplied = alreadyApplied || justApplied || isQueuedOffline;
  type ExtendedJob = JobListing & { company?: string; locations?: string; salary?: string };
  const extendedJob = job as unknown as ExtendedJob;
  const company = job?.companies;
  const companyName = company?.name || extendedJob?.company || 'Mitra LOXER';
  const companyInitial = (companyName || 'C')[0].toUpperCase();
  const locationText = job?.location_city || extendedJob?.locations || 'Indonesia';
  const salaryText = formatSalary(job?.salary_min, job?.salary_max, extendedJob?.salary);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] max-h-[92dvh] rounded-t-3xl sm:rounded-3xl bg-slate-900 shadow-2xl border-t sm:border border-white/10 overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 bg-slate-900">
          <div className="w-12 h-1 bg-slate-600/70 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="relative border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/60 p-5 sm:p-6 pr-14">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white shadow-sm border border-white/10 transition active:scale-95"
            aria-label="Tutup detail lowongan"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl border border-white/10 bg-slate-800 shadow-md flex items-center justify-center flex-shrink-0 overflow-hidden">
              {company?.logo_url ? (
                <img src={company.logo_url} alt={companyName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white text-xl font-black">
                  {companyInitial}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ⭐ Lowongan Resmi LOXER
                </span>
                {company?.verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Terverifikasi
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {job?.title || 'Memuat Lowongan...'}
              </h2>

              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
                <Building2 className="h-4 w-4 text-sky-400 shrink-0" />
                <span className="truncate">{companyName}</span>
              </p>
            </div>
          </div>

          {/* Quick Meta Badges */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-white/10 px-3 py-1 text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-sky-400" />
              {locationText}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-white/10 px-3 py-1 text-emerald-300 font-semibold">
              <Banknote className="h-3.5 w-3.5 text-emerald-400" />
              {salaryText}
            </span>
            {job?.job_type && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-white/10 px-3 py-1 text-slate-300">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                {JOB_TYPE_LABELS[job.job_type] || job.job_type}
              </span>
            )}
            {job?.category && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-white/10 px-3 py-1 text-slate-300">
                <Briefcase className="h-3.5 w-3.5 text-sky-400" />
                {job.category}
              </span>
            )}
            {job?.quota && job.quota > 1 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-white/10 px-3 py-1 text-slate-300">
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                Kuota: {job.quota} orang
              </span>
            ) : null}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-300 text-sm leading-relaxed">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Memuat detail lowongan...</p>
            </div>
          ) : (
            <>
              {/* Job Description */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-sky-400" /> Deskripsi Pekerjaan
                </h3>
                <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 whitespace-pre-line text-slate-300 text-sm">
                  {job?.description || 'Deskripsi detail lowongan tidak dicantumkan oleh perusahaan.'}
                </div>
              </section>

              {/* Requirements */}
              {job?.requirements && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Kualifikasi & Persyaratan
                  </h3>
                  <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 whitespace-pre-line text-slate-300 text-sm">
                    {job.requirements}
                  </div>
                </section>
              )}

              {/* Company Info Card */}
              {company && (
                <section className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tentang Perusahaan</h4>
                  <p className="font-bold text-white">{company.name}</p>
                  {company.description && (
                    <p className="text-xs text-slate-400 line-clamp-3">{company.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-400">
                    {company.industry && <span>Industri: <strong className="text-slate-200">{company.industry}</strong></span>}
                    {company.city && <span>Kota: <strong className="text-slate-200">{company.city}</strong></span>}
                    {company.employee_count && <span>Ukuran: <strong className="text-slate-200">{company.employee_count}</strong></span>}
                    {company.website && (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                      >
                        Kunjungi Website <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Modal Sticky Footer / Actions */}
        <div className="border-t border-white/10 bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleShare}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 w-full sm:w-auto justify-center"
              title="Salin tautan lowongan"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 text-slate-400" />
                  <span>Bagikan</span>
                </>
              )}
            </button>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  if (!requireApp('Melamar Lowongan Pekerjaan')) {
                    return;
                  }
                  onRequireAuth?.('login');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                Masuk / Daftar untuk Melamar
              </button>
            ) : (userMeta?.role === 'seeker' || userMeta?.role === 'freelancer') ? (
              isApplied ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {isQueuedOffline ? 'Tersimpan di Antrean Offline' : 'Lamaran Terkirim'}
                    {appliedDate ? ` · ${new Date(appliedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                  <a
                    href="/seeker/applications"
                    className="text-xs font-semibold text-sky-400 hover:underline"
                  >
                    Lihat Progres Lamaran &rarr;
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  {applying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Mengirim Lamaran...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Kirim Lamaran Sekarang</span>
                    </>
                  )}
                </button>
              )
            ) : (
              <div className="text-xs text-slate-500 italic text-center sm:text-right">
                Masuk sebagai {userMeta?.role === 'employer' ? 'Employer' : 'Admin'}. Gunakan akun Seeker untuk melamar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
