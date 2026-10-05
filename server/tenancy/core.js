export const MASTER_ID = '00000000-0000-4000-8000-000000000001';
export const API_PREFIX = '/api/partner-platform';
const RESERVED = new Set(['master', 'www', 'api', 'admin', 'auth', 'partner', 'static', 'assets', 'mail', 'support']);
export const MEMBER_ROLES = ['seeker', 'employer', 'freelancer', 'customer'];

export class TenantError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function requireThat(condition, status, code, message) {
  if (!condition) throw new TenantError(status, code, message);
}

export function validSlug(value) {
  return typeof value === 'string' && /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(value) && !RESERVED.has(value);
}

export function hostName(value) {
  requireThat(typeof value === 'string' && /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(value), 400, 'INVALID_HOST', 'Host tidak valid.');
  const hostname = value.replace(/:\d+$/, '').replace(/\.$/, '').toLowerCase();
  requireThat(!hostname.includes('..'), 400, 'INVALID_HOST', 'Host tidak valid.');
  return hostname;
}

// The raw Host is trusted only after exact matching to configured domains.
// X-Forwarded-Host is deliberately ignored; never resolve tenancy from a body/header ID.
export function resolveAddress(req, env) {
  const host = hostName(req.headers.host || '');
  const base = hostName(env.APP_BASE_DOMAIN || 'localhost');
  const masterHosts = new Set([base]);
  if (env.APP_PUBLIC_ORIGIN) masterHosts.add(new URL(env.APP_PUBLIC_ORIGIN).hostname.toLowerCase());
  if (env.NODE_ENV !== 'production') { masterHosts.add('localhost'); masterHosts.add('127.0.0.1'); }
  const rawPath = (req.url || '/').split('?')[0];
  requireThat(!/%|\\|\/\//.test(rawPath), 400, 'INVALID_PATH', 'Path tidak valid.');
  let path = rawPath.startsWith(API_PREFIX + '/') ? rawPath.slice(API_PREFIX.length) : rawPath;
  const match = /^\/p\/([^/]+)(\/.*)?$/.exec(path);
  const pathSlug = match?.[1] || null;
  if (pathSlug) {
    requireThat(validSlug(pathSlug), 404, 'TENANT_NOT_FOUND', 'Child tidak ditemukan.');
    path = match[2] || '/';
  }
  let hostSlug = null;
  if (!masterHosts.has(host)) {
    requireThat(host.endsWith('.' + base), 404, 'TENANT_NOT_FOUND', 'Child tidak ditemukan.');
    hostSlug = host.slice(0, -(base.length + 1));
    requireThat(validSlug(hostSlug), 404, 'TENANT_NOT_FOUND', 'Child tidak ditemukan.');
  }
  requireThat(!hostSlug || !pathSlug || hostSlug === pathSlug, 400, 'TENANT_CONFLICT', 'Host dan path Child tidak cocok.');
  return Object.freeze({ slug: hostSlug || pathSlug, path, host });
}

export function publicTenant(tenant) {
  return {
    id: tenant.id, slug: tenant.slug, kind: tenant.kind, status: tenant.status,
    display_name: tenant.display_name, hero_title: tenant.hero_title,
    description: tenant.description, logo_url: tenant.logo_url, whatsapp: tenant.whatsapp,
    config_version: tenant.config_version,
  };
}

export function objectBody(body, allowed) {
  requireThat(body && typeof body === 'object' && !Array.isArray(body), 400, 'INVALID_BODY', 'Isi permintaan tidak valid.');
  requireThat(Object.keys(body).every(key => allowed.includes(key)), 400, 'INVALID_FIELD', 'Terdapat field yang tidak diizinkan.');
  return body;
}

export function textField(value, max, required = false) {
  requireThat(typeof value === 'string' && value.trim().length <= max && (!required || value.trim().length > 0), 400, 'INVALID_FIELD', 'Isi field tidak valid atau terlalu panjang.');
  return value.trim();
}

export function brandingInput(body) {
  objectBody(body, ['display_name', 'hero_title', 'description', 'logo_url', 'whatsapp']);
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    result[key] = textField(value, key === 'description' ? 600 : key === 'logo_url' ? 1000 : 140, key === 'display_name');
  }
  if (result.logo_url) {
    let url;
    try { url = new URL(result.logo_url); } catch { throw new TenantError(400, 'INVALID_LOGO', 'Logo harus berupa URL HTTPS.'); }
    requireThat(url.protocol === 'https:' && !url.username && !url.password, 400, 'INVALID_LOGO', 'Logo harus berupa URL HTTPS.');
  }
  if (result.whatsapp) requireThat(/^\d{8,16}$/.test(result.whatsapp), 400, 'INVALID_PHONE', 'WhatsApp menggunakan kode negara dan angka saja.');
  requireThat(Object.keys(result).length > 0, 400, 'EMPTY_UPDATE', 'Tidak ada perubahan.');
  return result;
}

const PERMISSIONS = {
  partner_owner: ['user.view', 'content.manage'],
  partner_admin: ['user.view', 'content.manage'],
  partner_staff: [],
};
export function hasPermission(membership, permission) {
  return membership?.status === 'active' && Boolean(PERMISSIONS[membership.role]?.includes(permission));
}
