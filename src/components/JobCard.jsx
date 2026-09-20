import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  Coins,
  Globe,
  MapPin,
  Sparkles,
} from 'lucide-react';

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
  if (!value) return 'Baru saja';

  const parsed = dayjs(value);
  if (parsed.isValid()) {
    return parsed.fromNow();
  }

  const fallback = dayjs(new Date(value));
  return fallback.isValid() ? fallback.fromNow() : 'Baru saja';
}

function getProviderBadge(site) {
  const normalized = (site || '').toLowerCase();

  if (normalized.includes('loxer') || normalized.includes('mitra')) {
    return {
      label: 'Mitra LOXER',
      bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
    };
  }

  if (normalized.includes('jooble')) {
    return {
      label: 'Jooble Indonesia',
      bgClass: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Globe,
    };
  }

  if (normalized.includes('careerjet')) {
    return {
      label: 'Careerjet Regional',
      bgClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Briefcase,
    };
  }

  if (normalized.includes('arbeitnow')) {
    return {
      label: 'Arbeitnow Global',
      bgClass: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Sparkles,
    };
  }

  return {
    label: site || 'LOXER Jobs',
    bgClass: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Briefcase,
  };
}

export default function JobCard({ job }) {
  const summary = stripHtml(job.description);
  const shortSummary = summary.length > 160 ? `${summary.slice(0, 160)}...selengkapnya` : summary;
  const isRemote = (job.locations || '').toLowerCase().includes('remote');
  const provider = getProviderBadge(job.site);
  const ProviderIcon = provider.icon;
  const isInternal = Boolean(job.is_internal);

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100/80">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${provider.bgClass}`}
            >
              <ProviderIcon className="h-3 w-3" />
              {provider.label}
            </span>
            {isInternal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                ⭐ Prioritas
              </span>
            )}
          </div>

          <a
            href={job.url}
            target={isInternal ? '_self' : '_blank'}
            rel={isInternal ? undefined : 'noreferrer'}
            className="text-lg font-black leading-tight text-slate-900 transition hover:text-sky-700 sm:text-xl"
          >
            {job.title}
          </a>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Building2 className="h-4 w-4 text-cyan-500 flex-shrink-0" />
            <span className="truncate">{job.company || 'Perusahaan di Indonesia'}</span>
          </p>
        </div>

        <a
          href={job.url}
          target={isInternal ? '_self' : '_blank'}
          rel={isInternal ? undefined : 'noreferrer'}
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-sky-100 text-sky-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
          aria-label={`Buka lowongan ${job.title}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
          <MapPin className="h-3.5 w-3.5 text-cyan-500" />
          {job.locations || 'Indonesia'}
        </span>
        {isRemote && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 font-semibold">
            Remote
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 font-semibold text-emerald-700">
          <Coins className="h-3.5 w-3.5 text-emerald-500" />
          {formatSalary(job)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
          <Clock3 className="h-3.5 w-3.5 text-amber-500" />
          {formatPublishedDate(job.date)}
        </span>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
        {shortSummary || 'Deskripsi lowongan pekerjaan tidak tersedia.'}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Penyedia</p>
          <p className="text-xs font-semibold text-slate-700 truncate max-w-[140px] sm:max-w-[180px]">
            {job.source || job.site || 'LOXER'}
          </p>
        </div>
        <a
          href={job.url}
          target={isInternal ? '_self' : '_blank'}
          rel={isInternal ? undefined : 'noreferrer'}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 active:scale-95"
        >
          {isInternal ? 'Lamar di LOXER' : 'Lamar Sekarang'}
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}
