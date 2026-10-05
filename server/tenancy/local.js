import { createTenantHandler } from './handler.js';
import { createSqliteTenantRepository } from './sqlite.js';
import { requireThat } from './core.js';

// Dependency injection keeps tests entirely in memory and away from data/loxer.db.
export function createLocalTenantHandler(env, { getDb, verifyToken, hashPassword, verifyPassword }) {
  let repository;
  const repo = () => {
    requireThat(typeof env.JWT_SECRET === 'string' && env.JWT_SECRET.length >= 32 && env.JWT_SECRET !== 'loxer-local-jwt-secret-key-2026', 503, 'SECRET_REQUIRED', 'Konfigurasi keamanan sesi lokal belum siap.');
    return repository ||= createSqliteTenantRepository(getDb());
  };
  const auth = {
    identity: (token, tenantId) => {
      const scoped = token.startsWith('tns_') ? repo().session(token, tenantId) : null;
      const global = token.startsWith('tns_') ? null : verifyToken(token);
      const id = scoped?.user_id || global?.sub;
      return id ? repo().identity(id) : null;
    },
    register: (tenantId, input, requestId) => repo().register(tenantId, input, hashPassword(input.password), requestId),
    login: (tenantId, email, password) => {
      const user = repo().authUser(email);
      // Perform a password hash on unsuccessful lookup too to reduce timing differences.
      const passwordOk = user ? verifyPassword(password, user.password_hash) : (hashPassword(password), false);
      const identity = user ? repo().identity(user.id) : null;
      const member = user ? repo().membership(tenantId, user.id) : null;
      requireThat(passwordOk && identity && !identity.is_banned && member?.status === 'active', 401, 'LOGIN_FAILED', 'Email, password, atau akses Child tidak valid.');
      return { access_token: repo().issueSession(user.id, tenantId), user_id: user.id };
    },
    logout: token => repo().revokeSession(token),
  };
  return createTenantHandler({ env, repository: repo, auth: {
    ...auth,
    register: (...args) => { auth.register(...args); return 'Pendaftaran berhasil. Silakan masuk melalui Child ini.'; },
  } });
}
