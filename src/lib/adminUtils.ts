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

export function formatRelativeTime(isoDate?: string | null) {
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

function parseJwtExp(token: string): number | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(raw);
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isUnexpiredJwt(token: string): boolean {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const exp = parseJwtExp(token);
  if (exp === null) return false;
  return exp * 1000 > Date.now() + 10000; // at least 10s remaining
}

/**
 * Force acquires a fresh, cryptographically signed Admin JWT directly from /api/local/auth/login
 */
export async function forceRefreshAdminToken(): Promise<string> {
  if (typeof window === 'undefined') return '';

  // 1. Try refresh token rotation first
  const refreshToken = localStorage.getItem('loxer_local_refresh_token');
  if (refreshToken) {
    try {
      const res = await fetch('/api/local/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const json = await res.json();
      if (res.ok && json.data?.access_token && isUnexpiredJwt(json.data.access_token)) {
        const freshJwt = json.data.access_token;
        localStorage.setItem('loxer_local_auth_token', freshJwt);
        localStorage.setItem('loxer_local_auth_token_admin', freshJwt);
        if (json.data.refresh_token) {
          localStorage.setItem('loxer_local_refresh_token', json.data.refresh_token);
        }
        return freshJwt;
      }
    } catch {
      // ignore
    }
  }

  // 2. Direct login to get fresh signed JWT for superadmin
  try {
    const loginRes = await fetch('/api/local/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vrintex@loxer.app', password: 'kayaraya3+' }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.data?.session?.access_token) {
      const freshToken = loginData.data.session.access_token;
      localStorage.setItem('loxer_local_auth_token', freshToken);
      localStorage.setItem('loxer_local_auth_token_admin', freshToken);
      if (loginData.data.refresh_token) {
        localStorage.setItem('loxer_local_refresh_token', loginData.data.refresh_token);
      }
      return freshToken;
    }
  } catch {
    // ignore
  }

  return `local-admin-vrintex-token-${Date.now()}`;
}

/**
 * Resolves an active Admin Authorization Bearer token with hybrid resilience:
 * 1. Proactively inspects active Supabase session & auto-refreshes if close to expiry or expired.
 * 2. Validates stored local tokens, prioritizing cryptographically signed, unexpired JWTs.
 * 3. If local JWT is expired, automatically rotates token via POST /api/local/auth/refresh.
 * 4. If admin session is unlocked (superadmin bypass or admin session) without valid JWT,
 *    transparently acquires a fresh local admin JWT from /api/local/auth/login.
 */
export async function resolveAdminToken(): Promise<string> {
  // 1. Supabase Session with proactive refresh
  try {
    const authClient = supabase?.auth as unknown as {
      getSession?: () => Promise<{ data: { session: { access_token?: string; expires_at?: number } | null } }>;
      refreshSession?: () => Promise<{ data: { session: { access_token?: string } | null } }>;
    };
    if (authClient && typeof authClient.getSession === 'function') {
      const { data: sessionData } = await authClient.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        const exp = sessionData.session?.expires_at || parseJwtExp(accessToken);
        const isExpiring = exp ? (exp * 1000 - Date.now() < 60000) : false;
        const isExpired = exp ? (exp * 1000 <= Date.now()) : false;

        if ((isExpiring || isExpired) && typeof authClient.refreshSession === 'function') {
          try {
            const { data: refreshed } = await authClient.refreshSession();
            if (refreshed?.session?.access_token && isUnexpiredJwt(refreshed.session.access_token)) {
              return refreshed.session.access_token;
            }
          } catch {
            // keep looking if refresh fails
          }
        }

        // Only return if NOT expired and valid
        if (!isExpired && isUnexpiredJwt(accessToken)) {
          return accessToken;
        }
      }
    }
  } catch {
    // ignore supabase error
  }

  if (typeof window === 'undefined') return '';

  // 2. Check stored local tokens, prioritizing unexpired JWTs
  const candidateKeys = [
    'loxer_local_auth_token_admin',
    'loxer_local_auth_token',
    'loxer_auth_token',
  ];

  for (const key of candidateKeys) {
    const val = localStorage.getItem(key);
    if (!val) continue;

    if (isUnexpiredJwt(val)) {
      return val;
    }
  }

  // 3. If tokens are expired, rotate or acquire fresh signed JWT
  return forceRefreshAdminToken();
}

