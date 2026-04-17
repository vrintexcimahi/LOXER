import { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';
import { searchJobs } from './services/careerjetService.js';
import { buildApplicationStatusNotification } from './services/applicationStatusNotification.js';

let publicIpPromise: Promise<string> | null = null;

function getForwardedIp(req: IncomingMessage) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(',')[0]?.trim() || '';
  }

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '';
}

function isLocalIp(ip: string) {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('fe80:') ||
    ip.startsWith('::ffff:192.168.')
  );
}

async function getPublicIp() {
  if (publicIpPromise) return publicIpPromise;

  publicIpPromise = fetch('https://api.ipify.org?format=json')
    .then(async (response) => {
      if (!response.ok) return '';
      const payload = await response.json();
      return payload.ip || '';
    })
    .catch(() => '')
    .finally(() => {
      publicIpPromise = null;
    });

  return publicIpPromise;
}

async function resolveClientIp(req: IncomingMessage) {
  const ip = getForwardedIp(req);
  if (!isLocalIp(ip)) return ip;
  return getPublicIp();
}

function attachJsonHelpers(res: ServerResponse) {
  const response = res as ServerResponse & {
    status: (code: number) => typeof response;
    json: (payload: unknown) => void;
  };

  response.status = (code: number) => {
    response.statusCode = code;
    return response;
  };

  response.json = (payload: unknown) => {
    if (!response.headersSent) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    response.end(JSON.stringify(payload));
  };

  return response;
}

function createApiJobsMiddleware(env: Record<string, string>) {
  if (env.CAREERJET_API_KEY) {
    process.env.CAREERJET_API_KEY = env.CAREERJET_API_KEY;
  }

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/jobs')) {
      next();
      return;
    }

    const requestUrl = new URL(req.url, 'http://localhost');
    const query = Object.fromEntries(requestUrl.searchParams.entries());
    const response = attachJsonHelpers(res);

    if (req.method && req.method !== 'GET') {
      response.status(405).json({ message: 'Method tidak didukung' });
      return;
    }

    try {
      const userAgent = query.user_agent || req.headers['user-agent'] || '';
      const userIp = await resolveClientIp(req);
      const data = await searchJobs({
        keywords: query.keywords || '',
        location: query.location || '',
        page: Number(query.page || '1') || 1,
        sort: query.sort || 'date',
        contract_type: query.contract_type || '',
        work_hours: query.work_hours || '',
        user_ip: userIp,
        user_agent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
      });

      response.status(200).json(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada proxy Careerjet';

      if (message === 'Locale tidak didukung') {
        response.status(400).json({ message });
        return;
      }

      if (message === 'user_ip atau user_agent wajib diisi') {
        response.status(403).json({ message });
        return;
      }

      response.status(500).json({ message });
    }
  };
}

function createIntegrationsStatusMiddleware(env: Record<string, string>) {
  if (env.CAREERJET_API_KEY) process.env.CAREERJET_API_KEY = env.CAREERJET_API_KEY;
  if (env.JOOBLE_API_KEY) process.env.JOOBLE_API_KEY = env.JOOBLE_API_KEY;
  if (env.RAPIDAPI_KEY) process.env.RAPIDAPI_KEY = env.RAPIDAPI_KEY;

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/integrations-status')) {
      next();
      return;
    }

    const response = attachJsonHelpers(res);

    if (req.method && req.method !== 'GET') {
      response.status(405).json({ message: 'Method tidak didukung' });
      return;
    }

    const publicIp = await getPublicIp();

    response.status(200).json({
      publicIp,
      integrations: [
        {
          id: 'careerjet',
          label: 'Careerjet Job Search API',
          configured: Boolean(process.env.CAREERJET_API_KEY),
          endpoint: '/api/jobs',
          docsUrl: 'https://www.careerjet.co.id/partners/api/php',
          mode: 'server-proxy',
          note: 'Butuh API key privat dan whitelist server IP publik.',
        },
        {
          id: 'jooble',
          label: 'Jooble API',
          configured: Boolean(process.env.JOOBLE_API_KEY),
          endpoint: '/api/integrations/jooble',
          docsUrl: 'https://jooble.org/api/about',
          mode: 'server-proxy',
          note: 'Cocok untuk lowongan Indonesia, API key didapat via email.',
        },
        {
          id: 'arbeitnow',
          label: 'Arbeitnow API',
          configured: true,
          endpoint: 'https://www.arbeitnow.com/api/job-board-api',
          docsUrl: 'https://www.arbeitnow.com/api/job-board-api',
          mode: 'public-feed',
          note: 'Feed publik tanpa API key, cocok untuk remote jobs internasional.',
        },
        {
          id: 'jsearch',
          label: 'JSearch via RapidAPI',
          configured: Boolean(process.env.RAPIDAPI_KEY),
          endpoint: '/api/integrations/jsearch',
          docsUrl: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',
          mode: 'server-proxy',
          note: 'Perlu RapidAPI key dan pengaturan quota sesuai paket.',
        },
      ],
    });
  };
}

function createAdminUsersMiddleware(env: Record<string, string>) {
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    // Not configured, let requests fall through so the UI can show a helpful error.
    return (_req: IncomingMessage, _res: ServerResponse, next: () => void) => next();
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/admin/users')) {
      next();
      return;
    }

    const response = attachJsonHelpers(res);

    if (req.method && req.method !== 'GET') {
      response.status(405).json({ message: 'Method tidak didukung' });
      return;
    }

    // Require a Supabase access token and verify caller is admin.
    const authHeader = req.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const callerId = userData.user.id;
    const { data: callerMeta, error: callerMetaError } = await adminClient
      .from('users_meta')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    if (callerMetaError) {
      response.status(500).json({ message: callerMetaError.message });
      return;
    }

    if (callerMeta?.role !== 'admin') {
      response.status(403).json({ message: 'Forbidden' });
      return;
    }

    try {
      const requestUrl = new URL(req.url, 'http://localhost');
      const role = requestUrl.searchParams.get('role') || 'all';
      const sort = requestUrl.searchParams.get('sort') || 'newest';
      const page = Number(requestUrl.searchParams.get('page') || '1') || 1;
      const pageSize = Number(requestUrl.searchParams.get('page_size') || '20') || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = adminClient
        .from('users_meta')
        .select('id, email, role, created_at, is_banned', { count: 'exact' });

      if (role !== 'all') query = query.eq('role', role);
      if (sort === 'newest') query = query.order('created_at', { ascending: false });
      if (sort === 'oldest') query = query.order('created_at', { ascending: true });
      if (sort === 'email') query = query.order('email', { ascending: true });

      const { data, count, error } = await query.range(from, to);
      if (error) {
        response.status(500).json({ message: error.message });
        return;
      }

      const users = (data || []) as Array<{ id: string; email: string; role: string; created_at: string; is_banned: boolean }>;
      const userIds = users.map((u) => u.id);

      const [seekerRes, companyRes] = await Promise.all([
        userIds.length
          ? adminClient.from('seeker_profiles').select('user_id, full_name').in('user_id', userIds)
          : Promise.resolve({ data: [], error: null } as { data: Array<{ user_id: string; full_name: string }>; error: null }),
        userIds.length
          ? adminClient.from('companies').select('user_id, name').in('user_id', userIds)
          : Promise.resolve({ data: [], error: null } as { data: Array<{ user_id: string; name: string }>; error: null }),
      ]);

      const seekerMap = new Map((seekerRes.data || []).map((s) => [s.user_id, s.full_name]));
      const companyMap = new Map((companyRes.data || []).map((s) => [s.user_id, s.name]));

      const rows = users.map((row) => ({
        ...row,
        full_name: seekerMap.get(row.id),
        company_name: companyMap.get(row.id),
      }));

      response.status(200).json({ rows, total: count || 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
      response.status(500).json({ message });
    }
  };
}

function createEnsureDefaultAdminMiddleware(env: Record<string, string>) {
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const defaultAdminEmail = (
    env.DEFAULT_ADMIN_EMAIL ||
    process.env.DEFAULT_ADMIN_EMAIL ||
    env.VITE_DEFAULT_ADMIN_EMAIL ||
    process.env.VITE_DEFAULT_ADMIN_EMAIL ||
    'admin@loxer.app'
  ).toLowerCase();

  if (!supabaseUrl || !serviceRoleKey) {
    return (_req: IncomingMessage, _res: ServerResponse, next: () => void) => next();
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/admin/ensure-default-admin')) {
      next();
      return;
    }

    const response = attachJsonHelpers(res);

    if (req.method && req.method !== 'POST') {
      response.status(405).json({ message: 'Method tidak didukung' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    const signedInUser = userData?.user;
    if (userError || !signedInUser) {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const email = (signedInUser.email || '').trim().toLowerCase();
    if (email !== defaultAdminEmail) {
      response.status(403).json({ message: 'Forbidden' });
      return;
    }

    const payload = {
      id: signedInUser.id,
      email: signedInUser.email || defaultAdminEmail,
      role: 'admin',
    } as const;

    const { data: upserted, error: upsertError } = await adminClient
      .from('users_meta')
      .upsert(payload, { onConflict: 'id' })
      .select('id, email, role, created_at, is_banned')
      .maybeSingle();

    if (upsertError) {
      response.status(500).json({ message: upsertError.message });
      return;
    }

    response.status(200).json({ ok: true, meta: upserted ?? payload });
  };
}

function createApplicationStatusNotificationMiddleware(env: Record<string, string>) {
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return (_req: IncomingMessage, _res: ServerResponse, next: () => void) => next();
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/application-status-notification')) {
      next();
      return;
    }

    const response = attachJsonHelpers(res);

    if (req.method && req.method !== 'POST') {
      response.status(405).json({ message: 'Method tidak didukung' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller) {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { data: callerMeta, error: callerMetaError } = await adminClient
      .from('users_meta')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerMetaError) {
      response.status(500).json({ message: callerMetaError.message });
      return;
    }

    if (!callerMeta || !['admin', 'employer'].includes(callerMeta.role)) {
      response.status(403).json({ message: 'Forbidden' });
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const rawBody = Buffer.concat(chunks).toString('utf8');
      const body = rawBody ? JSON.parse(rawBody) as { applicationId?: string; status?: string } : {};
      const applicationId = body.applicationId || '';
      const status = body.status || '';

      if (!applicationId || !status) {
        response.status(400).json({ message: 'applicationId dan status wajib diisi.' });
        return;
      }

      const { data: application, error: applicationError } = await adminClient
        .from('applications')
        .select('id, job_id, seeker_id, job_listings!inner(id, title, company_id), seeker_profiles!inner(id, user_id)')
        .eq('id', applicationId)
        .maybeSingle();

      if (applicationError) {
        response.status(500).json({ message: applicationError.message });
        return;
      }

      const job = Array.isArray(application?.job_listings) ? application.job_listings[0] : application?.job_listings;
      const seeker = Array.isArray(application?.seeker_profiles) ? application.seeker_profiles[0] : application?.seeker_profiles;

      if (!application || !job || !seeker) {
        response.status(404).json({ message: 'Aplikasi tidak ditemukan.' });
        return;
      }

      if (callerMeta.role === 'employer') {
        const { data: companyOwner, error: companyError } = await adminClient
          .from('companies')
          .select('id')
          .eq('id', job.company_id)
          .eq('user_id', caller.id)
          .maybeSingle();

        if (companyError) {
          response.status(500).json({ message: companyError.message });
          return;
        }

        if (!companyOwner) {
          const { data: membership, error: membershipError } = await adminClient
            .from('company_members')
            .select('id')
            .eq('company_id', job.company_id)
            .eq('user_id', caller.id)
            .maybeSingle();

          if (membershipError) {
            response.status(500).json({ message: membershipError.message });
            return;
          }

          if (!membership) {
            response.status(403).json({ message: 'Forbidden' });
            return;
          }
        }
      }

      const notification = buildApplicationStatusNotification(status, job.title || 'lowongan ini');
      if (!notification) {
        response.status(200).json({ ok: true, skipped: true });
        return;
      }

      const { error: insertError } = await adminClient.from('notifications').insert({
        user_id: seeker.user_id,
        type: 'application_update',
        title: notification.title,
        message: notification.message,
        metadata: {
          application_id: application.id,
          job_id: job.id,
          status,
        },
      });

      if (insertError) {
        response.status(500).json({ message: insertError.message });
        return;
      }

      response.status(200).json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengirim notifikasi status lamaran.';
      response.status(500).json({ message });
    }
  };
}

function createAdminAuditLogMiddleware(env: Record<string, string>) {
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return (_req: IncomingMessage, _res: ServerResponse, next: () => void) => next();
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/admin-audit-log')) {
      next();
      return;
    }

    const response = attachJsonHelpers(res);

    if (req.method && req.method !== 'POST') {
      response.status(405).json({ message: 'Method tidak didukung' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller) {
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { data: callerMeta, error: callerMetaError } = await adminClient
      .from('users_meta')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerMetaError) {
      response.status(500).json({ message: callerMetaError.message });
      return;
    }

    if (callerMeta?.role !== 'admin') {
      response.status(403).json({ message: 'Forbidden' });
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const rawBody = Buffer.concat(chunks).toString('utf8');
      const body = rawBody ? JSON.parse(rawBody) as {
        action?: string;
        targetType?: string;
        targetId?: string;
        detail?: string;
      } : {};

      if (!body.action || !body.targetType) {
        response.status(400).json({ message: 'action dan targetType wajib diisi.' });
        return;
      }

      const { error: insertError } = await adminClient.from('audit_logs').insert({
        admin_id: caller.id,
        admin_email: caller.email || '',
        action: body.action,
        target_type: body.targetType,
        target_id: body.targetId || '',
        detail: body.detail || '',
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        response.status(500).json({ message: insertError.message });
        return;
      }

      response.status(200).json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mencatat audit log.';
      response.status(500).json({ message });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiJobsMiddleware = createApiJobsMiddleware(env);
  const integrationsStatusMiddleware = createIntegrationsStatusMiddleware(env);
  const adminUsersMiddleware = createAdminUsersMiddleware(env);
  const ensureDefaultAdminMiddleware = createEnsureDefaultAdminMiddleware(env);
  const applicationStatusNotificationMiddleware = createApplicationStatusNotificationMiddleware(env);
  const adminAuditLogMiddleware = createAdminAuditLogMiddleware(env);

  return {
    plugins: [
      react(),
      {
        name: 'careerjet-api-proxy',
        configureServer(server) {
          server.middlewares.use(apiJobsMiddleware);
          server.middlewares.use(integrationsStatusMiddleware);
          server.middlewares.use(adminUsersMiddleware);
          server.middlewares.use(ensureDefaultAdminMiddleware);
          server.middlewares.use(applicationStatusNotificationMiddleware);
          server.middlewares.use(adminAuditLogMiddleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(apiJobsMiddleware);
          server.middlewares.use(integrationsStatusMiddleware);
          server.middlewares.use(adminUsersMiddleware);
          server.middlewares.use(ensureDefaultAdminMiddleware);
          server.middlewares.use(applicationStatusNotificationMiddleware);
          server.middlewares.use(adminAuditLogMiddleware);
        },
      },
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
