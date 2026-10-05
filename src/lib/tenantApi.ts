export interface ChildTenant {
  id: string;
  slug: string;
  kind: 'master' | 'child';
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  display_name: string;
  hero_title: string;
  description: string;
  logo_url: string;
  whatsapp: string;
  config_version: number;
}

export interface TenantMember {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
  joined_at: string;
}

export function tenantPrefix() {
  const match = /^\/p\/([a-z0-9-]+)(?:\/|$)/.exec(window.location.pathname);
  return match ? `/p/${match[1]}` : '';
}

export function childLink(path: string) {
  return tenantPrefix() + (path.startsWith('/') ? path : '/' + path);
}

export async function tenantRequest<T>(path: string, options: { token?: string; body?: unknown; method?: string; signal?: AbortSignal; master?: boolean } = {}): Promise<T> {
  const response = await fetch(`/api/partner-platform${options.master ? '' : tenantPrefix()}${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store', signal: options.signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Layanan mitra tidak tersedia.');
  return data as T;
}
