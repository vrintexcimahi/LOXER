import crypto from 'node:crypto';
import { API_PREFIX, MASTER_ID, MEMBER_ROLES, TenantError, requireThat, resolveAddress, publicTenant, validSlug, objectBody, textField, brandingInput, hasPermission } from './core.js';

async function readBody(req) {
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    requireThat(Buffer.byteLength(raw) <= 16384, 413, 'BODY_TOO_LARGE', 'Permintaan terlalu besar.');
    try { return JSON.parse(raw); } catch { throw new TenantError(400, 'INVALID_JSON', 'JSON tidak valid.'); }
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    requireThat(size <= 16384, 413, 'BODY_TOO_LARGE', 'Permintaan terlalu besar.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
  catch { throw new TenantError(400, 'INVALID_JSON', 'JSON tidak valid.'); }
}

// Short-lived in-process limiter. Distributed limits belong at the deployment edge too.
export function createTenantHandler({ env, repository, auth }) {
  const requests = new Map();
  return async (req, res, next) => {
    if (!(req.url || '').split('?')[0].startsWith(API_PREFIX + '/')) {
      if (next) return next();
      res.statusCode = 404; return res.end();
    }
    const requestId = crypto.randomUUID();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Request-ID', requestId);
    const respond = (status, data) => { res.statusCode = status; res.end(JSON.stringify({ ...data, request_id: requestId })); };
    try {
      // Existing deployments keep their master site working with the default flag OFF,
      // even before the optional base-domain configuration has been supplied.
      if (env.PARTNER_CHILD_PANEL_ENABLED !== 'true' && (req.url || '').split('?')[0].endsWith('/capabilities')) {
        const rawPath = (req.url || '').split('?')[0];
        const host = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
        const base = env.APP_BASE_DOMAIN?.toLowerCase();
        const isChild = rawPath.startsWith(API_PREFIX + '/p/') || Boolean(base && host.endsWith('.' + base));
        return respond(200, { enabled:false, is_child:isChild, modules:[] });
      }
      const address = resolveAddress(req, env);
      if (address.path === '/capabilities' && req.method === 'GET') {
        return respond(200, { enabled: env.PARTNER_CHILD_PANEL_ENABLED === 'true', is_child: Boolean(address.slug), slug: address.slug, modules: ['members', 'branding'] });
      }
      requireThat(env.PARTNER_CHILD_PANEL_ENABLED === 'true', 503, 'FEATURE_DISABLED', 'Program Child Panel belum diaktifkan.');
      const repo = await repository();
      const tenant = await repo.tenant(address.slug);
      requireThat(tenant, 404, 'TENANT_NOT_FOUND', 'Child tidak ditemukan.');
      const token = typeof req.headers.authorization === 'string' && /^Bearer /i.test(req.headers.authorization) ? req.headers.authorization.slice(7).trim() : '';
      const authRoute = ['/login','/register'].includes(address.path);
      const now = Date.now();
      for (const [key, value] of requests) if (value.reset <= now) requests.delete(key);
      const rateKey = `${req.socket?.remoteAddress || 'edge'}:${tenant.id}:${authRoute ? 'auth' : 'api'}`;
      const rate = requests.get(rateKey) || { count: 0, reset: now + 60000 };
      requireThat(requests.has(rateKey) || requests.size < 10000, 429, 'RATE_LIMIT', 'Terlalu banyak permintaan.');
      rate.count += 1; requests.set(rateKey, rate);
      requireThat(rate.count <= (authRoute ? 12 : 180), 429, 'RATE_LIMIT', 'Terlalu banyak permintaan. Coba kembali sebentar lagi.');
      if (tenant.kind === 'child') requireThat(tenant.status === 'active', 403, 'TENANT_INACTIVE', 'Child belum aktif atau sedang ditangguhkan.');
      if (address.path === '/context' && req.method === 'GET') {
        return respond(200, { tenant: publicTenant(tenant), modules: ['members', 'branding'] });
      }
      if (address.path === '/register' && req.method === 'POST') {
        requireThat(tenant.kind === 'child', 400, 'CHILD_REQUIRED', 'Pendaftaran ini khusus Child.');
        const input = objectBody(await readBody(req), ['email','password','display_name','role']);
        input.email = textField(input.email, 254, true).toLowerCase();
        input.display_name = textField(input.display_name, 100, true);
        requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email), 400, 'INVALID_EMAIL', 'Email tidak valid.');
        requireThat(typeof input.password === 'string' && input.password.length >= 12 && input.password.length <= 128, 400, 'INVALID_PASSWORD', 'Password harus 12–128 karakter.');
        requireThat(MEMBER_ROLES.includes(input.role), 400, 'INVALID_ROLE', 'Role pendaftaran tidak valid.');
        const message = await auth.register(tenant.id, input, requestId);
        return respond(201, { message: message || 'Pendaftaran berhasil. Silakan masuk melalui Child ini.' });
      }
      if (address.path === '/login' && req.method === 'POST') {
        requireThat(tenant.kind === 'child', 400, 'CHILD_REQUIRED', 'Gunakan login master.');
        const input = objectBody(await readBody(req), ['email','password']);
        const email = textField(input.email, 254, true).toLowerCase();
        requireThat(typeof input.password === 'string' && input.password.length <= 128, 400, 'INVALID_PASSWORD', 'Password tidak valid.');
        const session = await auth.login(tenant.id, email, input.password);
        await repo.audit(tenant.id, session.user_id, 'member.login', session.user_id, requestId);
        return respond(200, { session });
      }
      const identity = token ? await auth.identity(token, tenant.id) : null;
      requireThat(identity && !identity.is_banned, 401, 'UNAUTHORIZED', 'Silakan masuk dengan akun aktif.');
      if (address.path === '/logout' && req.method === 'POST') {
        await auth.logout(token);
        return respond(200, { ok: true });
      }
      if (address.path.startsWith('/master/')) {
        const masterIds = String(env.PARTNER_MASTER_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
        requireThat(tenant.id === MASTER_ID && ['admin','superadmin'].includes(identity.role) && masterIds.includes(identity.id), 403, 'FORBIDDEN', 'Hanya administrator master yang ditunjuk dapat mengelola Child.');
        const params = new URL(req.url, 'http://local').searchParams;
        const page = Math.max(1, Math.min(10000, Number(params.get('page')) || 1));
        requireThat(Number.isInteger(page), 400, 'INVALID_PAGE', 'Halaman tidak valid.');
        if (address.path === '/master/partners' && req.method === 'GET') {
          await repo.audit(MASTER_ID, identity.id, 'partners.listed', MASTER_ID, requestId);
          return respond(200, { rows: await repo.list(25, (page - 1) * 25), page });
        }
        if (address.path === '/master/partners' && req.method === 'POST') {
          const input = objectBody(await readBody(req), ['slug','business_name','owner_user_id']);
          requireThat(validSlug(input.slug), 400, 'INVALID_SLUG', 'Slug harus 3–48 huruf kecil, angka atau tanda hubung dan bukan nama sistem.');
          input.business_name = textField(input.business_name, 100, true);
          input.owner_user_id = textField(input.owner_user_id, 100, true);
          return respond(201, { tenant: publicTenant(await repo.create(input, identity.id, requestId)) });
        }
        const statusMatch = /^\/master\/partners\/([a-f0-9-]{36})\/status$/.exec(address.path);
        if (statusMatch && req.method === 'POST') {
          const input = objectBody(await readBody(req), ['status','reason']);
          requireThat(['active','suspended','terminated'].includes(input.status), 400, 'INVALID_STATUS', 'Status tidak valid.');
          const reason = textField(input.reason, 500, true);
          return respond(200, { tenant: publicTenant(await repo.status(statusMatch[1], input.status, identity.id, requestId, reason)) });
        }
        throw new TenantError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.');
      }
      const member = await repo.membership(tenant.id, identity.id);
      requireThat(member?.status === 'active', 403, 'MEMBERSHIP_REQUIRED', 'Akun tidak mempunyai akses ke Child ini.');
      if (address.path === '/me' && req.method === 'GET') {
        return respond(200, { member: { user_id: member.user_id, display_name: member.display_name, role: member.role }, can_manage: hasPermission(member, 'user.view') });
      }
      if (address.path === '/members' && req.method === 'GET') {
        requireThat(hasPermission(member, 'user.view'), 403, 'FORBIDDEN', 'Anda tidak dapat melihat pengguna Child.');
        const params = new URL(req.url, 'http://local').searchParams;
        const page = Math.max(1, Math.min(10000, Number(params.get('page')) || 1));
        requireThat(Number.isInteger(page), 400, 'INVALID_PAGE', 'Halaman tidak valid.');
        await repo.audit(tenant.id, identity.id, 'members.listed', tenant.id, requestId);
        return respond(200, { rows: await repo.members(tenant.id, 25, (page - 1) * 25), total: await repo.count(tenant.id), page });
      }
      if (address.path === '/branding' && req.method === 'PATCH') {
        requireThat(hasPermission(member, 'content.manage'), 403, 'FORBIDDEN', 'Anda tidak dapat mengubah branding.');
        const fields = brandingInput(await readBody(req));
        await repo.branding(tenant.id, fields, identity.id, requestId);
        return respond(200, { tenant: publicTenant(await repo.tenant(address.slug)) });
      }
      throw new TenantError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.');
    } catch (error) {
      const known = error instanceof TenantError;
      // Never return SQL details, provider errors, passwords or bearer tokens.
      if (!known) console.error('[tenant-platform]', requestId, 'Internal request failure');
      return respond(known ? error.status : 500, { error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'Layanan mitra belum siap atau mengalami gangguan.' } });
    }
  };
}
