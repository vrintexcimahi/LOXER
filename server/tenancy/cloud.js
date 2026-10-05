import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createTenantHandler } from './handler.js';
import { requireThat, TenantError } from './core.js';

export function createCloudTenantHandler(env) {
  const client = () => {
    requireThat(env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY, 503, 'CLOUD_UNAVAILABLE', 'Konfigurasi cloud belum lengkap.');
    return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  };
  const result = async query => {
    const { data, error } = await query;
    if (error) {
      if (error.code === '23505') throw new TenantError(409, 'CONFLICT', 'Data sudah terdaftar.');
      if (error.code === 'P0001') throw new TenantError(409, 'STATE_CONFLICT', 'Status atau izin berubah. Muat ulang dan coba kembali.');
      throw error;
    }
    return data;
  };
  const digest = token => crypto.createHash('sha256').update(token).digest('hex');
  const mutate = (operation, tenantId, actorId, requestId, payload) => result(client().rpc('tenant_platform_mutate', { operation, target_tenant: tenantId, actor: actorId, request_id: requestId, payload }));
  const repo = {
    tenant: slug => result(client().from('tenants').select('*').eq('slug', slug || 'master').maybeSingle()),
    identity: id => result(client().from('users_meta').select('id,email,role,is_banned').eq('id', id).maybeSingle()),
    membership: (tenantId, userId) => result(client().from('tenant_memberships').select('*').eq('tenant_id', tenantId).eq('user_id', userId).maybeSingle()),
    list: (limit, offset) => result(client().from('tenants').select('*').eq('kind','child').order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1)),
    members: (tenantId, limit, offset) => result(client().from('tenant_memberships').select('user_id,display_name,email,role,status,joined_at').eq('tenant_id', tenantId).order('joined_at', { ascending: false }).order('user_id').range(offset, offset + limit - 1)),
    count: async tenantId => {
      const { count, error } = await client().from('tenant_memberships').select('*', { count:'exact', head:true }).eq('tenant_id', tenantId);
      if (error) throw error;
      return count;
    },
    audit: (tenantId, actorId, action, resourceId, requestId) => result(client().from('tenant_audit_events').insert({ tenant_id:tenantId, actor_id:actorId, action, resource_id:resourceId, request_id:requestId })),
    create: (input, actor, requestId) => mutate('create', null, actor, requestId, input),
    status: (tenantId, status, actor, requestId, reason) => mutate('status', tenantId, actor, requestId, { status, reason }),
    branding: (tenantId, fields, actor, requestId) => mutate('branding', tenantId, actor, requestId, fields),
  };
  const auth = {
    identity: async (token, tenantId) => {
      if (token.startsWith('tns_')) {
        const session = await result(client().from('tenant_sessions').select('user_id').eq('token_hash',digest(token)).eq('tenant_id',tenantId).gt('expires_at',new Date().toISOString()).maybeSingle());
        return session ? repo.identity(session.user_id) : null;
      }
      const { data, error } = await client().auth.getUser(token);
      return !error && data.user ? repo.identity(data.user.id) : null;
    },
    register: async (tenantId, input, requestId) => {
      const admin = client();
      // Unique createUser prevents accidentally attaching an existing global identity.
      // Email is deliberately unconfirmed. Login requires confirmation.
      const { data, error } = await admin.auth.admin.createUser({ email:input.email, password:input.password, email_confirm:false, app_metadata:{ partner_tenant_id:tenantId } });
      requireThat(!error && data?.user, 409, 'REGISTRATION_UNAVAILABLE', 'Pendaftaran tidak dapat diproses. Gunakan akun yang sudah terdaftar bila tersedia.');
      try {
        await mutate('register', tenantId, data.user.id, requestId, { ...input, password:undefined });
      } catch (failure) {
        // Do not delete on an ambiguous network failure: the transaction may have committed.
        // Operator reconciliation can inspect this app_metadata marker without exposing credentials.
        throw failure;
      }
      const { error: mailError } = await admin.auth.resend({ type:'signup', email:input.email });
      return mailError ? 'Akun tersimpan, tetapi email konfirmasi belum terkirim. Hubungi dukungan LOXER sebelum masuk.' : 'Akun tersimpan. Konfirmasi email Anda, lalu masuk melalui Child ini.';
    },
    login: async (tenantId, email, password) => {
      const loginClient = client();
      const { data, error } = await loginClient.auth.signInWithPassword({ email, password });
      requireThat(!error && data?.user?.email_confirmed_at && data.session, 401, 'LOGIN_FAILED', 'Email, password, konfirmasi email, atau akses Child tidak valid.');
      const identity = await repo.identity(data.user.id);
      const member = await repo.membership(tenantId, data.user.id);
      // Do not expose the global auth tokens to the Child UI.
      await loginClient.auth.signOut({ scope:'local' });
      requireThat(identity && !identity.is_banned && member?.status === 'active', 401, 'LOGIN_FAILED', 'Email, password, atau akses Child tidak valid.');
      const token = 'tns_' + crypto.randomBytes(32).toString('base64url');
      await result(client().from('tenant_sessions').insert({ token_hash:digest(token), tenant_id:tenantId, user_id:identity.id, expires_at:new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() }));
      return { access_token:token, user_id:identity.id };
    },
    logout: token => result(client().from('tenant_sessions').delete().eq('token_hash',digest(token))),
  };
  return createTenantHandler({ env, repository:async () => repo, auth });
}
