import { useEffect, useState } from 'react';
import {
  Search,
  Sparkles,
  Briefcase,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import JobList from '../../components/JobList';
import JobDetailModal from '../../components/jobs/JobDetailModal';
import AuthModal from '../auth/AuthModal';
import PublicMobileBottomNav from '../../components/layout/PublicMobileBottomNav';
import { UserRole } from '../../lib/types';

export default function Browse() {
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
    setAuthInitialRole(role);
    setAuthMode('register');
  };

  const isFreelancer =
    typeof window !== 'undefined' &&
    (window.location.search.includes('category=freelance') ||
      window.location.search.includes('preview_role=freelancer') ||
      window.location.search.includes('role=freelancer'));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-black pb-20 md:pb-0">
      {/* Public Navbar */}
      <Navbar
        onLogin={() => setAuthMode('login')}
        onRegister={handleOpenRegister}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/60 p-6 sm:p-10 shadow-2xl">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {isFreelancer
                  ? 'Katalog Jasa & Lowongan Remote LOXER'
                  : 'LOXER Unified Job Hub — Pusat Lowongan Indonesia & Global'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              {isFreelancer ? 'Katalog Jasa &' : 'Cari Lowongan Kerja'}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400">
                {isFreelancer ? 'Proyek Freelance' : 'Indonesia & Global'}
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {isFreelancer
                ? 'Temukan proyek lepas (freelance), micro-gigs, dan jasa profesional terbaik dari talent terverifikasi LOXER.'
                : 'Pencarian terintegrasi dari Jooble Indonesia, mitra resmi terverifikasi LOXER, Careerjet, dan feed publik Arbeitnow langsung dari satu pintu.'}
            </p>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="/talents"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-slate-950 bg-gradient-to-r from-sky-400 to-cyan-300 hover:from-sky-300 hover:to-cyan-200 shadow-lg shadow-sky-500/20 transition-all transform hover:-translate-y-0.5"
              >
                <Search className="w-4 h-4" />
                Cari Talent Siap Kerja
                <ArrowRight className="w-4 h-4" />
              </a>

              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Rekrutmen & Lamaran Terproteksi di Platform</span>
              </div>
            </div>

            {/* Provider stat pills */}
            <div className="pt-1 flex flex-wrap gap-2">
              {[
                { label: 'Jooble Indonesia', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
                { label: 'Mitra LOXER', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Careerjet', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
                { label: 'Arbeitnow Global', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
              ].map((src) => (
                <span
                  key={src.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${src.color}`}
                >
                  <Briefcase className="w-3 h-3" />
                  {src.label}
                </span>
              ))}
            </div>
          </div>
        </section>

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

      {/* Public Footer */}
      <Footer />

      {/* Mobile Bottom Navigation Bar for Mobile Visitors */}
      <PublicMobileBottomNav
        currentPath="/browse"
        onLogin={() => setAuthMode('login')}
      />
    </div>
  );
}
