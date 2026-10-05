import crypto from 'node:crypto';
import { MASTER_ID, requireThat } from './core.js';

// Only new tables: existing job, auth and marketplace rows are never rewritten.
export const TENANT_SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('master','child')),
 slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
 status TEXT NOT NULL CHECK(status IN ('pending','active','suspended','terminated')),
 display_name TEXT NOT NULL, hero_title TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
 logo_url TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL DEFAULT '',
 config_version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_one_master ON tenants(kind) WHERE kind='master';
CREATE TABLE IF NOT EXISTS partners (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id),
 owner_user_id TEXT NOT NULL REFERENCES users_meta(id), business_name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tenant_memberships (
 tenant_id TEXT NOT NULL REFERENCES tenants(id), user_id TEXT NOT NULL REFERENCES users_meta(id),
 role TEXT NOT NULL CHECK(role IN ('partner_owner','partner_admin','partner_staff','seeker','employer','freelancer','customer')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
 display_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
 joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(tenant_id,user_id)
);
CREATE INDEX IF NOT EXISTS tenant_memberships_user ON tenant_memberships(user_id,status);
CREATE INDEX IF NOT EXISTS tenant_memberships_page ON tenant_memberships(tenant_id,joined_at,user_id);
CREATE TABLE IF NOT EXISTS tenant_audit_events (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), actor_id TEXT NOT NULL,
 action TEXT NOT NULL, resource_id TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', request_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS tenant_audit_page ON tenant_audit_events(tenant_id,created_at);
CREATE TABLE IF NOT EXISTS tenant_sessions (
 token_hash TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
 user_id TEXT NOT NULL REFERENCES users_meta(id), expires_at INTEGER NOT NULL,
 FOREIGN KEY(tenant_id,user_id) REFERENCES tenant_memberships(tenant_id,user_id)
);
CREATE TRIGGER IF NOT EXISTS tenant_audit_no_update BEFORE UPDATE ON tenant_audit_events BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
CREATE TRIGGER IF NOT EXISTS tenant_audit_no_delete BEFORE DELETE ON tenant_audit_events BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
`;

export function createSqliteTenantRepository(db) {
  db.exec(TENANT_SCHEMA);
  db.prepare("INSERT OR IGNORE INTO tenants(id,kind,slug,status,display_name) VALUES (?,'master','master','active','LOXER')").run(MASTER_ID);
  const one = (sql, ...args) => db.prepare(sql).get(...args) || null;
  const atomic = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const audit = (tenantId, actorId, action, resourceId, requestId, reason = '') => {
    db.prepare('INSERT INTO tenant_audit_events(id,tenant_id,actor_id,action,resource_id,request_id,reason) VALUES (?,?,?,?,?,?,?)')
      .run(crypto.randomUUID(), tenantId, actorId, action, resourceId, requestId, reason);
  };
  const repo = {
    tenant: slug => one('SELECT * FROM tenants WHERE slug=?', slug || 'master'),
    identity: id => one('SELECT id,email,role,is_banned FROM users_meta WHERE id=?', id),
    authUser: email => one('SELECT id,password_hash FROM users WHERE email=?', email),
    session: (token, tenantId) => {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      return one('SELECT user_id FROM tenant_sessions WHERE token_hash=? AND tenant_id=? AND expires_at>?', hash, tenantId, Date.now());
    },
    issueSession: (userId, tenantId) => {
      const token = 'tns_' + crypto.randomBytes(32).toString('base64url');
      db.prepare('DELETE FROM tenant_sessions WHERE expires_at<=?').run(Date.now());
      db.prepare('INSERT INTO tenant_sessions(token_hash,tenant_id,user_id,expires_at) VALUES (?,?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'), tenantId, userId, Date.now() + 8 * 60 * 60 * 1000);
      return token;
    },
    revokeSession: token => db.prepare('DELETE FROM tenant_sessions WHERE token_hash=?').run(crypto.createHash('sha256').update(token).digest('hex')),
    membership: (tenantId, userId) => one('SELECT * FROM tenant_memberships WHERE tenant_id=? AND user_id=?', tenantId, userId),
    list: (limit, offset) => db.prepare("SELECT t.*,p.owner_user_id,p.business_name FROM tenants t JOIN partners p ON p.tenant_id=t.id WHERE t.kind='child' ORDER BY t.created_at DESC,t.id LIMIT ? OFFSET ?").all(limit, offset),
    members: (tenantId, limit, offset) => db.prepare('SELECT user_id,display_name,email,role,status,joined_at FROM tenant_memberships WHERE tenant_id=? ORDER BY joined_at DESC,user_id LIMIT ? OFFSET ?').all(tenantId, limit, offset),
    count: tenantId => one('SELECT COUNT(*) AS total FROM tenant_memberships WHERE tenant_id=?', tenantId).total,
    audit,
    create: ({ slug, business_name, owner_user_id }, actorId, requestId) => atomic(() => {
      const owner = repo.identity(owner_user_id);
      requireThat(owner && !owner.is_banned, 400, 'INVALID_OWNER', 'Pemilik harus merupakan akun aktif.');
      requireThat(!repo.tenant(slug), 409, 'SLUG_TAKEN', 'Slug sudah dipakai.');
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO tenants(id,kind,slug,status,display_name,hero_title) VALUES (?,'child',?,'pending',?,?)").run(id, slug, business_name, 'Bangun masa depan bersama ' + business_name);
      db.prepare('INSERT INTO partners(id,tenant_id,owner_user_id,business_name) VALUES (?,?,?,?)').run(crypto.randomUUID(), id, owner_user_id, business_name);
      db.prepare("INSERT INTO tenant_memberships(tenant_id,user_id,role,display_name,email) VALUES (?,?,'partner_owner',?,?)").run(id, owner_user_id, business_name, owner.email);
      audit(id, actorId, 'partner.created', id, requestId);
      return repo.tenant(slug);
    }),
    status: (tenantId, status, actorId, requestId, reason) => atomic(() => {
      const current = one("SELECT * FROM tenants WHERE id=? AND kind='child'", tenantId);
      requireThat(current, 404, 'TENANT_NOT_FOUND', 'Child tidak ditemukan.');
      requireThat(current.status !== 'terminated', 409, 'TENANT_TERMINATED', 'Child telah diakhiri.');
      db.prepare('UPDATE tenants SET status=?,config_version=config_version+1 WHERE id=?').run(status, tenantId);
      audit(tenantId, actorId, 'partner.' + status, tenantId, requestId, reason);
      return repo.tenant(current.slug);
    }),
    branding: (tenantId, fields, actorId, requestId) => atomic(() => {
      // Keys come only from brandingInput, never from arbitrary client SQL identifiers.
      const keys = Object.keys(fields);
      requireThat(keys.every(k => ['display_name','hero_title','description','logo_url','whatsapp'].includes(k)), 400, 'INVALID_FIELD', 'Field tidak valid.');
      requireThat(one("SELECT id FROM tenants WHERE id=? AND status='active'", tenantId), 403, 'TENANT_INACTIVE', 'Child tidak aktif.');
      const member = repo.membership(tenantId, actorId);
      requireThat(member?.status === 'active' && ['partner_owner','partner_admin'].includes(member.role), 403, 'FORBIDDEN', 'Akses ditolak.');
      db.prepare(`UPDATE tenants SET ${keys.map(k => `${k}=?`).join(',')},config_version=config_version+1 WHERE id=?`).run(...keys.map(k => fields[k]), tenantId);
      audit(tenantId, actorId, 'branding.updated', tenantId, requestId);
    }),
    // Account creation is part of the same transaction as tenant membership.
    register: (tenantId, input, passwordHash, requestId) => atomic(() => {
      requireThat(one("SELECT id FROM tenants WHERE id=? AND kind='child' AND status='active'", tenantId), 403, 'TENANT_INACTIVE', 'Child tidak aktif.');
      requireThat(!one('SELECT id FROM users WHERE email=?', input.email), 409, 'REGISTRATION_UNAVAILABLE', 'Pendaftaran tidak dapat diproses. Gunakan akun yang sudah terdaftar bila tersedia.');
      const userId = crypto.randomUUID();
      db.prepare('INSERT INTO users(id,email,password_hash) VALUES (?,?,?)').run(userId, input.email, passwordHash);
      const role = ['customer','freelancer'].includes(input.role) ? 'seeker' : input.role;
      db.prepare('INSERT INTO users_meta(id,email,role) VALUES (?,?,?)').run(userId, input.email, role);
      db.prepare('INSERT INTO tenant_memberships(tenant_id,user_id,role,display_name,email) VALUES (?,?,?,?,?)').run(tenantId, userId, input.role, input.display_name, input.email);
      audit(tenantId, userId, 'member.registered', userId, requestId);
      return userId;
    }),
  };
  return repo;
}
