import { useEffect, useState } from 'react';
import {
  Briefcase,
  Compass,
  MapPinned,
  RefreshCw,
  Search,
  SearchX,
  Sparkles,
} from 'lucide-react';
import JobCard from './JobCard';
import JobSearch from './JobSearch';
import { fetchUnifiedJobs } from '../services/careerjetService';

function normalizeLocationOptions(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.locations)) return payload.locations;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

const PROVIDER_TAGS = [
  { id: 'all', label: '🌐 Semua Sumber' },
  { id: 'internal', label: '⭐ Mitra LOXER' },
  { id: 'facebook-group', label: '👥 Facebook Group AI' },
  { id: 'careerjet', label: '⚡ Careerjet' },
];

const JOB_CATEGORIES = [
  'Semua',
  'Teknologi & IT',
  'Desain & Kreatif',
  'Pemasaran & Digital',
  'Admin & Operasional',
  'F&B & Hospitality',
  'Logistik & Gudang',
];

const CONTRACT_OPTIONS = [
  { value: '', label: 'Semua Tipe Kontrak' },
  { value: 'permanent', label: 'Permanen' },
  { value: 'temporary', label: 'Temporer' },
  { value: 'freelance', label: 'Freelance' },
];

export default function JobList({
  initialKeywords = '',
  initialLocation = '',
  initialPage = 1,
  initialContractType = '',
  initialWorkHours = '',
  initialProvider = 'all',
  onSelectJob,
}) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [location, setLocation] = useState(initialLocation);
  const [contractType, setContractType] = useState(initialContractType);
  const [workHours, setWorkHours] = useState(initialWorkHours);
  const [provider, setProvider] = useState(initialProvider);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [jobs, setJobs] = useState([]);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [type, setType] = useState('JOBS');
  const [locationOptions, setLocationOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadJobs(
    nextPage,
    nextKeywords = keywords,
    nextLocation = location,
    nextContractType = contractType,
    nextWorkHours = workHours,
    nextProvider = provider
  ) {
    setLoading(true);
    setError('');

    try {
      const payload = await fetchUnifiedJobs({
        provider: nextProvider,
        keywords: nextKeywords,
        location: nextLocation,
        page: nextPage,
        sort: 'date',
        contract_type: nextContractType,
        work_hours: nextWorkHours,
      });

      if (payload?.needLocation) {
        setType('LOCATIONS');
        setJobs([]);
        setPages(0);
        setLocationOptions(normalizeLocationOptions(payload));
      } else {
        setType('JOBS');
        setJobs(Array.isArray(payload?.jobs) ? payload.jobs : []);
        setPages(Number(payload?.pages) || 0);
        setLocationOptions([]);
      }
    } catch (requestError) {
      setJobs([]);
      setPages(0);
      setLocationOptions([]);
      setType('JOBS');
      setError(requestError instanceof Error ? requestError.message : 'Gagal memuat lowongan LOXER.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setKeywords(initialKeywords);
    setLocation(initialLocation);
    setPage(initialPage);
    setContractType(initialContractType);
    setWorkHours(initialWorkHours);
    setProvider(initialProvider);
    void loadJobs(initialPage, initialKeywords, initialLocation, initialContractType, initialWorkHours, initialProvider);
  }, [initialKeywords, initialLocation, initialPage, initialContractType, initialWorkHours, initialProvider]);

  function syncUrl(
    nextKeywords,
    nextLocation,
    nextPage = 1,
    nextContractType = contractType,
    nextWorkHours = workHours,
    nextProvider = provider
  ) {
    const params = new URLSearchParams();
    if (nextKeywords) params.set('q', nextKeywords);
    if (nextLocation) params.set('location', nextLocation);
    if (nextContractType) params.set('contract_type', nextContractType);
    if (nextWorkHours) params.set('work_hours', nextWorkHours);
    if (nextProvider && nextProvider !== 'all') params.set('provider', nextProvider);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    const nextUrl = query ? `/seeker/browse?${query}` : '/seeker/browse';
    window.history.replaceState({}, '', nextUrl);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setPage(1);
    syncUrl(keywords, location, 1, contractType, workHours, provider);
    void loadJobs(1, keywords, location, contractType, workHours, provider);
  }

  function handleProviderSelect(newProvider) {
    setProvider(newProvider);
    setPage(1);
    syncUrl(keywords, location, 1, contractType, workHours, newProvider);
    void loadJobs(1, keywords, location, contractType, workHours, newProvider);
  }

  function handleReset() {
    setKeywords('');
    setLocation('');
    setContractType('');
    setWorkHours('');
    setProvider('all');
    setSelectedCategory('Semua');
    setPage(1);
    syncUrl('', '', 1, '', '', 'all');
    void loadJobs(1, '', '', '', '', 'all');
  }

  function handleLocationChoice(option) {
    setLocation(option);
    setPage(1);
    syncUrl(keywords, option, 1, contractType, workHours, provider);
    void loadJobs(1, keywords, option, contractType, workHours, provider);
  }

  function handlePageChange(nextPage) {
    setPage(nextPage);
    syncUrl(keywords, location, nextPage, contractType, workHours, provider);
    void loadJobs(nextPage, keywords, location, contractType, workHours, provider);
  }

  const totalPages = Math.max(pages, 1);

  // Filter jobs by selected category if it's not 'Semua'
  const filteredJobs = selectedCategory === 'Semua'
    ? jobs
    : jobs.filter((job) => {
        const cat = (job.category || '').toLowerCase();
        const sel = selectedCategory.toLowerCase();
        return cat.includes(sel.split(' ')[0].toLowerCase()) || sel.includes(cat);
      });

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <section className="space-y-4">
        {/* Main search row */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              placeholder="Cari posisi (Frontend, Barista, Manager...), keahlian, atau perusahaan..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-white/10 bg-slate-900/90 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Contract Type */}
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-400"
            >
              {CONTRACT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Location input */}
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Kota / Remote"
              className="px-3.5 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 w-28 sm:w-36"
            />

            <button
              onClick={handleSubmit}
              title="Cari lowongan"
              className="p-2.5 rounded-2xl bg-sky-500 text-white hover:bg-sky-400 transition-colors shadow-md shadow-sky-500/20"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => void loadJobs(page)}
              title="Segarkan data"
              className="p-2.5 rounded-2xl border border-white/10 bg-slate-900 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {/* Provider Pills hidden per user request: jobs continue to load from all sources unified */}

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {JOB_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                    : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Error */}
      {error ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-950/40 p-5 text-red-300">
          <p className="font-semibold">Lowongan LOXER belum bisa dimuat.</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : null}

      {/* Location disambiguation */}
      {type === 'LOCATIONS' && locationOptions.length > 0 ? (
        <div className="rounded-3xl border border-sky-500/20 bg-slate-900/80 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-500/20 p-3 text-sky-400">
              <MapPinned className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white">LOXER menemukan beberapa lokasi</h3>
              <p className="mt-1 text-sm text-slate-400">
                Pilih lokasi yang paling sesuai agar pencariannya lebih presisi.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {locationOptions.map((option) => {
                  const label = typeof option === 'string' ? option : option?.name || option?.label || option?.location || '';
                  if (!label) return null;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleLocationChoice(label)}
                      className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:border-sky-400/50 hover:bg-sky-500/20"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-64 sm:h-80 rounded-xl sm:rounded-2xl border border-white/5 bg-slate-900/50 animate-pulse p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="h-28 sm:h-32 rounded-lg sm:rounded-xl bg-slate-800" />
              <div className="h-3 sm:h-4 w-3/4 rounded bg-slate-800" />
              <div className="h-3 sm:h-4 w-1/2 rounded bg-slate-800" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty State */}
      {!loading && type !== 'LOCATIONS' && filteredJobs.length === 0 && !error ? (
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-white/10 bg-slate-900/30">
          <SearchX className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Belum ada lowongan yang cocok</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Coba kata kunci lain, perluas lokasi, atau ganti pilihan sumber penyedia lowongan.
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/30"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : null}

      {/* Job Grid */}
      {!loading && filteredJobs.length > 0 ? (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-400" />
              Daftar Lowongan ({filteredJobs.length})
              {selectedCategory !== 'Semua' && (
                <span className="text-xs font-normal text-slate-400">— {selectedCategory}</span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {keywords || location
                  ? `${keywords || 'Semua posisi'}${location ? ` | ${location}` : ''}`
                  : 'Semua posisi terbaru'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 border border-white/10 rounded-full px-2 py-0.5">
                <Compass className="h-3 w-3" />
                Hal {page}
              </span>
            </div>
          </div>

          {/* 2-column mobile grid, 4-column desktop grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
            {filteredJobs.map((job) => (
              <JobCard
                key={`${job.site}-${job.url}-${job.title}`}
                job={job}
                onSelectJob={onSelectJob}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-400">
              Halaman <span className="font-semibold text-white">{page}</span> dari{' '}
              <span className="font-semibold text-white">{totalPages}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-sky-400 transition hover:border-sky-400/30 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
