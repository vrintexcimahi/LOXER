import { useCallback, useEffect, useState } from 'react';
import { Users, MapPin, GraduationCap, Briefcase, Tag, ChevronDown, Calendar, X, CheckCircle, XCircle } from 'lucide-react';
import EmployerLayout from '../../components/layout/EmployerLayout';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { Application, ApplicationStatus, JobListing, SeekerEducation, SeekerProfile, SeekerSkill } from '../../lib/types';

type ApplicantProfile = SeekerProfile & {
  seeker_skills?: SeekerSkill[];
  seeker_education?: Array<Pick<SeekerEducation, 'school_name' | 'degree'>>;
};

type ApplicantApplicationRow = Application & {
  seeker_profiles?: ApplicantProfile | null;
  job_listings?: JobListing | null;
};

interface ApplicantData {
  application: Application;
  profile: ApplicantProfile;
  job: JobListing;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Melamar' },
  { value: 'reviewed', label: 'Ditinjau' },
  { value: 'shortlisted', label: 'Shortlist' },
  { value: 'interview_scheduled', label: 'Jadwal Interview' },
  { value: 'hired', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
];

function formatSalary(min: number, max: number) {
  const fmt = (n: number) => `${Math.round(n / 1000000)}jt`;
  if (!min && !max) return 'Nego';
  if (min && max) return `Rp ${fmt(min)} - ${fmt(max)}`;
  return min ? `Rp ${fmt(min)}+` : '';
}

export default function Applicants() {
  const { user, session } = useAuth();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applicants, setApplicants] = useState<ApplicantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);
  const [interviewModal, setInterviewModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ scheduled_at: '', location_or_link: '', notes: '' });
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    if (jobId) setSelectedJob(jobId);
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || !user) {
      setJobs([]);
      setApplicants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: comp } = await supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle();
    if (!comp) {
      setJobs([]);
      setApplicants([]);
      setLoading(false);
      return;
    }

    const { data: jobsData } = await supabase.from('job_listings').select('*').eq('company_id', comp.id).eq('status', 'active');
    setJobs(jobsData || []);

    if (jobsData?.length) {
      const jobIds = jobsData.map((job) => job.id);
      const { data: appsData } = await supabase
        .from('applications')
        .select('*, job_listings(*), seeker_profiles(*, seeker_skills(*), seeker_education(school_name, degree))')
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false });

      if (appsData) {
        setApplicants(
          (appsData as ApplicantApplicationRow[])
            .filter((application) => !!application.seeker_profiles && !!application.job_listings)
            .map((application) => ({
              application,
              profile: application.seeker_profiles as ApplicantProfile,
              job: application.job_listings as JobListing,
            }))
        );
      } else {
        setApplicants([]);
      }
    } else {
      setApplicants([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function updateStatus(appId: string, status: ApplicationStatus) {
    if (!supabase) return;

    setUpdatingId(appId);
    await supabase.from('applications').update({ status, updated_at: new Date().toISOString() }).eq('id', appId);

    setApplicants((prev) => prev.map((item) => (
      item.application.id === appId ? { ...item, application: { ...item.application, status } } : item
    )));

    if (selectedApplicant?.application.id === appId) {
      setSelectedApplicant((prev) => (prev ? { ...prev, application: { ...prev.application, status } } : null));
    }

    const application = applicants.find((item) => item.application.id === appId);
    if (application && session?.access_token) {
      try {
        await fetch('/api/application-status-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            applicationId: appId,
            status,
          }),
        });
      } catch (error) {
        console.warn('Gagal mengirim notifikasi status lamaran:', error);
      }
    }

    setUpdatingId('');
  }

  async function sendInterviewInvite() {
    if (!supabase || !selectedApplicant || !interviewForm.scheduled_at) return;

    await supabase.from('interview_invitations').insert({
      application_id: selectedApplicant.application.id,
      scheduled_at: interviewForm.scheduled_at,
      location_or_link: interviewForm.location_or_link,
      notes: interviewForm.notes,
    });

    await updateStatus(selectedApplicant.application.id, 'interview_scheduled');
    setInterviewModal(false);
    setInterviewForm({ scheduled_at: '', location_or_link: '', notes: '' });
  }

  const filtered = applicants.filter((item) => {
    if (selectedJob !== 'all' && item.application.job_id !== selectedJob) return false;
    if (filterStatus !== 'all' && item.application.status !== filterStatus) return false;
    return true;
  });

  return (
    <EmployerLayout currentPath="/employer/applicants">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Manajemen Pelamar</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} pelamar {selectedJob !== 'all' ? 'untuk lowongan ini' : 'dari semua lowongan'}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="appearance-none rounded-xl border border-sky-200 bg-white px-4 py-2 pr-8 text-sm text-slate-700 outline-none focus:border-sky-500"
          >
            <option value="all">Semua Lowongan</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-xl px-3 py-2 text-xs font-medium border transition-all ${filterStatus === 'all' ? 'gradient-cta text-white border-transparent' : 'bg-white text-slate-600 border-sky-200'}`}
          >
            Semua
          </button>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`rounded-xl px-3 py-2 text-xs font-medium border transition-all ${filterStatus === value ? 'gradient-cta text-white border-transparent' : 'bg-white text-slate-600 border-sky-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-5">
        <div className={`${selectedApplicant ? 'hidden lg:block lg:w-[380px] flex-shrink-0' : 'flex-1'}`}>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-sky-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-sky-100 bg-white py-16 text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-sky-200" />
              <p className="font-medium text-slate-500">Belum ada pelamar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(({ application, profile, job }) => (
                <div
                  key={application.id}
                  onClick={() => setSelectedApplicant({ application, profile, job })}
                  className={`cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                    selectedApplicant?.application.id === application.id
                      ? 'border-sky-400 shadow-md shadow-sky-100'
                      : 'border-sky-100 hover:border-sky-200 card-hover'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="gradient-cta flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold text-white">
                      {(profile.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{profile.full_name || 'Pelamar'}</p>
                        <ApplicationStatusBadge status={application.status} />
                      </div>
                      <p className="truncate text-xs text-slate-500">{job.title}</p>
                      {profile.domicile_city && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3 text-cyan-400" /> {profile.domicile_city}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedApplicant && (
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
              <div className="gradient-card relative h-20">
                <button
                  onClick={() => setSelectedApplicant(null)}
                  className="absolute right-3 top-3 rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 pb-6">
                <div className="-mt-9 mb-4 flex items-end gap-4">
                  <div className="gradient-cta flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-white text-2xl font-black text-white shadow-xl">
                    {(selectedApplicant.profile.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="mb-2">
                    <h2 className="text-lg font-black leading-tight text-slate-800">{selectedApplicant.profile.full_name}</h2>
                    {selectedApplicant.profile.domicile_city && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 text-cyan-400" /> {selectedApplicant.profile.domicile_city}
                      </p>
                    )}
                  </div>
                  <div className="mb-2 ml-auto">
                    <ApplicationStatusBadge status={selectedApplicant.application.status} />
                  </div>
                </div>

                <p className="mb-4 text-xs text-slate-500">
                  Melamar untuk: <span className="font-semibold text-slate-700">{selectedApplicant.job.title}</span>
                </p>

                {selectedApplicant.profile.about && (
                  <div className="mb-4">
                    <p className="text-xs leading-relaxed text-slate-500">{selectedApplicant.profile.about}</p>
                  </div>
                )}

                {(selectedApplicant.profile.expected_salary_min || selectedApplicant.profile.expected_salary_max) && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 p-3">
                    <Briefcase className="h-4 w-4 text-sky-500" />
                    <div>
                      <p className="text-[10px] text-slate-500">Ekspektasi Gaji</p>
                      <p className="text-sm font-semibold text-sky-600">
                        {formatSalary(selectedApplicant.profile.expected_salary_min, selectedApplicant.profile.expected_salary_max)} / bulan
                      </p>
                    </div>
                  </div>
                )}

                {selectedApplicant.profile.seeker_skills?.length ? (
                  <div className="mb-4">
                    <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Tag className="h-3.5 w-3.5 text-sky-500" /> Keahlian
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApplicant.profile.seeker_skills.map((skill) => (
                        <span key={skill.id} className="badge border-sky-200 bg-sky-50 text-sky-600">{skill.skill_name}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedApplicant.profile.seeker_education?.length ? (
                  <div className="mb-4">
                    <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <GraduationCap className="h-3.5 w-3.5 text-sky-500" /> Pendidikan
                    </p>
                    {selectedApplicant.profile.seeker_education.map((education, index) => (
                      <p key={`${education.school_name}-${index}`} className="text-xs text-slate-600">
                        {education.degree} - {education.school_name}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 border-t border-sky-100 pt-4">
                  <p className="mb-3 text-xs font-semibold text-slate-700">Ubah Status</p>
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {STATUS_OPTIONS.filter((item) => item.value !== 'applied').map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => updateStatus(selectedApplicant.application.id, value)}
                        disabled={selectedApplicant.application.status === value || updatingId === selectedApplicant.application.id}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 ${
                          selectedApplicant.application.status === value
                            ? value === 'rejected' ? 'border-red-200 bg-red-100 text-red-600' : 'gradient-cta border-transparent text-white'
                            : value === 'rejected' ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-sky-200 text-sky-600 hover:bg-sky-50'
                        }`}
                      >
                        {value === 'hired' && <CheckCircle className="mr-1 inline h-3 w-3" />}
                        {value === 'rejected' && <XCircle className="mr-1 inline h-3 w-3" />}
                        {label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setInterviewModal(true)}
                    className="gradient-cta flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-95"
                  >
                    <Calendar className="h-4 w-4" /> Undang Interview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {interviewModal && selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setInterviewModal(false)} />
          <div className="relative w-full max-w-md animate-fade-up rounded-3xl border border-sky-100 bg-white p-8 shadow-2xl">
            <div className="-mx-8 -mt-8 mb-6 h-1 rounded-full rounded-t-3xl gradient-cta" />
            <button onClick={() => setInterviewModal(false)} className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-sky-600">
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 text-lg font-black text-slate-800">Undang Interview</h3>
            <p className="mb-5 text-sm text-slate-500">
              Kirim undangan interview ke <span className="font-semibold text-slate-700">{selectedApplicant.profile.full_name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Jadwal Interview</label>
                <input
                  type="datetime-local"
                  value={interviewForm.scheduled_at}
                  onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Lokasi / Link Meeting</label>
                <input
                  value={interviewForm.location_or_link}
                  onChange={(e) => setInterviewForm({ ...interviewForm, location_or_link: e.target.value })}
                  placeholder="Kantor, Google Meet link, Zoom link..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Catatan (opsional)</label>
                <textarea
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                  placeholder="Persiapan yang perlu dibawa, dresscode, dll."
                  className="input-field h-20 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setInterviewModal(false)}
                className="flex-1 rounded-xl border border-sky-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-sky-50"
              >
                Batal
              </button>
              <button
                onClick={sendInterviewInvite}
                disabled={!interviewForm.scheduled_at}
                className="gradient-cta flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <Calendar className="h-4 w-4" /> Kirim Undangan
              </button>
            </div>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
}
