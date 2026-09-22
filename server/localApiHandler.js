import {
  getLocalDb,
  queryOne,
  queryAll,
  execute,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  recordDailyAnalyticsSnapshot,
} from './localDb.js';
import crypto from 'node:crypto';
import { buildApplicationStatusNotification } from '../services/applicationStatusNotification.js';

function parseBearerToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  res.end(JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// Auth Handlers
// ---------------------------------------------------------------------------

async function handleSignUp(req, res) {
  const body = await parseJsonBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const metadata = body.options?.data || {};
  const role = metadata.role || 'seeker';
  const fullName = metadata.full_name || '';
  const phone = metadata.phone || '';

  if (!email || !password) {
    return sendJson(res, 400, { error: { message: 'Email dan password wajib diisi.' } });
  }

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return sendJson(res, 400, { error: { message: 'User sudah terdaftar.' } });
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [
    userId,
    email,
    passwordHash,
    now,
  ]);

  execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)', [
    userId,
    email,
    role,
    now,
  ]);

  if (role === 'seeker') {
    execute(
      'INSERT INTO seeker_profiles (id, user_id, full_name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), userId, fullName, phone, now, now]
    );
  }

  const userObj = {
    id: userId,
    email,
    user_metadata: { role, full_name: fullName, phone },
    created_at: now,
  };

  const accessToken = generateToken({ sub: userId, email, role });

  return sendJson(res, 200, {
    data: {
      user: userObj,
      session: {
        access_token: accessToken,
        token_type: 'bearer',
        user: userObj,
      },
    },
    error: null,
  });
}

async function handleSignIn(req, res) {
  const body = await parseJsonBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return sendJson(res, 400, { error: { message: 'Email dan password wajib diisi.' } });
  }

  const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return sendJson(res, 400, { error: { message: 'Email atau password salah.' } });
  }

  const meta = queryOne('SELECT * FROM users_meta WHERE id = ?', [user.id]);
  if (meta?.is_banned) {
    return sendJson(res, 403, { error: { message: 'Akun Anda telah disuspend oleh administrator.' } });
  }

  const role = meta?.role || 'seeker';
  const userObj = {
    id: user.id,
    email: user.email,
    user_metadata: { role },
    created_at: user.created_at,
  };

  const accessToken = generateToken({ sub: user.id, email: user.email, role });

  return sendJson(res, 200, {
    data: {
      user: userObj,
      session: {
        access_token: accessToken,
        token_type: 'bearer',
        user: userObj,
      },
    },
    error: null,
  });
}

async function handleGetUser(req, res) {
  const token = parseBearerToken(req);
  const decoded = verifyToken(token);

  if (!decoded) {
    return sendJson(res, 401, { error: { message: 'Token tidak valid atau telah kedaluwarsa.' } });
  }

  const user = queryOne('SELECT id, email, created_at FROM users WHERE id = ?', [decoded.sub]);
  if (!user) {
    return sendJson(res, 404, { error: { message: 'User tidak ditemukan.' } });
  }

  const meta = queryOne('SELECT * FROM users_meta WHERE id = ?', [user.id]);
  const userObj = {
    id: user.id,
    email: user.email,
    user_metadata: { role: meta?.role || 'seeker' },
    created_at: user.created_at,
  };

  return sendJson(res, 200, {
    data: { user: userObj },
    error: null,
  });
}

async function handleGoogleAuth(req, res) {
  const body = await parseJsonBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const fullName = String(body.fullName || body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const role = body.role === 'employer' ? 'employer' : 'seeker';
  const avatarUrl = body.avatarUrl || 'https://lh3.googleusercontent.com/a/default-user';

  if (!email || !email.includes('@')) {
    return sendJson(res, 400, { error: { message: 'Email Google yang valid wajib diisi.' } });
  }

  let user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
  const now = new Date().toISOString();
  let userId;

  if (!user) {
    userId = crypto.randomUUID();
    execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [
      userId,
      email,
      hashPassword(crypto.randomBytes(16).toString('hex')),
      now,
    ]);

    execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)', [
      userId,
      email,
      role,
      now,
    ]);

    const resolvedName = fullName || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (role === 'seeker') {
      execute(
        'INSERT INTO seeker_profiles (id, user_id, full_name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, resolvedName, phone, now, now]
      );
    } else if (role === 'employer') {
      execute(
        'INSERT INTO companies (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, resolvedName, now, now]
      );
    }
  } else {
    userId = user.id;
    const meta = queryOne('SELECT * FROM users_meta WHERE id = ?', [userId]);
    if (meta?.is_banned) {
      return sendJson(res, 403, { error: { message: 'Akun Anda telah disuspend oleh administrator.' } });
    }
  }

  const meta = queryOne('SELECT * FROM users_meta WHERE id = ?', [userId]);
  const userRole = meta?.role || role;
  const userObj = {
    id: userId,
    email,
    user_metadata: {
      role: userRole,
      full_name: fullName,
      name: fullName,
      phone,
      avatar_url: avatarUrl,
      picture: avatarUrl,
      iss: 'https://accounts.google.com',
    },
    created_at: user ? user.created_at : now,
  };

  const accessToken = generateToken({ sub: userId, email, role: userRole });

  return sendJson(res, 200, {
    data: {
      user: userObj,
      session: {
        access_token: accessToken,
        token_type: 'bearer',
        user: userObj,
      },
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Database Query Execution
// ---------------------------------------------------------------------------

function buildWhereClause(filters = []) {
  const conditions = [];
  const params = [];

  for (const filter of filters) {
    const { column, op, value } = filter;
    if (op === 'eq') {
      if (value === null) {
        conditions.push(`"${column}" IS NULL`);
      } else {
        conditions.push(`"${column}" = ?`);
        params.push(value);
      }
    } else if (op === 'in') {
      if (Array.isArray(value) && value.length > 0) {
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`"${column}" IN (${placeholders})`);
        params.push(...value);
      } else {
        conditions.push('1 = 0');
      }
    } else if (op === 'neq') {
      conditions.push(`"${column}" != ?`);
      params.push(value);
    } else if (op === 'like' || op === 'ilike') {
      conditions.push(`"${column}" LIKE ?`);
      params.push(value);
    } else if (op === 'gte') {
      conditions.push(`"${column}" >= ?`);
      params.push(value);
    } else if (op === 'lte') {
      conditions.push(`"${column}" <= ?`);
      params.push(value);
    } else if (op === 'gt') {
      conditions.push(`"${column}" > ?`);
      params.push(value);
    } else if (op === 'lt') {
      conditions.push(`"${column}" < ?`);
      params.push(value);
    }
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

// Expand relations for complex Supabase queries (e.g. job_listings with companies, applications with jobs, etc.)
function enrichRowRelations(table, row) {
  if (!row) return row;

  if (table === 'job_listings') {
    if (row.company_id) {
      row.companies = queryOne('SELECT * FROM companies WHERE id = ?', [row.company_id]) || null;
    }
  } else if (table === 'applications') {
    if (row.job_id) {
      const job = queryOne('SELECT * FROM job_listings WHERE id = ?', [row.job_id]);
      if (job) {
        job.companies = queryOne('SELECT * FROM companies WHERE id = ?', [job.company_id]) || null;
      }
      row.job_listings = job || null;
    }
    if (row.seeker_id) {
      const profile = queryOne('SELECT * FROM seeker_profiles WHERE id = ?', [row.seeker_id]);
      if (profile) {
        profile.seeker_skills = queryAll('SELECT * FROM seeker_skills WHERE seeker_id = ?', [profile.id]) || [];
        profile.seeker_education = queryAll('SELECT school_name, degree FROM seeker_education WHERE seeker_id = ?', [profile.id]) || [];
      }
      row.seeker_profiles = profile || null;
    }
    if (row.id) {
      const invitation = queryOne('SELECT * FROM interview_invitations WHERE application_id = ? ORDER BY created_at DESC LIMIT 1', [row.id]);
      row.interview_invitations = invitation || null;
    }
  } else if (table === 'seeker_profiles') {
    row.seeker_skills = queryAll('SELECT * FROM seeker_skills WHERE seeker_id = ?', [row.id]) || [];
    row.seeker_education = queryAll('SELECT * FROM seeker_education WHERE seeker_id = ?', [row.id]) || [];
    row.seeker_experience = queryAll('SELECT * FROM seeker_experience WHERE seeker_id = ?', [row.id]) || [];
  }

  return row;
}

async function handleDbQuery(req, res) {
  const body = await parseJsonBody(req);
  const { table, action, data, filters = [], order, limit, range, onConflict, count } = body;

  if (!table) {
    return sendJson(res, 400, { error: { message: 'Table name wajib ditentukan.' } });
  }

  try {
    if (action === 'select') {
      const { whereSql, params } = buildWhereClause(filters);
      let orderSql = '';
      if (order && order.column) {
        orderSql = `ORDER BY "${order.column}" ${order.ascending ? 'ASC' : 'DESC'}`;
      }

      let paginationSql = '';
      if (range) {
        const limitCount = range.to - range.from + 1;
        paginationSql = `LIMIT ${limitCount} OFFSET ${range.from}`;
      } else if (limit) {
        paginationSql = `LIMIT ${limit}`;
      }

      let exactCount = null;
      if (count === 'exact') {
        const countRes = queryOne(`SELECT count(*) as c FROM "${table}" ${whereSql}`, params);
        exactCount = countRes ? countRes.c : 0;
      }

      const querySql = `SELECT * FROM "${table}" ${whereSql} ${orderSql} ${paginationSql}`;
      let rows = queryAll(querySql, params);

      // Expand joins
      rows = rows.map((r) => enrichRowRelations(table, r));

      return sendJson(res, 200, {
        data: rows,
        count: exactCount !== null ? exactCount : rows.length,
        error: null,
      });
    }

    if (action === 'insert') {
      const records = Array.isArray(data) ? data : [data];
      const insertedRows = [];

      for (const item of records) {
        const row = { ...item };
        if (!row.id) row.id = crypto.randomUUID();
        const tablesWithoutCreatedAt = new Set(['applications', 'pages', 'feature_flags', 'admin_sessions']);
        if (!row.created_at && !tablesWithoutCreatedAt.has(table)) {
          row.created_at = new Date().toISOString();
        }
        if (table === 'applications' && !row.applied_at) {
          row.applied_at = new Date().toISOString();
        }
        if (!row.updated_at && (table === 'seeker_profiles' || table === 'companies' || table === 'job_listings' || table === 'applications' || table === 'pages' || table === 'feature_flags' || table === 'user_devices' || table === 'user_preferences')) {
          row.updated_at = new Date().toISOString();
        }

        // Parse object or array JSON fields for SQLite storage
        const processed = {};
        for (const [k, v] of Object.entries(row)) {
          if (v !== null && typeof v === 'object') {
            processed[k] = JSON.stringify(v);
          } else {
            processed[k] = v;
          }
        }

        const keys = Object.keys(processed);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map((k) => processed[k]);

        const sql = `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`;
        execute(sql, values);

        const inserted = queryOne(`SELECT * FROM "${table}" WHERE id = ?`, [row.id]);
        insertedRows.push(enrichRowRelations(table, inserted));
      }

      const result = Array.isArray(data) ? insertedRows : insertedRows[0];
      return sendJson(res, 200, { data: result, error: null });
    }

    if (action === 'update') {
      const { whereSql, params } = buildWhereClause(filters);
      if (!whereSql) {
        return sendJson(res, 400, { error: { message: 'Update tanpa filter tidak diizinkan.' } });
      }

      const setPairs = [];
      const setValues = [];

      for (const [k, v] of Object.entries(data)) {
        setPairs.push(`"${k}" = ?`);
        if (v !== null && typeof v === 'object') {
          setValues.push(JSON.stringify(v));
        } else {
          setValues.push(v);
        }
      }

      if (table === 'seeker_profiles' || table === 'companies' || table === 'job_listings' || table === 'applications' || table === 'pages') {
        if (!data.updated_at) {
          setPairs.push('"updated_at" = ?');
          setValues.push(new Date().toISOString());
        }
      }

      if (setPairs.length === 0) {
        const existingRows = queryAll(`SELECT * FROM "${table}" ${whereSql}`, params);
        return sendJson(res, 200, { data: existingRows.map((r) => enrichRowRelations(table, r)), error: null });
      }

      const updateSql = `UPDATE "${table}" SET ${setPairs.join(', ')} ${whereSql}`;
      execute(updateSql, [...setValues, ...params]);

      const updatedRows = queryAll(`SELECT * FROM "${table}" ${whereSql}`, params);
      return sendJson(res, 200, { data: updatedRows.map((r) => enrichRowRelations(table, r)), error: null });
    }

    if (action === 'delete') {
      const { whereSql, params } = buildWhereClause(filters);
      if (!whereSql) {
        return sendJson(res, 400, { error: { message: 'Delete tanpa filter tidak diizinkan.' } });
      }

      const toDelete = queryAll(`SELECT * FROM "${table}" ${whereSql}`, params);
      execute(`DELETE FROM "${table}" ${whereSql}`, params);

      return sendJson(res, 200, { data: toDelete, error: null });
    }

    if (action === 'upsert') {
      const record = Array.isArray(data) ? data[0] : data;
      const conflictKey = onConflict || 'id';
      const conflictValue = record[conflictKey];

      const existing = conflictValue ? queryOne(`SELECT * FROM "${table}" WHERE "${conflictKey}" = ?`, [conflictValue]) : null;

      if (existing) {
        const setPairs = [];
        const setValues = [];
        for (const [k, v] of Object.entries(record)) {
          if (k === conflictKey) continue;
          setPairs.push(`"${k}" = ?`);
          setValues.push(v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
        }
        if (setPairs.length > 0) {
          const sql = `UPDATE "${table}" SET ${setPairs.join(', ')} WHERE "${conflictKey}" = ?`;
          execute(sql, [...setValues, conflictValue]);
        }
      } else {
        const row = { ...record };
        if (!row.id) row.id = crypto.randomUUID();
        if (!row.created_at) row.created_at = new Date().toISOString();

        const keys = Object.keys(row);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map((k) => (row[k] !== null && typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k]));

        const sql = `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`;
        execute(sql, values);
      }

      const resRow = queryOne(`SELECT * FROM "${table}" WHERE "${conflictKey}" = ?`, [conflictValue || record.id]);
      return sendJson(res, 200, { data: enrichRowRelations(table, resRow), error: null });
    }

    return sendJson(res, 400, { error: { message: `Action '${action}' tidak didukung.` } });
  } catch (err) {
    return sendJson(res, 500, { error: { message: err.message || 'Database error' } });
  }
}

// ---------------------------------------------------------------------------
// Additional Handlers for Server-Side Local Compatibility
// ---------------------------------------------------------------------------

function handleAuthCapabilities(req, res) {
  sendJson(res, 200, {
    configured: true,
    googleEnabled: true,
    emailAuthEnabled: true,
    phoneAuthEnabled: false,
    emailOtpEnabled: false,
    smsOtpEnabled: false,
    mailerAutoconfirm: true,
    smsProvider: '',
    probes: {
      emailOtp: { enabled: false },
      smsOtp: { enabled: false },
    },
    fetchedAt: new Date().toISOString(),
  });
}

async function handleEnsureDefaultAdmin(req, res, env = {}) {
  const token = parseBearerToken(req);
  if (!token) return sendJson(res, 401, { message: 'Unauthorized' });

  const tokenPayload = verifyToken(token);
  const callerId = tokenPayload?.sub || tokenPayload?.userId;
  if (!callerId) return sendJson(res, 401, { message: 'Unauthorized' });
  const callerUser = queryOne('SELECT * FROM users WHERE id = ?', [callerId]);
  if (!callerUser) return sendJson(res, 401, { message: 'Unauthorized' });

  const email = (callerUser.email || '').trim().toLowerCase();
  const existingMeta = queryOne('SELECT * FROM users_meta WHERE id = ?', [callerId]);
  const defaultAdminEmail = (
    env.DEFAULT_ADMIN_EMAIL ||
    process.env.DEFAULT_ADMIN_EMAIL ||
    env.VITE_DEFAULT_ADMIN_EMAIL ||
    process.env.VITE_DEFAULT_ADMIN_EMAIL ||
    'admin@loxer.app'
  ).toLowerCase();

  if (email !== defaultAdminEmail && existingMeta?.role !== 'admin') {
    return sendJson(res, 403, { message: 'Forbidden' });
  }

  if (existingMeta) {
    execute('UPDATE users_meta SET role = ?, email = ? WHERE id = ?', ['admin', email, callerId]);
  } else {
    execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, ?)', [
      callerId,
      email,
      'admin',
      new Date().toISOString(),
      0,
    ]);
  }

  const updated = queryOne('SELECT * FROM users_meta WHERE id = ?', [callerId]);
  return sendJson(res, 200, { ok: true, meta: updated });
}

async function handleAdminUsers(req, res) {
  const token = parseBearerToken(req);
  if (!token) return sendJson(res, 401, { message: 'Unauthorized' });

  const tokenPayload = verifyToken(token);
  const callerId = tokenPayload?.sub || tokenPayload?.userId;
  if (!callerId) return sendJson(res, 401, { message: 'Unauthorized' });

  const callerMeta = queryOne('SELECT role FROM users_meta WHERE id = ?', [callerId]);
  if (!callerMeta || callerMeta.role !== 'admin') {
    return sendJson(res, 403, { message: 'Forbidden' });
  }

  const urlObj = new URL(req.url, 'http://localhost');
  const role = urlObj.searchParams.get('role') || 'all';
  const sort = urlObj.searchParams.get('sort') || 'newest';
  const page = Number(urlObj.searchParams.get('page') || '1') || 1;
  const pageSize = Number(urlObj.searchParams.get('page_size') || '20') || 20;
  const offset = (page - 1) * pageSize;

  let whereClause = '';
  const params = [];
  if (role !== 'all') {
    whereClause = 'WHERE role = ?';
    params.push(role);
  }

  let orderBy = 'ORDER BY created_at DESC';
  if (sort === 'oldest') orderBy = 'ORDER BY created_at ASC';
  if (sort === 'email') orderBy = 'ORDER BY email ASC';

  const totalRow = queryOne(`SELECT COUNT(*) as count FROM users_meta ${whereClause}`, params);
  const total = totalRow?.count || 0;

  const users = queryAll(
    `SELECT id, email, role, created_at, is_banned FROM users_meta ${whereClause} ${orderBy} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const rows = users.map((u) => {
    const seeker = queryOne('SELECT full_name FROM seeker_profiles WHERE user_id = ?', [u.id]);
    const company = queryOne('SELECT name FROM companies WHERE user_id = ?', [u.id]);
    return {
      ...u,
      is_banned: Boolean(u.is_banned),
      full_name: seeker?.full_name || undefined,
      company_name: company?.name || undefined,
    };
  });

  return sendJson(res, 200, { rows, total });
}

async function handleAdminAuditLog(req, res) {
  const token = parseBearerToken(req);
  if (!token) return sendJson(res, 401, { message: 'Unauthorized' });

  const tokenPayload = verifyToken(token);
  const callerId = tokenPayload?.sub || tokenPayload?.userId;
  if (!callerId) return sendJson(res, 401, { message: 'Unauthorized' });

  const callerMeta = queryOne('SELECT role, email FROM users_meta WHERE id = ?', [callerId]);
  if (!callerMeta || callerMeta.role !== 'admin') {
    return sendJson(res, 403, { message: 'Forbidden' });
  }

  const body = await parseJsonBody(req);
  if (!body.action || !body.targetType) {
    return sendJson(res, 400, { message: 'action dan targetType wajib diisi.' });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  execute(
    'INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      callerId,
      callerMeta.email || tokenPayload.email || '',
      body.action,
      body.targetType,
      body.targetId || '',
      body.detail || '',
      createdAt,
    ]
  );

  return sendJson(res, 200, { ok: true });
}

async function handleApplicationStatusNotification(req, res) {
  const token = parseBearerToken(req);
  if (!token) return sendJson(res, 401, { message: 'Unauthorized' });

  const tokenPayload = verifyToken(token);
  const callerId = tokenPayload?.sub || tokenPayload?.userId;
  if (!callerId) return sendJson(res, 401, { message: 'Unauthorized' });

  const callerMeta = queryOne('SELECT role FROM users_meta WHERE id = ?', [callerId]);
  if (!callerMeta || !['admin', 'employer'].includes(callerMeta.role)) {
    return sendJson(res, 403, { message: 'Forbidden' });
  }

  const body = await parseJsonBody(req);
  const applicationId = body.applicationId || '';
  const status = body.status || '';
  if (!applicationId || !status) {
    return sendJson(res, 400, { message: 'applicationId dan status wajib diisi.' });
  }

  const app = queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
  if (!app) return sendJson(res, 404, { message: 'Aplikasi tidak ditemukan.' });

  const job = queryOne('SELECT * FROM job_listings WHERE id = ?', [app.job_id]);
  const seeker = queryOne('SELECT * FROM seeker_profiles WHERE id = ?', [app.seeker_id]);
  if (!job || !seeker) return sendJson(res, 404, { message: 'Data lowongan/seeker tidak ditemukan.' });

  const notification = buildApplicationStatusNotification(status, job.title || 'lowongan ini');
  if (!notification) return sendJson(res, 200, { ok: true, skipped: true });

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const metadataStr = JSON.stringify({
    application_id: app.id,
    job_id: job.id,
    status,
  });

  execute(
    'INSERT INTO notifications (id, user_id, type, title, message, metadata, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      seeker.user_id,
      'application_update',
      notification.title,
      notification.message,
      metadataStr,
      0,
      createdAt,
    ]
  );

  return sendJson(res, 200, { ok: true });
}

// ---------------------------------------------------------------------------
// Device Intelligence & User Data Center Handlers
// ---------------------------------------------------------------------------

function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return String(list).split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) return String(realIp).trim();

  const socketIp = req.socket?.remoteAddress || '';
  if (socketIp === '::1' || socketIp === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  return socketIp;
}

function maskIp(ip) {
  if (!ip || ip === '—') return '—';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 2).join(':')}:xxxx:xxxx`;
  }
  return ip;
}

async function handleDeviceRegister(req, res) {
  const body = await parseJsonBody(req);
  const deviceId = String(body.deviceId || '').trim().slice(0, 128);
  if (!deviceId) {
    return sendJson(res, 400, { error: { message: 'deviceId wajib diisi' } });
  }

  const token = parseBearerToken(req);
  const decoded = verifyToken(token);
  let userId = decoded?.sub || null;
  if (!userId && body.userId && typeof body.userId === 'string') {
    const u = queryOne('SELECT id FROM users WHERE id = ?', [body.userId]);
    if (u) userId = u.id;
  }

  const ip = getClientIp(req);
  const now = new Date().toISOString();

  const deviceType = String(body.deviceType || 'unknown').slice(0, 32);
  const uiProfile = String(body.uiProfile || 'desktop-standard').slice(0, 32);
  const deviceBrand = body.deviceBrand ? String(body.deviceBrand).slice(0, 64) : null;
  const deviceModel = body.deviceModel ? String(body.deviceModel).slice(0, 64) : null;
  const osName = body.osName ? String(body.osName).slice(0, 64) : null;
  const osVersion = body.osVersion ? String(body.osVersion).slice(0, 32) : null;
  const browserName = body.browserName ? String(body.browserName).slice(0, 64) : null;
  const browserVersion = body.browserVersion ? String(body.browserVersion).slice(0, 32) : null;
  const platform = body.platform ? String(body.platform).slice(0, 64) : null;
  const architecture = body.architecture ? String(body.architecture).slice(0, 32) : null;

  const screenWidth = Number(body.screen?.width) || null;
  const screenHeight = Number(body.screen?.height) || null;
  const viewportWidth = Number(body.viewport?.width) || null;
  const viewportHeight = Number(body.viewport?.height) || null;
  const pixelRatio = Number(body.screen?.pixelRatio) || 1;
  const orientation = body.orientation === 'portrait' ? 'portrait' : 'landscape';

  const touch = body.input?.touch ? 1 : 0;
  const maxTouchPoints = Number(body.input?.maxTouchPoints) || 0;
  const pointerType = body.input?.pointer ? String(body.input.pointer).slice(0, 16) : null;
  const hoverSupported = body.input?.hover ? 1 : 0;
  const pwa = body.pwa ? 1 : 0;
  const language = body.language ? String(body.language).slice(0, 32) : null;
  const timezone = body.timezone ? String(body.timezone).slice(0, 64) : null;

  const existing = queryOne('SELECT * FROM user_devices WHERE device_id = ?', [deviceId]);

  if (existing) {
    const nextUserId = userId || existing.user_id;
    execute(
      `UPDATE user_devices SET
        user_id = ?, device_type = ?, ui_profile = ?, device_brand = ?, device_model = ?,
        os_name = ?, os_version = ?, browser_name = ?, browser_version = ?, platform = ?,
        architecture = ?, screen_width = ?, screen_height = ?, viewport_width = ?, viewport_height = ?,
        pixel_ratio = ?, orientation = ?, touch = ?, max_touch_points = ?, pointer_type = ?,
        hover_supported = ?, pwa = ?, language = ?, timezone = ?, last_ip = ?, last_seen_at = ?,
        is_revoked = 0, updated_at = ?
      WHERE device_id = ?`,
      [
        nextUserId, deviceType, uiProfile, deviceBrand, deviceModel,
        osName, osVersion, browserName, browserVersion, platform,
        architecture, screenWidth, screenHeight, viewportWidth, viewportHeight,
        pixelRatio, orientation, touch, maxTouchPoints, pointerType,
        hoverSupported, pwa, language, timezone, ip, now,
        now, deviceId,
      ]
    );

    if (userId && existing.user_id !== userId) {
      execute(
        `INSERT INTO user_activity_logs (id, user_id, device_id, event_type, ip_address, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          userId,
          deviceId,
          'new_device_login',
          ip,
          JSON.stringify({ browser: browserName, os: osName, uiProfile }),
          now,
        ]
      );
    }
  } else {
    execute(
      `INSERT INTO user_devices (
        id, user_id, device_id, device_type, ui_profile, device_brand, device_model,
        os_name, os_version, browser_name, browser_version, platform, architecture,
        screen_width, screen_height, viewport_width, viewport_height, pixel_ratio,
        orientation, touch, max_touch_points, pointer_type, hover_supported, pwa,
        language, timezone, first_ip, last_ip, first_seen_at, last_seen_at, is_revoked,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, 0,
        ?, ?
      )`,
      [
        crypto.randomUUID(), userId, deviceId, deviceType, uiProfile, deviceBrand, deviceModel,
        osName, osVersion, browserName, browserVersion, platform, architecture,
        screenWidth, screenHeight, viewportWidth, viewportHeight, pixelRatio,
        orientation, touch, maxTouchPoints, pointerType, hoverSupported, pwa,
        language, timezone, ip, ip, now, now,
        now, now,
      ]
    );

    if (userId) {
      execute(
        `INSERT INTO user_activity_logs (id, user_id, device_id, event_type, ip_address, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          userId,
          deviceId,
          'device_registered',
          ip,
          JSON.stringify({ browser: browserName, os: osName, uiProfile }),
          now,
        ]
      );
    }
  }

  return sendJson(res, 200, { ok: true, deviceId });
}

async function handleUserDevices(req, res) {
  const token = parseBearerToken(req);
  const decoded = verifyToken(token);
  if (!decoded?.sub) {
    return sendJson(res, 401, { error: { message: 'Unauthorized' } });
  }

  const devices = queryAll(
    'SELECT * FROM user_devices WHERE user_id = ? AND is_revoked = 0 ORDER BY last_seen_at DESC',
    [decoded.sub]
  );

  return sendJson(res, 200, { devices });
}

async function handleUserDeviceRevoke(req, res) {
  const token = parseBearerToken(req);
  const decoded = verifyToken(token);
  if (!decoded?.sub) {
    return sendJson(res, 401, { error: { message: 'Unauthorized' } });
  }

  const body = await parseJsonBody(req);
  const deviceId = body.deviceId || body.id;
  if (!deviceId) {
    return sendJson(res, 400, { error: { message: 'deviceId wajib diisi' } });
  }

  execute(
    'UPDATE user_devices SET is_revoked = 1, updated_at = ? WHERE (device_id = ? OR id = ?) AND user_id = ?',
    [new Date().toISOString(), deviceId, deviceId, decoded.sub]
  );

  execute(
    'INSERT INTO user_activity_logs (id, user_id, device_id, event_type, created_at) VALUES (?, ?, ?, ?, ?)',
    [crypto.randomUUID(), decoded.sub, deviceId, 'device_revoked', new Date().toISOString()]
  );

  return sendJson(res, 200, { ok: true });
}

async function handleUserPreferences(req, res) {
  const token = parseBearerToken(req);
  const decoded = verifyToken(token);
  if (!decoded?.sub) {
    return sendJson(res, 401, { error: { message: 'Unauthorized' } });
  }

  if (req.method === 'GET') {
    const pref = queryOne('SELECT * FROM user_preferences WHERE user_id = ?', [decoded.sub]);
    return sendJson(res, 200, { preferences: pref || null });
  }

  if (req.method === 'POST') {
    const body = await parseJsonBody(req);
    const existing = queryOne('SELECT id FROM user_preferences WHERE user_id = ?', [decoded.sub]);
    const now = new Date().toISOString();

    if (existing) {
      execute(
        `UPDATE user_preferences SET
          theme = COALESCE(?, theme),
          language = COALESCE(?, language),
          font_scale = COALESCE(?, font_scale),
          sidebar_state = COALESCE(?, sidebar_state),
          navigation_mode = COALESCE(?, navigation_mode),
          density = COALESCE(?, density),
          preferred_ui_profile = COALESCE(?, preferred_ui_profile),
          updated_at = ?
         WHERE user_id = ?`,
        [
          body.theme ?? null,
          body.language ?? null,
          body.fontScale ?? null,
          body.sidebarState ?? null,
          body.navigationMode ?? null,
          body.density ?? null,
          body.preferredUIProfile ?? null,
          now,
          decoded.sub,
        ]
      );
    } else {
      execute(
        `INSERT INTO user_preferences (
          id, user_id, theme, language, font_scale, sidebar_state, navigation_mode, density, preferred_ui_profile, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          decoded.sub,
          body.theme || 'system',
          body.language || 'id',
          body.fontScale || 1.0,
          body.sidebarState || 'expanded',
          body.navigationMode || 'standard',
          body.density || 'normal',
          body.preferredUIProfile || null,
          now,
          now,
        ]
      );
    }

    const updated = queryOne('SELECT * FROM user_preferences WHERE user_id = ?', [decoded.sub]);
    return sendJson(res, 200, { ok: true, preferences: updated });
  }

  return sendJson(res, 405, { error: { message: 'Method tidak didukung' } });
}

async function handleAdminUserData(req, res) {
  const token = parseBearerToken(req);
  if (!token) return sendJson(res, 401, { message: 'Unauthorized' });

  const tokenPayload = verifyToken(token);
  const callerId = tokenPayload?.sub || tokenPayload?.userId;
  if (!callerId) return sendJson(res, 401, { message: 'Unauthorized' });

  const callerMeta = queryOne('SELECT role FROM users_meta WHERE id = ?', [callerId]);
  if (!callerMeta || callerMeta.role !== 'admin') {
    return sendJson(res, 403, { message: 'Forbidden' });
  }

  const urlObj = new URL(req.url, 'http://localhost');
  const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();
  const role = urlObj.searchParams.get('role') || 'all';
  const status = urlObj.searchParams.get('status') || 'all';
  const device = urlObj.searchParams.get('device') || 'all';
  const os = urlObj.searchParams.get('os') || 'all';
  const browser = urlObj.searchParams.get('browser') || 'all';
  const pwa = urlObj.searchParams.get('pwa') || 'all';
  const activity = urlObj.searchParams.get('activity') || 'all';
  const sort = urlObj.searchParams.get('sort') || 'last_active';
  const sortOrder = (urlObj.searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const page = Number(urlObj.searchParams.get('page') || '1') || 1;
  const pageSize = Number(urlObj.searchParams.get('page_size') || '20') || 20;
  const offset = (page - 1) * pageSize;

  // Build query
  const conditions = [];
  const params = [];

  if (role !== 'all') {
    conditions.push('um.role = ?');
    params.push(role);
  }

  if (status === 'active') {
    conditions.push('um.is_banned = 0');
  } else if (status === 'banned') {
    conditions.push('um.is_banned = 1');
  }

  if (device !== 'all') {
    conditions.push('ud.device_type = ?');
    params.push(device);
  }

  if (os !== 'all') {
    if (os === 'Other') {
      conditions.push("ud.os_name NOT IN ('Android', 'iOS', 'Windows', 'macOS', 'Linux')");
    } else {
      conditions.push('ud.os_name = ?');
      params.push(os);
    }
  }

  if (browser !== 'all') {
    if (browser === 'Other') {
      conditions.push("ud.browser_name NOT IN ('Chrome', 'Safari', 'Edge', 'Firefox', 'Samsung Internet')");
    } else {
      conditions.push('ud.browser_name = ?');
      params.push(browser);
    }
  }

  if (pwa === 'pwa') {
    conditions.push('ud.pwa = 1');
  } else if (pwa === 'browser') {
    conditions.push('(ud.pwa = 0 OR ud.pwa IS NULL)');
  }

  if (activity === 'online') {
    conditions.push("ud.last_seen_at >= datetime('now', '-5 minutes')");
  } else if (activity === 'today') {
    conditions.push("ud.last_seen_at >= datetime('now', 'start of day')");
  } else if (activity === '7days') {
    conditions.push("ud.last_seen_at >= datetime('now', '-7 days')");
  } else if (activity === '30days') {
    conditions.push("ud.last_seen_at >= datetime('now', '-30 days')");
  } else if (activity === 'inactive') {
    conditions.push("(ud.last_seen_at < datetime('now', '-30 days') OR ud.last_seen_at IS NULL)");
  }

  if (search) {
    conditions.push(`(
      LOWER(um.email) LIKE ? OR
      LOWER(COALESCE(sp.full_name, '')) LIKE ? OR
      LOWER(COALESCE(c.name, '')) LIKE ? OR
      LOWER(um.id) LIKE ? OR
      LOWER(COALESCE(ud.device_id, '')) LIKE ? OR
      LOWER(COALESCE(ud.device_model, '')) LIKE ? OR
      LOWER(COALESCE(ud.browser_name, '')) LIKE ? OR
      LOWER(COALESCE(ud.os_name, '')) LIKE ?
    )`);
    const s = `%${search}%`;
    params.push(s, s, s, s, s, s, s, s);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderSql = 'ORDER BY COALESCE(ud.last_seen_at, um.created_at) DESC';
  if (sort === 'created_at') orderSql = `ORDER BY um.created_at ${sortOrder}`;
  if (sort === 'email') orderSql = `ORDER BY um.email ${sortOrder}`;
  if (sort === 'name') orderSql = `ORDER BY COALESCE(sp.full_name, c.name, um.email) ${sortOrder}`;
  if (sort === 'last_active') orderSql = `ORDER BY COALESCE(ud.last_seen_at, um.created_at) ${sortOrder}`;

  const baseFromSql = `
    FROM users_meta um
    LEFT JOIN seeker_profiles sp ON sp.user_id = um.id
    LEFT JOIN companies c ON c.user_id = um.id
    LEFT JOIN (
      SELECT * FROM user_devices WHERE id IN (
        SELECT id FROM (
          SELECT id, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_seen_at DESC) as rn
          FROM user_devices
          WHERE user_id IS NOT NULL
        ) WHERE rn = 1
      )
    ) ud ON ud.user_id = um.id
  `;

  const countRow = queryOne(`SELECT COUNT(*) as total ${baseFromSql} ${whereSql}`, params);
  const total = countRow?.total || 0;

  const rows = queryAll(
    `SELECT
      um.id, um.email, um.role, um.created_at, um.is_banned,
      sp.full_name,
      c.name as company_name,
      ud.device_id, ud.device_type, ud.ui_profile, ud.device_brand, ud.device_model,
      ud.os_name, ud.os_version, ud.browser_name, ud.browser_version,
      ud.screen_width, ud.screen_height, ud.viewport_width, ud.viewport_height,
      ud.pixel_ratio, ud.touch, ud.pwa, ud.timezone, ud.language,
      ud.last_ip, ud.first_ip, ud.first_seen_at, ud.last_seen_at
    ${baseFromSql} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  // Compute summary stats
  const totalUsersRow = queryOne('SELECT COUNT(*) as c FROM users_meta');
  const activeUsersRow = queryOne('SELECT COUNT(*) as c FROM users_meta WHERE is_banned = 0');
  const onlineUsersRow = queryOne(
    "SELECT COUNT(DISTINCT user_id) as c FROM user_devices WHERE last_seen_at >= datetime('now', '-5 minutes') AND user_id IS NOT NULL"
  );
  const mobileUsersRow = queryOne(
    "SELECT COUNT(DISTINCT user_id) as c FROM user_devices WHERE device_type = 'mobile' AND user_id IS NOT NULL"
  );
  const tabletUsersRow = queryOne(
    "SELECT COUNT(DISTINCT user_id) as c FROM user_devices WHERE device_type = 'tablet' AND user_id IS NOT NULL"
  );
  const desktopUsersRow = queryOne(
    "SELECT COUNT(DISTINCT user_id) as c FROM user_devices WHERE device_type IN ('desktop', 'desktop-touch') AND user_id IS NOT NULL"
  );
  const pwaUsersRow = queryOne(
    'SELECT COUNT(DISTINCT user_id) as c FROM user_devices WHERE pwa = 1 AND user_id IS NOT NULL'
  );

  const stats = {
    totalUsers: totalUsersRow?.c || 0,
    activeUsers: activeUsersRow?.c || 0,
    onlineUsers: onlineUsersRow?.c || 0,
    mobileUsers: mobileUsersRow?.c || 0,
    tabletUsers: tabletUsersRow?.c || 0,
    desktopUsers: desktopUsersRow?.c || 0,
    pwaUsers: pwaUsersRow?.c || 0,
  };

  const processedRows = rows.map((r, index) => {
    const isOnline = r.last_seen_at ? new Date(r.last_seen_at).getTime() >= Date.now() - 5 * 60 * 1000 : false;
    return {
      index: offset + index + 1,
      id: r.id,
      email: r.email,
      name: r.full_name || r.company_name || r.email.split('@')[0],
      role: r.role,
      isBanned: Boolean(r.is_banned),
      isOnline,
      deviceId: r.device_id || null,
      deviceType: r.device_type || null,
      uiProfile: r.ui_profile || null,
      deviceModel: r.device_model || (r.device_brand ? `${r.device_brand}` : null),
      os: r.os_name ? `${r.os_name}${r.os_version ? ' ' + r.os_version : ''}` : null,
      browser: r.browser_name ? `${r.browser_name}${r.browser_version ? ' ' + r.browser_version : ''}` : null,
      lastIp: r.last_ip || null,
      maskedIp: maskIp(r.last_ip),
      resolution: r.viewport_width && r.viewport_height ? `${r.viewport_width} × ${r.viewport_height}` : null,
      pwa: Boolean(r.pwa),
      timezone: r.timezone || null,
      lastActive: r.last_seen_at || null,
      createdAt: r.created_at,
    };
  });

  return sendJson(res, 200, { rows: processedRows, total, stats });
}

async function handleAdminDevices(req, res) {
  const token = parseBearerToken(req);
  if (!token) return sendJson(res, 401, { message: 'Unauthorized' });

  const tokenPayload = verifyToken(token);
  const callerId = tokenPayload?.sub || tokenPayload?.userId;
  if (!callerId) return sendJson(res, 401, { message: 'Unauthorized' });

  const callerMeta = queryOne('SELECT role FROM users_meta WHERE id = ?', [callerId]);
  if (!callerMeta || callerMeta.role !== 'admin') {
    return sendJson(res, 403, { message: 'Forbidden' });
  }

  const urlObj = new URL(req.url, 'http://localhost');
  const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();
  const deviceType = urlObj.searchParams.get('device_type') || 'all';
  const page = Number(urlObj.searchParams.get('page') || '1') || 1;
  const pageSize = Number(urlObj.searchParams.get('page_size') || '20') || 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const params = [];

  if (deviceType !== 'all') {
    conditions.push('ud.device_type = ?');
    params.push(deviceType);
  }

  if (search) {
    conditions.push(`(
      LOWER(ud.device_id) LIKE ? OR
      LOWER(COALESCE(ud.device_model, '')) LIKE ? OR
      LOWER(COALESCE(ud.browser_name, '')) LIKE ? OR
      LOWER(COALESCE(ud.os_name, '')) LIKE ? OR
      LOWER(COALESCE(um.email, '')) LIKE ?
    )`);
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const fromSql = `
    FROM user_devices ud
    LEFT JOIN users_meta um ON um.id = ud.user_id
    LEFT JOIN seeker_profiles sp ON sp.user_id = ud.user_id
    LEFT JOIN companies c ON c.user_id = ud.user_id
  `;

  const countRow = queryOne(`SELECT COUNT(*) as total ${fromSql} ${whereSql}`, params);
  const total = countRow?.total || 0;

  const rows = queryAll(
    `SELECT
      ud.*,
      um.email as user_email,
      sp.full_name,
      c.name as company_name
     ${fromSql} ${whereSql} ORDER BY ud.last_seen_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const processed = rows.map((r) => ({
    id: r.id,
    deviceId: r.device_id,
    userId: r.user_id,
    userEmail: r.user_email || 'Anonymous',
    userName: r.full_name || r.company_name || r.user_email?.split('@')[0] || 'Tamu',
    deviceType: r.device_type,
    uiProfile: r.ui_profile,
    deviceModel: r.device_model || r.device_brand || '—',
    os: r.os_name ? `${r.os_name}${r.os_version ? ' ' + r.os_version : ''}` : '—',
    browser: r.browser_name ? `${r.browser_name}${r.browser_version ? ' ' + r.browser_version : ''}` : '—',
    resolution: r.viewport_width && r.viewport_height ? `${r.viewport_width} × ${r.viewport_height}` : '—',
    ip: r.last_ip || '—',
    pwa: Boolean(r.pwa),
    isRevoked: Boolean(r.is_revoked),
    isOnline: r.last_seen_at ? new Date(r.last_seen_at).getTime() >= Date.now() - 5 * 60 * 1000 : false,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
  }));

  return sendJson(res, 200, { rows: processed, total });
}

async function handleAdminUserDetail(req, res) {
  const token = parseBearerToken(req);
  if (!token) return sendJson(res, 401, { message: 'Unauthorized' });

  const tokenPayload = verifyToken(token);
  const callerId = tokenPayload?.sub || tokenPayload?.userId;
  if (!callerId) return sendJson(res, 401, { message: 'Unauthorized' });

  const callerMeta = queryOne('SELECT role FROM users_meta WHERE id = ?', [callerId]);
  if (!callerMeta || callerMeta.role !== 'admin') {
    return sendJson(res, 403, { message: 'Forbidden' });
  }

  const urlObj = new URL(req.url, 'http://localhost');
  const userId = urlObj.searchParams.get('id') || '';
  if (!userId) {
    return sendJson(res, 400, { message: 'User ID wajib diisi' });
  }

  const userMeta = queryOne('SELECT * FROM users_meta WHERE id = ?', [userId]);
  if (!userMeta) {
    return sendJson(res, 404, { message: 'User tidak ditemukan' });
  }

  const seeker = queryOne('SELECT * FROM seeker_profiles WHERE user_id = ?', [userId]);
  const company = queryOne('SELECT * FROM companies WHERE user_id = ?', [userId]);
  const devices = queryAll('SELECT * FROM user_devices WHERE user_id = ? ORDER BY last_seen_at DESC', [userId]);
  const activities = queryAll(
    'SELECT * FROM user_activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  const preferences = queryOne('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);

  return sendJson(res, 200, {
    user: {
      id: userMeta.id,
      email: userMeta.email,
      role: userMeta.role,
      isBanned: Boolean(userMeta.is_banned),
      createdAt: userMeta.created_at,
      name: seeker?.full_name || company?.name || userMeta.email.split('@')[0],
      phone: seeker?.phone || '',
      city: seeker?.domicile_city || company?.city || '',
    },
    currentDevice: devices.length > 0 ? devices[0] : null,
    devices,
    activities,
    preferences,
  });
}

async function handleAdminDeviceRevoke(req, res) {
  const token = parseBearerToken(req);
  if (!token) return sendJson(res, 401, { message: 'Unauthorized' });

  const tokenPayload = verifyToken(token);
  const callerId = tokenPayload?.sub || tokenPayload?.userId;
  if (!callerId) return sendJson(res, 401, { message: 'Unauthorized' });

  const callerMeta = queryOne('SELECT role, email FROM users_meta WHERE id = ?', [callerId]);
  if (!callerMeta || callerMeta.role !== 'admin') {
    return sendJson(res, 403, { message: 'Forbidden' });
  }

  const body = await parseJsonBody(req);
  const deviceId = body.deviceId || body.id;
  if (!deviceId) {
    return sendJson(res, 400, { message: 'deviceId wajib diisi' });
  }

  execute(
    'UPDATE user_devices SET is_revoked = 1, updated_at = ? WHERE device_id = ? OR id = ?',
    [new Date().toISOString(), deviceId, deviceId]
  );

  execute(
    'INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      crypto.randomUUID(),
      callerId,
      callerMeta.email || '',
      'revoke_device',
      'device',
      deviceId,
      'Revoked device via Admin Device Center',
      new Date().toISOString(),
    ]
  );

  return sendJson(res, 200, { ok: true });
}

async function handleGenerateAnalyticsSnapshot(req, res) {
  try {
    const snapshot = recordDailyAnalyticsSnapshot();
    return sendJson(res, 200, { success: true, snapshot });
  } catch (err) {
    return sendJson(res, 500, { success: false, message: err.message });
  }
}

async function handleAuditLogsStats(req, res) {
  try {
    const countRow = queryOne('SELECT count(*) as c FROM audit_logs');
    const oldestRow = queryOne('SELECT created_at FROM audit_logs ORDER BY created_at ASC LIMIT 1');
    const newestRow = queryOne('SELECT created_at FROM audit_logs ORDER BY created_at DESC LIMIT 1');
    return sendJson(res, 200, {
      total: countRow?.c || 0,
      oldestDate: oldestRow?.created_at || null,
      newestDate: newestRow?.created_at || null,
    });
  } catch (err) {
    return sendJson(res, 500, { message: err.message });
  }
}

async function handleAuditLogsArchive(req, res) {
  const caller = verifyAdminCaller(req);
  if (!caller.allowed) {
    return sendJson(res, 403, { message: 'Akses khusus administrator' });
  }

  try {
    const body = await parseJsonBody(req);
    const retentionDays = Number(body.retentionDays || 30);
    const purgeOnly = Boolean(body.purgeOnly);

    // Fetch rows older than retention days
    const oldRows = queryAll(
      "SELECT * FROM audit_logs WHERE DATE(created_at) < DATE('now', '-' || ? || ' days')",
      [retentionDays]
    );

    // Delete old rows
    execute(
      "DELETE FROM audit_logs WHERE DATE(created_at) < DATE('now', '-' || ? || ' days')",
      [retentionDays]
    );

    // Run vacuum to optimize disk space
    try {
      execute('VACUUM');
    } catch {
      // ignore
    }

    // Log this retention purge
    execute(
      'INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        crypto.randomUUID(),
        caller.callerId || null,
        caller.callerMeta?.email || '',
        'archive_audit_logs',
        'system',
        'audit_logs',
        `Archived and purged ${oldRows.length} audit logs older than ${retentionDays} days`,
        new Date().toISOString(),
      ]
    );

    return sendJson(res, 200, {
      success: true,
      archivedCount: oldRows.length,
      rows: purgeOnly ? [] : oldRows,
    });
  } catch (err) {
    return sendJson(res, 500, { message: err.message });
  }
}

// ---------------------------------------------------------------------------
// Main Router Middleware for Node.js http server / Vite
// ---------------------------------------------------------------------------

export function createLocalDbMiddleware(env = {}) {
  getLocalDb(); // ensure initialized

  const isLocalMode = env.VITE_USE_LOCAL_DB === 'true' || !env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY;

  return async (req, res, next) => {
    const url = req.url || '';

    // Core Local API endpoints
    if (url.startsWith('/api/local/auth/signup') && req.method === 'POST') {
      return handleSignUp(req, res);
    }
    if (url.startsWith('/api/local/auth/login') && req.method === 'POST') {
      return handleSignIn(req, res);
    }
    if (url.startsWith('/api/local/auth/google') && req.method === 'POST') {
      return handleGoogleAuth(req, res);
    }
    if (url.startsWith('/api/local/auth/user') && req.method === 'GET') {
      return handleGetUser(req, res);
    }
    if (url.startsWith('/api/local/auth/logout') && req.method === 'POST') {
      return sendJson(res, 200, { error: null });
    }
    if (url.startsWith('/api/local/db/query') && req.method === 'POST') {
      return handleDbQuery(req, res);
    }

    // Device Intelligence & User endpoints (available in local dev)
    if (url.startsWith('/api/device/register') && req.method === 'POST') {
      return handleDeviceRegister(req, res);
    }
    if (url.startsWith('/api/user/devices/revoke') && req.method === 'POST') {
      return handleUserDeviceRevoke(req, res);
    }
    if (url.startsWith('/api/user/devices') && req.method === 'GET') {
      return handleUserDevices(req, res);
    }
    if (url.startsWith('/api/user/preferences')) {
      return handleUserPreferences(req, res);
    }

    // When running in local mode, route admin and notification endpoints directly to local SQLite
    if (isLocalMode) {
      if (url.startsWith('/api/auth-capabilities') && req.method === 'GET') {
        return handleAuthCapabilities(req, res);
      }
      if (url.startsWith('/api/admin/ensure-default-admin') && req.method === 'POST') {
        return handleEnsureDefaultAdmin(req, res, env);
      }
      if (url.startsWith('/api/admin/users/detail') && req.method === 'GET') {
        return handleAdminUserDetail(req, res);
      }
      if (url.startsWith('/api/admin/users') && req.method === 'GET') {
        return handleAdminUsers(req, res);
      }
      if (url.startsWith('/api/admin/user-data') && req.method === 'GET') {
        return handleAdminUserData(req, res);
      }
      if (url.startsWith('/api/admin/devices/revoke') && req.method === 'POST') {
        return handleAdminDeviceRevoke(req, res);
      }
      if (url.startsWith('/api/admin/devices') && req.method === 'GET') {
        return handleAdminDevices(req, res);
      }
      if (url.startsWith('/api/admin-audit-log') && req.method === 'POST') {
        return handleAdminAuditLog(req, res);
      }
      if (url.startsWith('/api/application-status-notification') && req.method === 'POST') {
        return handleApplicationStatusNotification(req, res);
      }
      if (url.startsWith('/api/admin/analytics-snapshot/generate') && req.method === 'POST') {
        return handleGenerateAnalyticsSnapshot(req, res);
      }
      if (url.startsWith('/api/admin/audit-logs/stats') && req.method === 'GET') {
        return handleAuditLogsStats(req, res);
      }
      if (url.startsWith('/api/admin/audit-logs/archive') && req.method === 'POST') {
        return handleAuditLogsArchive(req, res);
      }
    }

    next();
  };
}

