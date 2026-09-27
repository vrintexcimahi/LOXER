import { ApplicationStatus } from '../../lib/types';

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  applied: { label: 'Melamar', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  reviewed: { label: 'Ditinjau', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  shortlisted: { label: 'Shortlist', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  interview_scheduled: { label: 'Jadwal Interview', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  hired: { label: 'Diterima', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-500 border-red-200' },
  expired: { label: 'Kadaluarsa', className: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

export default function ApplicationStatusBadge({
  status,
  compact = false,
  className = '',
}: {
  status: ApplicationStatus;
  compact?: boolean;
  className?: string;
}) {
  const config = statusConfig[status] || statusConfig.applied;
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border whitespace-nowrap shrink-0 ${
        compact ? 'px-1.5 py-0.5 text-[9px] sm:text-[10px]' : 'px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs'
      } ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

