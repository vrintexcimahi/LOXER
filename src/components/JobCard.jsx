import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';
import { ArrowUpRight, Briefcase, Building2, Clock3, Coins, MapPin } from 'lucide-react';

dayjs.extend(relativeTime);
dayjs.locale('id');

const SALARY_TYPE_LABELS = {
  Y: '/ tahun',
  M: '/ bulan',
  W: '/ minggu',
  D: '/ hari',
  H: '/ jam',
};

function stripHtml(value) {
  return (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatMoney(value, currencyCode = 'IDR') {
  if (!Number.isFinite(value)) return null;

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSalary(job) {
  const min = Number(job.salary_min);
  const max = Number(job.salary_max);
  const salaryLabel = SALARY_TYPE_LABELS[job.salary_type] || '';

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `${formatMoney(min, job.salary_currency_code)} - ${formatMoney(max, job.salary_currency_code)} ${salaryLabel}`.trim();
  }

  if (Number.isFinite(min)) {
    return `${formatMoney(min, job.salary_currency_code)} ${salaryLabel}`.trim();
  }

  if (job.salary) {
    return `${job.salary} ${salaryLabel}`.trim();
  }

  return 'Gaji tidak dicantumkan';
}

function formatPublishedDate(value) {
  if (!value) return 'Tanggal tidak tersedia';

  const parsed = dayjs(value);
  if (parsed.isValid()) {
    return parsed.fromNow();
  }

  const fallback = dayjs(new Date(value));
  return fallback.isValid() ? fallback.fromNow() : 'Tanggal tidak tersedia';
}

export default function JobCard({ job }) {
  const summary = stripHtml(job.description);
  const shortSummary = summary.length > 150 ? `${summary.slice(0, 150)}...selengkapnya` : summary;
  const isRemote = (job.locations || '').toLowerCase().includes('remote');

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100/80">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">
            <Briefcase className="h-3.5 w-3.5" />
            LOXER Jobs
          </p>
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-xl font-black leading-tight text-slate-900 transition hover:text-sky-700"
          >
            {job.title}
          </a>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Building2 className="h-4 w-4 text-cyan-500" />
            {job.company || 'Perusahaan tidak diketahui'}
          </p>
        </div>

        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-sky-100 text-sky-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
          aria-label={`Buka lowongan ${job.title}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
          <MapPin className="h-3.5 w-3.5 text-cyan-500" />
          {job.locations || 'Lokasi fleksibel'}
        </span>
        {isRemote ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
            Remote
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
          <Coins className="h-3.5 w-3.5 text-emerald-500" />
          {formatSalary(job)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
          <Clock3 className="h-3.5 w-3.5 text-amber-500" />
          {formatPublishedDate(job.date)}
        </span>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
        {shortSummary || 'Deskripsi lowongan tidak tersedia.'}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sumber</p>
          <p className="text-sm font-semibold text-slate-700">{job.site || 'LOXER'}</p>
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
        >
          Lamar Sekarang
        </a>
      </div>
    </article>
  );
}
