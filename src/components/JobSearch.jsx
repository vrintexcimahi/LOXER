import { Briefcase, MapPin, Search } from 'lucide-react';

const CONTRACT_OPTIONS = [
  { value: '', label: 'Semua kontrak' },
  { value: 'p', label: 'Tetap (p)' },
  { value: 'c', label: 'Kontrak (c)' },
  { value: 'i', label: 'Magang (i)' },
];

const WORK_HOURS_OPTIONS = [
  { value: '', label: 'Semua jam kerja' },
  { value: 'f', label: 'Full-time (f)' },
  { value: 'p', label: 'Part-time (p)' },
];

export default function JobSearch({
  keywords,
  location,
  contractType,
  workHours,
  loading,
  onKeywordsChange,
  onLocationChange,
  onContractTypeChange,
  onWorkHoursChange,
  onSubmit,
  onReset,
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="flex flex-1 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3">
          <Search className="h-4 w-4 text-sky-500" />
          <input
            type="text"
            value={keywords}
            onChange={(event) => onKeywordsChange(event.target.value)}
            placeholder="Contoh: frontend, marketing, HR"
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>

        <label className="flex flex-1 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3">
          <MapPin className="h-4 w-4 text-cyan-500" />
          <input
            type="text"
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="Jakarta, Surabaya, Singapore"
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="flex gap-3 lg:w-auto">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
          >
            {loading ? 'Memuat...' : 'Cari Lowongan'}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="rounded-2xl border border-sky-100 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-slate-50 px-4 py-3">
          <Briefcase className="h-4 w-4 text-sky-500" />
          <select
            value={contractType}
            onChange={(event) => onContractTypeChange(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            {CONTRACT_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-slate-50 px-4 py-3">
          <Briefcase className="h-4 w-4 text-cyan-500" />
          <select
            value={workHours}
            onChange={(event) => onWorkHoursChange(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            {WORK_HOURS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}
