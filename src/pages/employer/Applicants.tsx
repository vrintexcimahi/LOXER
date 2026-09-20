import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  MapPin,
  GraduationCap,
  Briefcase,
  Tag,
  ChevronDown,
  Calendar,
  X,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  MessageCircle,
  CheckSquare,
  Square,
  Clock,
  Phone,
} from 'lucide-react';
import EmployerLayout from '../../components/layout/EmployerLayout';
import ApplicationStatusBadge from '../../components/ui/ApplicationStatusBadge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import {
  Application,
  ApplicationStatus,
  Company,
  InterviewInvitation,
  JobListing,
  SeekerEducation,
  SeekerProfile,
  SeekerSkill,
} from '../../lib/types';
import {
  exportToCsv,
  formatFormalDate,
  generateWhatsAppInterviewLink,
  openPrintInterviewLetter,
} from '../../lib/employerFeatures';

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

const DATE_FILTER_OPTIONS: { value: 'all' | '7d' | '30d' | 'this_month'; label: string }[] = [
  { value: 'all', label: 'Semua Waktu' },
  { value: '7d', label: '7 Hari Terakhir' },
  { value: '30d', label: '30 Hari Terakhir' },
  { value: 'this_month', label: 'Bulan Ini' },
];

function formatSalary(min: number, max: number) {
  const fmt = (n: number) => `${Math.round(n / 1000000)}jt`;
  if (!min && !max) return 'Nego';
  if (min && max) return `Rp ${fmt(min)} - ${fmt(max)}`;
  return min ? `Rp ${fmt(min)}+` : '';
}

export default function Applicants() {
  const { user, session } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applicants, setApplicants] = useState<ApplicantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | 'this_month'>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);

  // Invitation detail for selected applicant
  const [currentInvitation, setCurrentInvitation] = useState<InterviewInvitation | null>(null);

  // Single Interview Modal
  const [interviewModal, setInterviewModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    scheduled_at: '',
    location_or_link: '',
    notes: '',
    autoPrint: true,
    autoWhatsApp: false,
  });

  // Bulk Selection & Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkInterviewModal, setBulkInterviewModal] = useState(false);
  const [bulkInterviewForm, setBulkInterviewForm] = useState({
    scheduled_at: '',
    location_or_link: '',
    notes: '',
  });

  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    if (jobId) setSelectedJob(jobId);
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase || !user) {
      setCompany(null);
      setJobs([]);
      setApplicants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: comp } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setCompany(comp || null);

    if (!comp) {
      setJobs([]);
      setApplicants([]);
      setLoading(false);
      return;
    }

    const { data: jobsData } = await supabase
      .from('job_listings')
      .select('*')
      .eq('company_id', comp.id)
      .order('created_at', { ascending: false });

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

  const selectedApplicantId = selectedApplicant?.application.id;
  const selectedApplicantStatus = selectedApplicant?.application.status;

  // Load invitation whenever selected applicant changes
  useEffect(() => {
    async function loadInvitation() {
      if (!supabase || !selectedApplicantId) {
        setCurrentInvitation(null);
        return;
      }

      const { data } = await supabase
        .from('interview_invitations')
        .select('*')
        .eq('application_id', selectedApplicantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentInvitation((data as InterviewInvitation) || null);
    }

    void loadInvitation();
  }, [selectedApplicantId, selectedApplicantStatus]);

  async function updateStatus(appId: string, status: ApplicationStatus) {
    if (!supabase) return;

    setUpdatingId(appId);
    await supabase.from('applications').update({ status, updated_at: new Date().toISOString() }).eq('id', appId);

    setApplicants((prev) =>
      prev.map((item) =>
        item.application.id === appId ? { ...item, application: { ...item.application, status } } : item
      )
    );

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

    const { data: invData } = await supabase
      .from('interview_invitations')
      .insert({
        application_id: selectedApplicant.application.id,
        scheduled_at: interviewForm.scheduled_at,
        location_or_link: interviewForm.location_or_link,
        notes: interviewForm.notes,
      })
      .select('*')
      .maybeSingle();

    if (invData) {
      setCurrentInvitation(invData as InterviewInvitation);
    }

    await updateStatus(selectedApplicant.application.id, 'interview_scheduled');

    const invitationPayload = {
      companyName: company?.name || 'Perusahaan',
      companyCity: company?.city || selectedApplicant.job.location_city,
      applicantName: selectedApplicant.profile.full_name || 'Kandidat',
      applicantPhone: selectedApplicant.profile.phone,
      jobTitle: selectedApplicant.job.title,
      scheduledAt: interviewForm.scheduled_at,
      locationOrLink: interviewForm.location_or_link || 'Kantor Perusahaan',
      notes: interviewForm.notes,
    };

    if (interviewForm.autoPrint) {
      openPrintInterviewLetter(invitationPayload);
    }

    if (interviewForm.autoWhatsApp) {
      const waLink = generateWhatsAppInterviewLink(invitationPayload);
      window.open(waLink, '_blank');
    }

    setInterviewModal(false);
    setInterviewForm({
      scheduled_at: '',
      location_or_link: '',
      notes: '',
      autoPrint: true,
      autoWhatsApp: false,
    });
  }

  // --- Bulk Selection & Operations ---
  const toggleSelectApplicant = (appId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filtered.map((item) => item.application.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  async function handleBulkStatusChange(status: ApplicationStatus) {
    if (!supabase || selectedIds.length === 0) return;
    setBulkLoading(true);

    try {
      for (const appId of selectedIds) {
        await supabase
          .from('applications')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', appId);

        if (session?.access_token) {
          try {
            await fetch('/api/application-status-notification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ applicationId: appId, status }),
            });
          } catch {
            // ignore notification failure
          }
        }
      }

      setApplicants((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.application.id)
            ? { ...item, application: { ...item.application, status } }
            : item
        )
      );

      if (selectedApplicant && selectedIds.includes(selectedApplicant.application.id)) {
        setSelectedApplicant((prev) =>
          prev ? { ...prev, application: { ...prev.application, status } } : null
        );
      }

      setSelectedIds([]);
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkInterviewInvite() {
    if (!supabase || selectedIds.length === 0 || !bulkInterviewForm.scheduled_at) return;
    setBulkLoading(true);

    try {
      for (const appId of selectedIds) {
        await supabase.from('interview_invitations').insert({
          application_id: appId,
          scheduled_at: bulkInterviewForm.scheduled_at,
          location_or_link: bulkInterviewForm.location_or_link,
          notes: bulkInterviewForm.notes,
        });

        await supabase
          .from('applications')
          .update({ status: 'interview_scheduled', updated_at: new Date().toISOString() })
          .eq('id', appId);

        if (session?.access_token) {
          try {
            await fetch('/api/application-status-notification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ applicationId: appId, status: 'interview_scheduled' }),
            });
          } catch {
            // ignore
          }
        }
      }

      setApplicants((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.application.id)
            ? { ...item, application: { ...item.application, status: 'interview_scheduled' } }
            : item
        )
      );

      setBulkInterviewModal(false);
      setBulkInterviewForm({ scheduled_at: '', location_or_link: '', notes: '' });
      setSelectedIds([]);
    } finally {
      setBulkLoading(false);
    }
  }

  // --- CSV Exporter ---
  const handleExportCsv = () => {
    if (filtered.length === 0) return;

    const headers = [
      'Nama Pelamar',
      'Lowongan',
      'Status Lamaran',
      'Kota Domisili',
      'No Telepon',
      'Ekspektasi Gaji Min',
      'Ekspektasi Gaji Max',
      'Tanggal Melamar',
      'Pendidikan Terakhir',
      'Keahlian',
    ];

    const rows = filtered.map((item) => {
      const edu = item.profile.seeker_education?.[0]
        ? `${item.profile.seeker_education[0].degree || ''} ${item.profile.seeker_education[0].school_name || ''}`.trim()
        : '-';
      const skills = item.profile.seeker_skills?.map((s) => s.skill_name).join('; ') || '-';
      const statusLabel =
        STATUS_OPTIONS.find((o) => o.value === item.application.status)?.label || item.application.status;

      return [
        item.profile.full_name || 'Tanpa Nama',
        item.job.title,
        statusLabel,
        item.profile.domicile_city || '-',
        item.profile.phone || '-',
        item.profile.expected_salary_min || 0,
        item.profile.expected_salary_max || 0,
        new Date(item.application.applied_at).toLocaleDateString('id-ID'),
        edu,
        skills,
      ];
    });

    const jobSlug =
      selectedJob !== 'all'
        ? jobs.find((j) => j.id === selectedJob)?.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'lowongan'
        : 'semua-lowongan';
    const filename = `pelamar-${jobSlug}-${new Date().toISOString().slice(0, 10)}`;

    exportToCsv(filename, headers, rows);
  };

  // --- Filtering Logic ---
  const filtered = applicants.filter((item) => {
    if (selectedJob !== 'all' && item.application.job_id !== selectedJob) return false;
    if (filterStatus !== 'all' && item.application.status !== filterStatus) return false;

    if (dateFilter !== 'all') {
      const appTime = new Date(item.application.applied_at).getTime();
      const now = Date.now();
      if (dateFilter === '7d' && now - appTime > 7 * 24 * 60 * 60 * 1000) return false;
      if (dateFilter === '30d' && now - appTime > 30 * 24 * 60 * 60 * 1000) return false;
      if (dateFilter === 'this_month') {
        const appDate = new Date(item.application.applied_at);
        const today = new Date();
        if (appDate.getMonth() !== today.getMonth() || appDate.getFullYear() !== today.getFullYear()) {
          return false;
        }
      }
    }

    return true;
  });

  const isAllVisibleSelected =
    filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.application.id));

  return (
    <EmployerLayout currentPath="/employer/applicants">
      {/* Header Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Manajemen Pelamar</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} pelamar {selectedJob !== 'all' ? 'untuk lowongan ini' : 'dari semua lowongan'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs font-semibold text-sky-700 shadow-sm transition-all hover:bg-sky-50 active:scale-95 disabled:opacity-50"
            title="Ekspor daftar pelamar ke format Excel CSV"
          >
            <Download className="h-4 w-4 text-sky-600" /> Ekspor CSV ({filtered.length})
          </button>

          {/* Toggle Select All Button */}
          <button
            onClick={toggleSelectAll}
            disabled={filtered.length === 0}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
              isAllVisibleSelected
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            } disabled:opacity-50`}
          >
            {isAllVisibleSelected ? <CheckSquare className="h-4 w-4 text-sky-600" /> : <Square className="h-4 w-4 text-slate-400" />}
            <span>{isAllVisibleSelected ? 'Batalkan Semua' : 'Pilih Semua'}</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Job Selector */}
        <div className="relative">
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="appearance-none rounded-xl border border-sky-200 bg-white px-4 py-2 pr-8 text-sm text-slate-700 outline-none focus:border-sky-500"
          >
            <option value="all">Semua Lowongan</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
                {job.status === 'closed' ? ' (Ditutup)' : job.status === 'draft' ? ' (Draft)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'all' | '7d' | '30d' | 'this_month')}
            className="appearance-none rounded-xl border border-sky-200 bg-white px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-sky-500"
          >
            {DATE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                📅 {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-xl px-3 py-2 text-xs font-medium border transition-all ${
              filterStatus === 'all'
                ? 'gradient-cta text-white border-transparent'
                : 'bg-white text-slate-600 border-sky-200 hover:border-sky-300'
            }`}
          >
            Semua
          </button>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`rounded-xl px-3 py-2 text-xs font-medium border transition-all ${
                filterStatus === value
                  ? 'gradient-cta text-white border-transparent'
                  : 'bg-white text-slate-600 border-sky-200 hover:border-sky-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: List & Details */}
      <div className="flex gap-5">
        {/* Left Column: List */}
        <div className={`${selectedApplicant ? 'hidden lg:block lg:w-[380px] flex-shrink-0' : 'flex-1'}`}>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-sky-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-sky-100 bg-white py-16 text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-sky-200" />
              <p className="font-medium text-slate-500">Belum ada pelamar sesuai filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(({ application, profile, job }) => {
                const isSelected = selectedIds.includes(application.id);
                const isCurrentActive = selectedApplicant?.application.id === application.id;

                return (
                  <div
                    key={application.id}
                    onClick={() => setSelectedApplicant({ application, profile, job })}
                    className={`group relative cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/50 shadow-sky-100'
                        : isCurrentActive
                        ? 'border-sky-400 bg-white shadow-md shadow-sky-100'
                        : 'border-sky-100 bg-white hover:border-sky-200 card-hover'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox Trigger */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelectApplicant(application.id, e)}
                        className="mt-1 flex-shrink-0 text-slate-400 hover:text-sky-600"
                        title={isSelected ? 'Hapus pilihan' : 'Pilih pelamar'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-sky-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </button>

                      {/* Avatar */}
                      <div className="gradient-cta flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold text-white">
                        {(profile.full_name || '?')[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {profile.full_name || 'Pelamar'}
                          </p>
                          <ApplicationStatusBadge status={application.status} />
                        </div>
                        <p className="truncate text-xs text-slate-500">{job.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                          {profile.domicile_city ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-cyan-400" /> {profile.domicile_city}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span>{new Date(application.applied_at).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Applicant Profile & Actions */}
        {selectedApplicant && (
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
              {/* Header Cover */}
              <div className="gradient-card relative h-20">
                <button
                  onClick={() => setSelectedApplicant(null)}
                  className="absolute right-3 top-3 rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 pb-6">
                {/* Profile Header */}
                <div className="-mt-9 mb-4 flex items-end gap-4">
                  <div className="gradient-cta flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-white text-2xl font-black text-white shadow-xl">
                    {(selectedApplicant.profile.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="mb-2">
                    <h2 className="text-lg font-black leading-tight text-slate-800">
                      {selectedApplicant.profile.full_name}
                    </h2>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {selectedApplicant.profile.domicile_city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-cyan-400" /> {selectedApplicant.profile.domicile_city}
                        </span>
                      )}
                      {selectedApplicant.profile.phone && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Phone className="h-3 w-3 text-emerald-500" /> {selectedApplicant.profile.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-2 ml-auto">
                    <ApplicationStatusBadge status={selectedApplicant.application.status} />
                  </div>
                </div>

                <p className="mb-4 text-xs text-slate-500">
                  Melamar untuk: <span className="font-semibold text-slate-700">{selectedApplicant.job.title}</span>
                </p>

                {/* About candidate */}
                {selectedApplicant.profile.about && (
                  <div className="mb-4">
                    <p className="text-xs leading-relaxed text-slate-500">{selectedApplicant.profile.about}</p>
                  </div>
                )}

                {/* Expected Salary */}
                {(selectedApplicant.profile.expected_salary_min || selectedApplicant.profile.expected_salary_max) && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 p-3">
                    <Briefcase className="h-4 w-4 text-sky-500" />
                    <div>
                      <p className="text-[10px] text-slate-500">Ekspektasi Gaji</p>
                      <p className="text-sm font-semibold text-sky-600">
                        {formatSalary(
                          selectedApplicant.profile.expected_salary_min,
                          selectedApplicant.profile.expected_salary_max
                        )}{' '}
                        / bulan
                      </p>
                    </div>
                  </div>
                )}

                {/* Skills */}
                {selectedApplicant.profile.seeker_skills?.length ? (
                  <div className="mb-4">
                    <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Tag className="h-3.5 w-3.5 text-sky-500" /> Keahlian
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApplicant.profile.seeker_skills.map((skill) => (
                        <span key={skill.id} className="badge border-sky-200 bg-sky-50 text-sky-600">
                          {skill.skill_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Education */}
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

                {/* --- Scheduled Interview Card & Actions --- */}
                {selectedApplicant.application.status === 'interview_scheduled' && (
                  <div className="mb-5 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/70 to-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                          <Calendar className="h-4 w-4" />
                        </span>
                        <h4 className="text-xs font-bold text-slate-800">Tahap Wawancara (Interview) Terjadwal</h4>
                      </div>
                      <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold text-cyan-800">
                        Aktif
                      </span>
                    </div>

                    {currentInvitation ? (
                      <div className="mb-3 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-sky-500" />
                          <span>
                            <strong>Jadwal:</strong> {formatFormalDate(currentInvitation.scheduled_at).fullDate},{' '}
                            {formatFormalDate(currentInvitation.scheduled_at).time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-cyan-500" />
                          <span>
                            <strong>Lokasi / Link:</strong> {currentInvitation.location_or_link || 'Kantor'}
                          </span>
                        </div>
                        {currentInvitation.notes && (
                          <div className="mt-1 rounded-lg bg-white p-2 text-[11px] text-slate-500 border border-sky-100">
                            <strong>Catatan:</strong> {currentInvitation.notes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mb-3 text-xs text-slate-500">
                        Kandidat telah berstatus terjadwal interview. Anda dapat mencetak surat resmi atau mengirimkan
                        undangan melalui WhatsApp.
                      </p>
                    )}

                    {/* Action buttons for Interview letter and WhatsApp */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          openPrintInterviewLetter({
                            companyName: company?.name || 'Perusahaan',
                            companyCity: company?.city || selectedApplicant.job.location_city,
                            applicantName: selectedApplicant.profile.full_name || 'Kandidat',
                            applicantPhone: selectedApplicant.profile.phone,
                            jobTitle: selectedApplicant.job.title,
                            scheduledAt: currentInvitation?.scheduled_at || new Date().toISOString(),
                            locationOrLink: currentInvitation?.location_or_link || 'Kantor Perusahaan',
                            notes: currentInvitation?.notes,
                          });
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-white py-2 text-xs font-bold text-sky-700 shadow-sm transition-all hover:bg-sky-50 active:scale-95"
                      >
                        <Printer className="h-3.5 w-3.5 text-sky-600" /> Cetak / PDF Surat
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const waUrl = generateWhatsAppInterviewLink({
                            companyName: company?.name || 'Perusahaan',
                            companyCity: company?.city || selectedApplicant.job.location_city,
                            applicantName: selectedApplicant.profile.full_name || 'Kandidat',
                            applicantPhone: selectedApplicant.profile.phone,
                            jobTitle: selectedApplicant.job.title,
                            scheduledAt: currentInvitation?.scheduled_at || new Date().toISOString(),
                            locationOrLink: currentInvitation?.location_or_link || 'Kantor Perusahaan',
                            notes: currentInvitation?.notes,
                          });
                          window.open(waUrl, '_blank');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Kirim via WhatsApp
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Update Buttons */}
                <div className="mt-4 border-t border-sky-100 pt-4">
                  <p className="mb-3 text-xs font-semibold text-slate-700">Ubah Status</p>
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {STATUS_OPTIONS.filter((item) => item.value !== 'applied').map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => updateStatus(selectedApplicant.application.id, value)}
                        disabled={
                          selectedApplicant.application.status === value ||
                          updatingId === selectedApplicant.application.id
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 ${
                          selectedApplicant.application.status === value
                            ? value === 'rejected'
                              ? 'border-red-200 bg-red-100 text-red-600'
                              : 'gradient-cta border-transparent text-white'
                            : value === 'rejected'
                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                            : 'border-sky-200 text-sky-600 hover:bg-sky-50'
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
                    <Calendar className="h-4 w-4" /> Undang / Ubah Jadwal Interview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Floating Bulk Action Bar --- */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md transition-all animate-fade-up sm:gap-3 sm:px-6">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-3 sm:pr-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="hidden text-xs font-medium text-slate-300 sm:inline">Pelamar Terpilih</span>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleBulkStatusChange('shortlisted')}
              disabled={bulkLoading}
              className="rounded-xl border border-sky-500/30 bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 transition-all hover:bg-sky-500/30 active:scale-95 disabled:opacity-50"
            >
              Shortlist
            </button>

            <button
              onClick={() => setBulkInterviewModal(true)}
              disabled={bulkLoading}
              className="rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-cyan-500 active:scale-95 disabled:opacity-50"
            >
              Interview Bersama
            </button>

            <button
              onClick={() => handleBulkStatusChange('hired')}
              disabled={bulkLoading}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30 active:scale-95 disabled:opacity-50"
            >
              Terima
            </button>

            <button
              onClick={() => handleBulkStatusChange('rejected')}
              disabled={bulkLoading}
              className="rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
            >
              Tolak
            </button>
          </div>

          {/* Cancel Selection */}
          <button
            onClick={() => setSelectedIds([])}
            className="ml-1 rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
            title="Batalkan Pilihan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* --- Single Interview Modal --- */}
      {interviewModal && selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setInterviewModal(false)} />
          <div className="relative w-full max-w-md animate-fade-up rounded-3xl border border-sky-100 bg-white p-8 shadow-2xl">
            <div className="-mx-8 -mt-8 mb-6 h-1 rounded-full rounded-t-3xl gradient-cta" />
            <button
              onClick={() => setInterviewModal(false)}
              className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-sky-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 text-lg font-black text-slate-800">Undang Wawancara (Interview)</h3>
            <p className="mb-5 text-sm text-slate-500">
              Kirim jadwal interview ke <span className="font-semibold text-slate-700">{selectedApplicant.profile.full_name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Jadwal Interview *</label>
                <input
                  type="datetime-local"
                  value={interviewForm.scheduled_at}
                  onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label">Lokasi / Link Meeting Virtual</label>
                <input
                  value={interviewForm.location_or_link}
                  onChange={(e) => setInterviewForm({ ...interviewForm, location_or_link: e.target.value })}
                  placeholder="Contoh: Kantor Utama, Google Meet, Zoom..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Catatan Tambahan (opsional)</label>
                <textarea
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                  placeholder="Dresscode, berkas portofolio yang perlu disiapkan, dll."
                  className="input-field h-20 resize-none"
                />
              </div>

              {/* Automatic dispatch toggles */}
              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interviewForm.autoPrint}
                    onChange={(e) => setInterviewForm({ ...interviewForm, autoPrint: e.target.checked })}
                    className="rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Langsung buka pratinjau cetak / simpan PDF surat undangan</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interviewForm.autoWhatsApp}
                    onChange={(e) => setInterviewForm({ ...interviewForm, autoWhatsApp: e.target.checked })}
                    className="rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Buka pesan WhatsApp resmi ke nomor kandidat ({selectedApplicant.profile.phone || 'Nomor HP'})</span>
                </label>
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
                <Calendar className="h-4 w-4" /> Simpan & Undang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Bulk Interview Modal --- */}
      {bulkInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setBulkInterviewModal(false)}
          />
          <div className="relative w-full max-w-md animate-fade-up rounded-3xl border border-sky-100 bg-white p-8 shadow-2xl">
            <div className="-mx-8 -mt-8 mb-6 h-1 rounded-full rounded-t-3xl gradient-cta" />
            <button
              onClick={() => setBulkInterviewModal(false)}
              className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-sky-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 text-lg font-black text-slate-800">Undang Interview Bersama</h3>
            <p className="mb-5 text-sm text-slate-500">
              Jadwalkan wawancara sekaligus untuk{' '}
              <span className="font-bold text-sky-600">{selectedIds.length} pelamar terpilih</span>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Jadwal Interview Bersama *</label>
                <input
                  type="datetime-local"
                  value={bulkInterviewForm.scheduled_at}
                  onChange={(e) => setBulkInterviewForm({ ...bulkInterviewForm, scheduled_at: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label">Lokasi / Link Meeting</label>
                <input
                  value={bulkInterviewForm.location_or_link}
                  onChange={(e) => setBulkInterviewForm({ ...bulkInterviewForm, location_or_link: e.target.value })}
                  placeholder="Google Meet, Zoom, atau Alamat Kantor..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Catatan Tambahan</label>
                <textarea
                  value={bulkInterviewForm.notes}
                  onChange={(e) => setBulkInterviewForm({ ...bulkInterviewForm, notes: e.target.value })}
                  placeholder="Informasi tahapan grup interview, tes teknis, dll."
                  className="input-field h-20 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setBulkInterviewModal(false)}
                className="flex-1 rounded-xl border border-sky-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-sky-50"
              >
                Batal
              </button>
              <button
                onClick={handleBulkInterviewInvite}
                disabled={!bulkInterviewForm.scheduled_at || bulkLoading}
                className="gradient-cta flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <Calendar className="h-4 w-4" /> {bulkLoading ? 'Memproses...' : 'Undang Semua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
}
