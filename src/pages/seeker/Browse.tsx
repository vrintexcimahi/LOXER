import { useEffect, useState } from 'react';
import SeekerLayout from '../../components/layout/SeekerLayout';
import JobList from '../../components/JobList';
import JobDetailModal from '../../components/jobs/JobDetailModal';
import AuthModal from '../auth/AuthModal';

export default function Browse() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [contractType, setContractType] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [provider, setProvider] = useState('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobData, setSelectedJobData] = useState<Record<string, unknown> | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get('q') || '');
      setLocation(params.get('location') || '');
      setPage(Number(params.get('page') || '1') || 1);
      setContractType(params.get('contract_type') || '');
      setWorkHours(params.get('work_hours') || '');
      setProvider(params.get('provider') || 'all');
      setSelectedJobId(params.get('job_id') || null);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const handleSelectJob = (job: Record<string, unknown>) => {
    const id = (job.job_id || job.id) as string | undefined;
    if (!id) return;
    setSelectedJobId(id);
    setSelectedJobData(job);

    const params = new URLSearchParams(window.location.search);
    params.set('job_id', id);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleCloseDetail = () => {
    setSelectedJobId(null);
    setSelectedJobData(null);

    const params = new URLSearchParams(window.location.search);
    params.delete('job_id');
    const remaining = params.toString();
    const newUrl = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
  };

  return (
    <SeekerLayout currentPath="/seeker/browse">
      <div className="relative mb-6 overflow-hidden rounded-3xl gradient-hero p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400 opacity-10 blur-3xl" />
        <h1 className="mb-1 text-2xl font-black text-white">Cari Lowongan Indonesia & Global</h1>
        <p className="text-sm text-slate-300">
          Jelajahi lowongan kerja terpercaya dari Jooble Indonesia, mitra resmi LOXER, Careerjet, dan feed Arbeitnow dalam satu pencarian.
        </p>
      </div>

      <JobList
        initialKeywords={searchQuery}
        initialLocation={location}
        initialPage={page}
        initialContractType={contractType}
        initialWorkHours={workHours}
        initialProvider={provider}
        onSelectJob={handleSelectJob}
      />

      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          initialJob={selectedJobData}
          onClose={handleCloseDetail}
          onRequireAuth={(mode) => setAuthModalMode(mode)}
        />
      )}

      {authModalMode && (
        <AuthModal
          mode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSwitchMode={(mode) => setAuthModalMode(mode)}
        />
      )}
    </SeekerLayout>
  );
}

