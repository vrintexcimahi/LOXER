import { supabase } from './supabase';

export async function logAdminAction(
  _adminId: string,
  _adminEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  detail: string
) {
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;

  await fetch('/api/admin-audit-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action,
      targetType,
      targetId,
      detail,
    }),
  });
}

export function formatRelativeTime(isoDate?: string) {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return date.toLocaleDateString('id-ID');
}

export function toISODateOnly(dateLike: string | Date) {
  const d = new Date(dateLike);
  return d.toISOString().slice(0, 10);
}

export function formatDayLabel(dateLike: string | Date) {
  const d = new Date(dateLike);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}
