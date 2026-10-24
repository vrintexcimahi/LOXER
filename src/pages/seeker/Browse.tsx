import { useEffect, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import JobList from '../../components/JobList';
import JobDetailModal from '../../components/jobs/JobDetailModal';
import AuthModal from '../auth/AuthModal';
import PublicMobileBottomNav from '../../components/layout/PublicMobileBottomNav';
import { useAppAccess } from '../../contexts/AppAccessContext';
import { UserRole } from '../../lib/types';

export default function Browse() {
  const { requireApp } = useAppAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [contractType, setContractType] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [provider, setProvider] = useState('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobData, setSelectedJobData] = useState<Record<string, unknown> | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('seeker');

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
    const newUrl = remaining
      ? `${window.location.pathname}?${remaining}`
      : window.location.pathname;
    window.history.pushState({}, '', newUrl);
  };

  const handleOpenRegister = (role: UserRole = 'seeker') => {
    if (!requireApp('Mendaftar Akun')) {
      return;
    }
    setAuthInitialRole(role);
    setAuthMode('register');
  };

  // isFreelancer state cleaned up

  return (
    <div className="loxer-workspace min-h-screen bg-slate-50 dark:bg-[#071220] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-black pb-20 md:pb-0 transition-colors duration-200">
      {/* Public Navbar */}
      <Navbar
        onLogin={() => setAuthMode('login')}
        onRegister={handleOpenRegister}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-1 sm:pt-2 pb-6 sm:pb-8 space-y-5 sm:space-y-6">
        

        {/* Job List with built-in filters */}
        <JobList
          initialKeywords={searchQuery}
          initialLocation={location}
          initialPage={page}
          initialContractType={contractType}
          initialWorkHours={workHours}
          initialProvider={provider}
          onSelectJob={handleSelectJob}
        />
      </main>

      {/* Detail Modal */}
      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          initialJob={selectedJobData}
          onClose={handleCloseDetail}
          onRequireAuth={(mode) => setAuthMode(mode)}
        />
      )}

      {/* Auth Modal */}
      {authMode && (
        <AuthModal
          mode={authMode}
          initialRole={authInitialRole}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
        />
      )}

      {/* Footer removed from Browse page */}

      {/* Mobile Bottom Navigation Bar for Mobile Visitors */}
      <PublicMobileBottomNav
        currentPath="/browse"
        onLogin={() => setAuthMode('login')}
      />
    </div>
  );
}
