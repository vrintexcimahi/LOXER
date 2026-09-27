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
