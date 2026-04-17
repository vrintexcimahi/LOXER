import { useEffect, useRef, useState } from 'react';
import { Compass, MapPinned, SearchX } from 'lucide-react';
import JobCard from './JobCard';
import JobSearch from './JobSearch';
import { CAREERJET_REGION_LABELS } from '../config/careerjet';
import { fetchCareerjetJobs } from '../services/careerjetService';

function normalizeLocationOptions(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.locations)) return payload.locations;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export default function JobList({
  initialKeywords = '',
  initialLocation = '',
  initialPage = 1,
  initialContractType = '',
  initialWorkHours = '',
}) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [location, setLocation] = useState(initialLocation);
  const [contractType, setContractType] = useState(initialContractType);
  const [workHours, setWorkHours] = useState(initialWorkHours);
  const [jobs, setJobs] = useState([]);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [type, setType] = useState('JOBS');
  const [locationOptions, setLocationOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const initialFetchDone = useRef(false);

  async function loadJobs(
    nextPage,
    nextKeywords = keywords,
    nextLocation = location,
    nextContractType = contractType,
    nextWorkHours = workHours
  ) {
    setLoading(true);
    setError('');

    try {
      const payload = await fetchCareerjetJobs({
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
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    void loadJobs(initialPage, initialKeywords, initialLocation, initialContractType, initialWorkHours);
  }, [initialKeywords, initialLocation, initialPage, initialContractType, initialWorkHours]);

  function syncUrl(
    nextKeywords,
    nextLocation,
    nextPage = 1,
    nextContractType = contractType,
    nextWorkHours = workHours
  ) {
    const params = new URLSearchParams();
    if (nextKeywords) params.set('q', nextKeywords);
    if (nextLocation) params.set('location', nextLocation);
    if (nextContractType) params.set('contract_type', nextContractType);
    if (nextWorkHours) params.set('work_hours', nextWorkHours);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    const nextUrl = query ? `/seeker/browse?${query}` : '/seeker/browse';
    window.history.replaceState({}, '', nextUrl);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setPage(1);
    syncUrl(keywords, location, 1, contractType, workHours);
    void loadJobs(1, keywords, location, contractType, workHours);
  }

  function handleReset() {
    setKeywords('');
    setLocation('');
    setContractType('');
    setWorkHours('');
    setPage(1);
    syncUrl('', '', 1, '', '');
    void loadJobs(1, '', '', '', '');
  }

  function handleLocationChoice(option) {
    setLocation(option);
    setPage(1);
    syncUrl(keywords, option, 1, contractType, workHours);
    void loadJobs(1, keywords, option, contractType, workHours);
  }

  function handlePageChange(nextPage) {
    setPage(nextPage);
    syncUrl(keywords, location, nextPage, contractType, workHours);
    void loadJobs(nextPage, keywords, location, contractType, workHours);
  }

  const totalPages = Math.max(pages, 1);
  const activeFilters = [
    location ? `Lokasi: ${location}` : null,
    contractType ? `Kontrak: ${contractType}` : null,
    workHours ? `Jam kerja: ${workHours}` : null,
  ].filter(Boolean);

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 p-6 text-white shadow-xl shadow-sky-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">LOXER Global Jobs</p>
            <h2 className="mt-2 text-2xl font-black leading-tight md:text-3xl">
              Lowongan Indonesia & Asia Tenggara di LOXER
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Cari lowongan regional dari satu tampilan LOXER, urut berdasarkan tanggal terbaru, dan saring berdasarkan kontrak serta jam kerja.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold text-cyan-100">
            {CAREERJET_REGION_LABELS.map((region) => (
              <span key={region} className="rounded-full border border-cyan-400/20 bg-white/10 px-3 py-1.5">
                {region}
              </span>
            ))}
          </div>
        </div>
      </div>

      <JobSearch
        keywords={keywords}
        location={location}
        contractType={contractType}
        workHours={workHours}
        loading={loading}
        onKeywordsChange={setKeywords}
        onLocationChange={setLocation}
        onContractTypeChange={setContractType}
        onWorkHoursChange={setWorkHours}
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
            Coba kata kunci lain, perluas lokasi, atau ubah filter kontrak dan jam kerja.
          </p>
        </div>
      ) : null}

      {!loading && jobs.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">Hasil LOXER</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">
                {jobs.length} lowongan pada halaman {page}
              </h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
              <Compass className="h-4 w-4" />
              {keywords || location ? `${keywords || 'Semua posisi'}${location ? ` | ${location}` : ''}` : 'Semua posisi terbaru'}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={`${job.site}-${job.url}`} job={job} />
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
                Prev
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
