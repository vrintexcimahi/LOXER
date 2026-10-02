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
  ShieldCheck,
  Pin,
} from 'lucide-react';
import { useAppAccess } from '../contexts/AppAccessContext';

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

function formatRupiah(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function normalizeSalaryAmount(rawAmount, currencyCode = 'IDR') {
  if (rawAmount === null || rawAmount === undefined || rawAmount === '') return null;
  const num = Number(rawAmount);
  if (!Number.isFinite(num) || num <= 0) return null;

  const code = (currencyCode || 'IDR').toUpperCase();
  // Standardize foreign currency to IDR for Indonesian local market
  if (code === 'USD' || code === '$') {
    if (num < 100000) {
      return num * 16000;
    }
  } else if (code === 'EUR' || code === '€') {
    if (num < 100000) {
      return num * 17500;
    }
  }
  return num;
}

function formatSalary(job) {
  const minRaw = job.salary_min;
  const maxRaw = job.salary_max;

  const min = normalizeSalaryAmount(minRaw, job.salary_currency_code);
  const max = normalizeSalaryAmount(maxRaw, job.salary_currency_code);
  const salaryLabel = SALARY_TYPE_LABELS[job.salary_type] || '';

  if (min && max) {
    return `${formatRupiah(min)} - ${formatRupiah(max)}${salaryLabel ? ' ' + salaryLabel : ''}`.trim();
  }
  if (min) {
    return `Mulai ${formatRupiah(min)}${salaryLabel ? ' ' + salaryLabel : ''}`.trim();
  }
  if (max) {
    return `s/d ${formatRupiah(max)}${salaryLabel ? ' ' + salaryLabel : ''}`.trim();
  }

  // Handle textual salary field
  if (job.salary && typeof job.salary === 'string') {
    const raw = job.salary.trim();
    const lower = raw.toLowerCase();

    // Check if salary text is placeholder, zero, or unstated
    if (
      lower === '0' ||
      lower.includes('us$0') ||
      lower.includes('$0') ||
      lower.includes('rp 0') ||
      lower.includes('rp0') ||
      lower === 'gaji tidak dicantumkan' ||
      lower === 'null' ||
      lower === 'undefined' ||
      lower === '-'
    ) {
      return 'Kompetitif / Sesuai Pengalaman';
    }

    // Clean any foreign currency symbol or zero fragments
    let cleaned = raw
      .replace(/US\$\s*0(\.00)?/gi, '')
      .replace(/\$\s*0(\.00)?/g, '')
      .replace(/USD/gi, 'Rp')
      .replace(/\$/g, 'Rp ')
      .trim();

    if (!cleaned || cleaned === '-' || cleaned === 'Rp 0' || cleaned === 'Rp') {
      return 'Kompetitif / Sesuai Pengalaman';
    }

    return `${cleaned}${salaryLabel ? ' ' + salaryLabel : ''}`.trim();
  }

  return 'Kompetitif / Sesuai Pengalaman';
}

function formatPublishedDate(value) {
  if (!value) return 'Baru saja';
  const parsed = dayjs(value);
  if (parsed.isValid()) return parsed.fromNow();
  const fallback = dayjs(new Date(value));
  return fallback.isValid() ? fallback.fromNow() : 'Baru saja';
}

function getProviderBadge(site) {
  const normalized = (site || '').toLowerCase();

  if (normalized.includes('loxer') || normalized.includes('mitra')) {
    return {
      label: 'Mitra LOXER',
      badgeTheme: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20',
      icon: CheckCircle2,
    };
  }
  if (normalized.includes('careerjet')) {
    return {
      label: 'Careerjet Regional',
      badgeTheme: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-indigo-500/20',
      icon: Briefcase,
    };
  }
  if (normalized.includes('arbeitnow')) {
    return {
      label: 'Arbeitnow Global',
      badgeTheme: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/20',
      icon: Sparkles,
    };
  }
  return {
    label: site || 'LOXER Jobs',
    badgeTheme: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/20',
    icon: Briefcase,
  };
}

export default function JobCard({ job, onSelectJob }) {
  const { requireApp } = useAppAccess();
  const summary = stripHtml(job.description);
  const shortSummary = summary.length > 150 ? `${summary.slice(0, 150)}...` : summary;
  const isRemote = (job.locations || '').toLowerCase().includes('remote');
  const provider = getProviderBadge(job.site);
  const ProviderIcon = provider.icon;
  const isInternal = Boolean(job.is_internal);

  const handleCardClick = (e) => {
    if (isInternal && onSelectJob) {
      e.preventDefault();
      onSelectJob(job);
    }
  };

  const handleInternalApply = (e) => {
    e.stopPropagation();
    if (!requireApp('Melamar Lowongan Pekerjaan')) {
      return;
    }
    if (onSelectJob) {
      onSelectJob(job);
    }
  };

  const handleExternalApply = (e) => {
    if (!requireApp('Melamar Lowongan Pekerjaan')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  // Company logo / initial
  const companyName = job.company || job.companies?.name || 'Perusahaan';
  const initial = (companyName[0] || 'P').toUpperCase();
  const logoUrl = job.company_logo || job.companies?.logo_url;

  return (
    <div
      onClick={isInternal && onSelectJob ? handleCardClick : undefined}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 border-white/10 bg-slate-900/80 hover:border-sky-500/40 hover:bg-slate-900 shadow-lg shadow-black/40 ${isInternal && onSelectJob ? 'cursor-pointer' : ''}`}
    >
      {/* Top Banner — Job Logo & Info */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-sky-950/40 p-4 pb-3">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Provider Badge - top left */}
        <div className="relative z-10 flex items-start justify-between mb-3">
          <span
            className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${provider.badgeTheme}`}
          >
            <span className="flex items-center gap-1">
              <ProviderIcon className="h-2.5 w-2.5" />
              {provider.label}
            </span>
          </span>
          {isInternal && (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 backdrop-blur-md">
              ⭐ Prioritas
            </span>
          )}
        </div>

        {/* Company Logo + Name */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl border border-white/10 bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sky-300 font-black text-xl">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={job.url}
              target={isInternal ? '_self' : '_blank'}
              rel={isInternal ? undefined : 'noreferrer'}
              onClick={handleCardClick}
              className="text-sm font-extrabold text-white tracking-wide hover:text-sky-400 transition-colors line-clamp-2 leading-tight"
            >
              {job.title}
            </a>
            <p className="flex items-center gap-1 mt-1 text-[11px] text-slate-400 truncate">
              <Building2 className="h-3 w-3 text-sky-400 shrink-0" />
              {companyName}
            </p>
          </div>
          {/* External link icon */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900/60 border border-white/20 text-slate-300">
            {isInternal ? <ShieldCheck className="h-3 w-3 text-sky-400" /> : <Pin className="h-3 w-3" />}
          </div>
        </div>

        {/* Location & Date row at bottom */}
        <div className="relative z-10 mt-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-sky-200/90 drop-shadow flex items-center gap-1 truncate">
            <MapPin className="h-2.5 w-2.5 text-sky-400" />
            {job.locations || 'Indonesia'}
          </span>
          <div className="flex items-center gap-1">
            {isRemote && (
              <span className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md">
                Remote
              </span>
            )}
            <span className="text-[10px] font-mono text-slate-300 drop-shadow flex items-center gap-1">
              <Clock3 className="h-2.5 w-2.5 text-amber-400" />
              {formatPublishedDate(job.date)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        {/* Salary */}
        <div className="flex items-baseline justify-between rounded-lg bg-slate-950/60 border border-white/5 px-2.5 py-1.5">
          <span className="text-[10px] text-slate-400">Gaji / Tarif:</span>
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
            <Coins className="h-3 w-3 text-emerald-400" />
            {formatSalary(job)}
          </span>
        </div>

        {/* Description snippet */}
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
          {shortSummary || 'Deskripsi lowongan pekerjaan tidak tersedia.'}
        </p>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-white/5 flex items-center gap-2">
          {isInternal && onSelectJob ? (
            <>
              <button
                onClick={handleCardClick}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                Detail
              </button>
              <button
                onClick={handleInternalApply}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-cyan-300 active:scale-[0.98] cursor-pointer"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Lamar di LOXER
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-[10px] text-slate-500 italic truncate">
                {job.source || job.site || 'Sumber Eksternal'}
              </span>
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                onClick={handleExternalApply}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-cyan-300 active:scale-[0.98] cursor-pointer"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Lamar Sekarang
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
