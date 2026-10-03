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
import HeroBannerSlideshow from '../../components/banner/HeroBannerSlideshow';
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

  const isFreelancer =
    typeof window !== 'undefined' &&
    (window.location.search.includes('category=freelance') ||
      window.location.search.includes('category=jasa') ||
      window.location.search.includes('preview_role=freelancer') ||
      window.location.search.includes('preview_role=jasa') ||
      window.location.search.includes('role=freelancer'));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-black pb-20 md:pb-0">
      {/* Public Navbar */}
      <Navbar
        onLogin={() => setAuthMode('login')}
        onRegister={handleOpenRegister}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero Section: Large Slideshow on Top, Compact Text Underneath */}
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/60 p-4 sm:p-6 lg:p-7 shadow-2xl">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          {/* 1. Large Slideshow on Top */}
          <div className="relative z-10 w-full mb-4 sm:mb-5">
            <HeroBannerSlideshow
              initialSlide={0}
              variant="embedded"
              onRegister={handleOpenRegister}
            />
          </div>

          {/* 2. Compact Text & Actions Below */}
          <div className="relative z-10 border-t border-white/10 pt-3.5 sm:pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>
                    {isFreelancer
                      ? 'Bursa Layanan Jasa Mandiri & Panggilan LOXER'
                      : 'LOXER Unified Job Hub — Pusat Lowongan Indonesia & Global'}
                  </span>
                </span>
              </div>

              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-snug">
                {isFreelancer ? 'Katalog Layanan Jasa &' : 'Cari Lowongan Kerja'}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400">
                  {isFreelancer ? 'Penyedia Jasa Mandiri' : 'Indonesia & Global'}
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {isFreelancer
                  ? 'Temukan penyedia jasa mandiri profesional: jasa pijat & refleksi, bengkel motor/mobil, servis komputer & elektronik, pertukangan, kebersihan, dan lainnya.'
                  : 'Pencarian terintegrasi dari mitra resmi terverifikasi LOXER, Facebook Group AI, dan Careerjet langsung dari satu pintu.'}
              </p>
            </div>

            {/* Quick Actions & Provider stat pills */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/talents"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-sky-400 to-cyan-300 hover:from-sky-300 hover:to-cyan-200 shadow-md shadow-sky-500/20 transition-all transform hover:-translate-y-0.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari Talent Siap Kerja
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>

                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rekrutmen Resmi</span>
                </div>
              </div>

              {/* Provider stat pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Mitra LOXER', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  { label: 'Facebook Group AI', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                  { label: 'Careerjet', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
                ].map((src) => (
                  <span
                    key={src.label}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${src.color}`}
                  >
                    <Briefcase className="w-2.5 h-2.5" />
                    {src.label}
                  </span>
                ))}
              </div>
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
