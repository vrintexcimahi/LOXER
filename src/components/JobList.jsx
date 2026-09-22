import { useEffect, useState } from 'react';
import { Compass, Layers, MapPinned, SearchX, Sparkles } from 'lucide-react';
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
  { id: 'all', label: '🌐 Semua Sumber', desc: 'Agregator Lengkap' },
  { id: 'jooble', label: '🇮🇩 Jooble ID', desc: 'Lowongan Indonesia' },
  { id: 'internal', label: '⭐ Mitra LOXER', desc: 'Verified Employer' },
  { id: 'careerjet', label: '⚡ Careerjet', desc: 'Regional SEA' },
  { id: 'arbeitnow', label: '🌍 Arbeitnow', desc: 'Remote & Global' },
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
  const activeFilters = [
    provider !== 'all' ? `Sumber: ${provider.toUpperCase()}` : null,
    location ? `Lokasi: ${location}` : null,
    contractType ? `Kontrak: ${contractType}` : null,
    workHours ? `Jam kerja: ${workHours}` : null,
  ].filter(Boolean);

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 p-6 text-white shadow-xl shadow-sky-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                LOXER Unified Job Hub
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black leading-tight md:text-3xl">
              Pusat Lowongan Kerja Indonesia & Global
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Pencarian terintegrasi dari <strong>Jooble Indonesia</strong>, mitra resmi terverifikasi <strong>LOXER</strong>, <strong>Careerjet</strong>, dan feed publik <strong>Arbeitnow</strong> langsung dari satu pintu.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {PROVIDER_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleProviderSelect(tag.id)}
                className={`rounded-full border px-3 py-1.5 transition ${
                  provider === tag.id
                    ? 'border-cyan-400 bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <JobSearch
        keywords={keywords}
        location={location}
        contractType={contractType}
        workHours={workHours}
        provider={provider}
        loading={loading}
        onKeywordsChange={setKeywords}
        onLocationChange={setLocation}
        onContractTypeChange={setContractType}
        onWorkHoursChange={setWorkHours}
        onProviderChange={handleProviderSelect}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <span key={filter} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
              {filter}
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p className="font-semibold">Lowongan LOXER belum bisa dimuat.</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : null}

      {type === 'LOCATIONS' && locationOptions.length > 0 ? (
        <div className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
              <MapPinned className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-slate-900">LOXER menemukan beberapa lokasi</h3>
              <p className="mt-1 text-sm text-slate-500">
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
                      className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100"
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 min-[1800px]:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-24 rounded bg-sky-100" />
                <div className="h-8 rounded bg-sky-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
                <div className="h-20 rounded bg-slate-100" />
                <div className="flex gap-2">
                  <div className="h-8 w-28 rounded-full bg-slate-100" />
                  <div className="h-8 w-36 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && type !== 'LOCATIONS' && jobs.length === 0 && !error ? (
        <div className="rounded-3xl border border-sky-100 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-500">
            <SearchX className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-900">Belum ada lowongan yang cocok</h3>
          <p className="mt-2 text-sm text-slate-500">
            Coba kata kunci lain, perluas lokasi, atau ganti pilihan sumber penyedia lowongan.
          </p>
        </div>
      ) : null}

      {!loading && jobs.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">Hasil Pencarian</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">
                {jobs.length} lowongan ditemukan pada halaman {page}
              </h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
              <Compass className="h-4 w-4" />
              {keywords || location ? `${keywords || 'Semua posisi'}${location ? ` | ${location}` : ''}` : 'Semua posisi terbaru'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 min-[1800px]:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard
                key={`${job.site}-${job.url}-${job.title}`}
                job={job}
                onSelectJob={onSelectJob}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Halaman <span className="font-semibold text-slate-900">{page}</span> dari{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="rounded-2xl border border-sky-100 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
