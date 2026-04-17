import { ApplicationStatus } from '../../lib/types';

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  applied: { label: 'Melamar', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  reviewed: { label: 'Ditinjau', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  shortlisted: { label: 'Shortlist', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  interview_scheduled: { label: 'Jadwal Interview', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  hired: { label: 'Diterima', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-500 border-red-200' },
};

export default function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status] || statusConfig.applied;
  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
}
