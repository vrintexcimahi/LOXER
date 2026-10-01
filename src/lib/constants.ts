const DEFAULT_ADMIN_EMAIL_FALLBACK = 'vrintex';

export function normalizeComparableEmail(value: string | null | undefined) {
  return String(value || '')
    .replace(/\\r|\\n|\r|\n/g, '')
    .trim()
    .toLowerCase();
}

export const DEFAULT_ADMIN_EMAIL = normalizeComparableEmail(
  import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL_FALLBACK
);

export function isDefaultAdminEmail(value: string | null | undefined) {
  const norm = normalizeComparableEmail(value);
  return (
    norm === DEFAULT_ADMIN_EMAIL ||
    norm === 'vrintex' ||
    norm === 'vrintex@loxer.app' ||
    norm === 'loxer-admin-1776448925326@example.com'
  );
}

export const APPLICATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ['reviewed', 'shortlisted', 'rejected', 'expired'],
  reviewed: ['shortlisted', 'interview_scheduled', 'rejected', 'expired'],
  shortlisted: ['interview_scheduled', 'hired', 'rejected', 'expired'],
  interview_scheduled: ['hired', 'rejected', 'expired'],
  rejected: ['reviewed', 'shortlisted'],
  expired: ['applied', 'reviewed'],
  hired: ['rejected'],
};

export function isAllowedStatusTransition(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = APPLICATION_STATUS_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}

