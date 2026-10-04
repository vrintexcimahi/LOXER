import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'loxer.db');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const SCHEMA_FILE = path.join(DATA_DIR, 'schema.sql');

const JWT_SECRET = process.env.JWT_SECRET || 'loxer-local-jwt-secret-key-2026';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('[SECURITY WARNING] Running in production without a custom JWT_SECRET! Using insecure default fallback.');
}
const JWT_EXPIRES_DAYS = 7;

let dbInstance = globalThis.__loxer_db_instance || null;

export function closeLocalDb() {
  clearStatementCache();
  const inst = dbInstance || globalThis.__loxer_db_instance;
  if (inst) {
    try {
      inst.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch {
      // ignore
    }
    try {
      inst.close();
    } catch {
      // ignore
    }
    dbInstance = null;
    globalThis.__loxer_db_instance = null;
  }
}

export function getLocalDb() {
  if (dbInstance) {
    try {
      dbInstance.exec('SELECT 1;');
      return dbInstance;
    } catch {
      dbInstance = null;
      globalThis.__loxer_db_instance = null;
    }
  }

  if (globalThis.__loxer_db_instance) {
    try {
      globalThis.__loxer_db_instance.exec('SELECT 1;');
      dbInstance = globalThis.__loxer_db_instance;
      return dbInstance;
    } catch {
      globalThis.__loxer_db_instance = null;
    }
  }

  if (!dbInstance) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let pendingDb = null;
    const initDbConnection = () => {
      let lastErr = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        let db = null;
        try {
          db = new DatabaseSync(DB_FILE);
          pendingDb = db;
          db.exec('PRAGMA busy_timeout = 5000;');
          db.exec('PRAGMA journal_mode = WAL;');
          db.exec('PRAGMA synchronous = NORMAL;');
          db.exec('PRAGMA cache_size = -64000;');
          db.exec('PRAGMA temp_store = MEMORY;');
          db.exec('PRAGMA foreign_keys = ON;');

          // Auto-init schema if tables don't exist
          if (fs.existsSync(SCHEMA_FILE)) {
            const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
            db.exec(schemaSql);
          }
          pendingDb = null;
          return db;
        } catch (e) {
          lastErr = e;
          if (db) {
            try { db.close(); } catch {}
          }
          pendingDb = null;
          if (e.message && (e.message.includes('locked') || e.message.includes('busy')) && attempt < 7) {
            const delay = 100 * (attempt + 1);
            const start = Date.now();
            while (Date.now() - start < delay) {}
            continue;
          }
          throw e;
        }
      }
      throw lastErr;
    };

    try {
      dbInstance = initDbConnection();
      globalThis.__loxer_db_instance = dbInstance;
    } catch (err) {
      if (pendingDb) {
        try { pendingDb.close(); } catch {}
        pendingDb = null;
      }
      if (err.message && (err.message.includes('malformed') || err.message.includes('corrupt'))) {
        console.error('[localDb] CRITICAL: SQLite disk image is malformed! Executing automated self-healing...');
        try {
          const timestamp = Date.now();
          const corruptBackup = path.join(DATA_DIR, `corrupted_loxer_${timestamp}.db`);
          if (fs.existsSync(DB_FILE)) {
            try { fs.copyFileSync(DB_FILE, corruptBackup); } catch {}
            try { fs.rmSync(DB_FILE, { force: true }); } catch {}
          }
          const walPath = `${DB_FILE}-wal`;
          const shmPath = `${DB_FILE}-shm`;
          if (fs.existsSync(walPath)) {
            try { fs.rmSync(walPath, { force: true }); } catch {}
          }
          if (fs.existsSync(shmPath)) {
            try { fs.rmSync(shmPath, { force: true }); } catch {}
          }

          dbInstance = initDbConnection();
          console.warn(`[localDb] Automated self-healing succeeded: clean database re-initialized from schema. Corrupted file archived to ${corruptBackup}`);
        } catch (healErr) {
          console.error('[localDb] Self-healing failed:', healErr);
          throw err;
        }
      } else {
        throw err;
      }
    }

    // Incremental column migrations for existing SQLite databases
    try {
      dbInstance.exec('ALTER TABLE moderation_queue ADD COLUMN reason TEXT NOT NULL DEFAULT "";');
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec('ALTER TABLE moderation_queue ADD COLUMN ai_score REAL;');
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec('ALTER TABLE moderation_queue ADD COLUMN ai_flags TEXT DEFAULT "[]";');
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec('ALTER TABLE talent_marketplace_posts ADD COLUMN bio TEXT NOT NULL DEFAULT "";');
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec('ALTER TABLE talent_marketplace_posts ADD COLUMN availability TEXT NOT NULL DEFAULT "fulltime";');
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec('ALTER TABLE job_listings ADD COLUMN expires_at TEXT;');
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec('ALTER TABLE job_listings ADD COLUMN benefits TEXT;');
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec('ALTER TABLE job_listings ADD COLUMN application_url TEXT;');
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec('ALTER TABLE job_listings ADD COLUMN poster_url TEXT;');
    } catch {
      // Column already exists
    }

    // Role check constraint migration for users_meta (adds 'superadmin' and 'freelancer')
    try {
      const metaTable = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users_meta'").get();
      if (metaTable && metaTable.sql && !metaTable.sql.includes('freelancer')) {
        dbInstance.exec('PRAGMA foreign_keys = OFF;');
        dbInstance.exec(`
          CREATE TABLE users_meta_new (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('seeker', 'employer', 'admin', 'superadmin', 'freelancer')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            is_banned INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
          );
          INSERT INTO users_meta_new SELECT id, email, role, created_at, is_banned FROM users_meta;
          DROP TABLE users_meta;
          ALTER TABLE users_meta_new RENAME TO users_meta;
          CREATE INDEX IF NOT EXISTS idx_users_meta_role ON users_meta(role);
        `);
        dbInstance.exec('PRAGMA foreign_keys = ON;');
      }
    } catch (e) {
      console.warn('[localDb] users_meta migration notice:', e.message);
    }

    // Application status check constraint migration (adds 'expired')
    try {
      const appTable = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='applications'").get();
      if (appTable && appTable.sql && !appTable.sql.includes('expired')) {
        dbInstance.exec('PRAGMA foreign_keys = OFF;');
        dbInstance.exec(`
          CREATE TABLE applications_new (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            seeker_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'hired', 'rejected', 'expired')),
            applied_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (job_id) REFERENCES job_listings(id) ON DELETE CASCADE,
            FOREIGN KEY (seeker_id) REFERENCES seeker_profiles(id) ON DELETE CASCADE,
            UNIQUE(job_id, seeker_id)
          );
          INSERT INTO applications_new SELECT id, job_id, seeker_id, status, applied_at, updated_at FROM applications;
          DROP TABLE applications;
          ALTER TABLE applications_new RENAME TO applications;
          CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
          CREATE INDEX IF NOT EXISTS idx_applications_seeker ON applications(seeker_id);
          CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
        `);
        dbInstance.exec('PRAGMA foreign_keys = ON;');
      }
    } catch (e) {
      console.warn('[localDb] applications migration notice:', e.message);
    }

    // High Performance Search Indexes for job listings & marketplace
    try {
      dbInstance.exec(`
        CREATE INDEX IF NOT EXISTS idx_job_listings_title ON job_listings(title);
        CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(location_city);
        CREATE INDEX IF NOT EXISTS idx_job_listings_category ON job_listings(category);
        CREATE INDEX IF NOT EXISTS idx_job_listings_status ON job_listings(status);
        CREATE INDEX IF NOT EXISTS idx_job_listings_company_id ON job_listings(company_id);
        CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON job_listings(created_at);
        CREATE INDEX IF NOT EXISTS idx_talent_posts_headline ON talent_marketplace_posts(headline);
        CREATE INDEX IF NOT EXISTS idx_talent_posts_category ON talent_marketplace_posts(category);
      `);
    } catch {
      // ignore
    }

    // 28. Refresh tokens table migration
    try {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          revoked INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
      `);
    } catch {
      // ignore
    }

    // 29. Web Traffic & Real-time Visitor Tracking Table (Guest & Registered Visitors)
    try {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS web_traffic_logs (
          id TEXT PRIMARY KEY,
          visitor_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          user_id TEXT,
          user_email TEXT,
          user_role TEXT DEFAULT 'guest',
          path TEXT NOT NULL,
          page_title TEXT,
          referrer TEXT,
          device_type TEXT,
          browser TEXT,
          os TEXT,
          screen_res TEXT,
          ip_address TEXT,
          city TEXT,
          duration_seconds INTEGER DEFAULT 0,
          metadata TEXT DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_traffic_visitor_id ON web_traffic_logs(visitor_id);
        CREATE INDEX IF NOT EXISTS idx_traffic_session_id ON web_traffic_logs(session_id);
        CREATE INDEX IF NOT EXISTS idx_traffic_user_id ON web_traffic_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_traffic_created_at ON web_traffic_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_traffic_path ON web_traffic_logs(path);
      `);
    } catch {
      // ignore
    }

    // Auto-heal missing parent user references for orphan profiles to satisfy FK constraints
    try {
      dbInstance.exec(`
        INSERT OR IGNORE INTO users (id, email, password_hash, created_at)
        VALUES ('admin-vrintex-root', 'vrintex@loxer.app', 'stub_hash_placeholder', datetime('now'));

        INSERT OR IGNORE INTO users_meta (id, email, role, created_at, is_banned)
        VALUES ('admin-vrintex-root', 'vrintex@loxer.app', 'superadmin', datetime('now'), 0);

        INSERT OR IGNORE INTO users (id, email, password_hash, created_at)
        SELECT DISTINCT user_id, user_id || '@loxer.local', 'stub_hash_placeholder', datetime('now')
        FROM seeker_profiles
        WHERE user_id NOT IN (SELECT id FROM users);

        INSERT OR IGNORE INTO users_meta (id, email, role, created_at, is_banned)
        SELECT DISTINCT user_id, user_id || '@loxer.local', 'seeker', datetime('now'), 0
        FROM seeker_profiles
        WHERE user_id NOT IN (SELECT id FROM users_meta);

        INSERT OR IGNORE INTO users (id, email, password_hash, created_at)
        SELECT DISTINCT user_id, user_id || '@loxer.local', 'stub_hash_placeholder', datetime('now')
        FROM companies
        WHERE user_id NOT IN (SELECT id FROM users);

        INSERT OR IGNORE INTO users_meta (id, email, role, created_at, is_banned)
        SELECT DISTINCT user_id, user_id || '@loxer.local', 'employer', datetime('now'), 0
        FROM companies
        WHERE user_id NOT IN (SELECT id FROM users_meta);

        DELETE FROM talent_marketplace_posts
        WHERE seeker_id NOT IN (SELECT id FROM seeker_profiles);
      `);
    } catch (e) {
      console.warn('[localDb] orphan user repair notice:', e.message);
    }

    // Ensure jasa_ads table exists and seed initial demo data if empty
    try {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS jasa_ads (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Lainnya',
          description TEXT NOT NULL DEFAULT '',
          price INTEGER NOT NULL DEFAULT 0,
          price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'nego', 'hourly')),
          city TEXT NOT NULL DEFAULT '',
          whatsapp TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'suspended')),
          views_count INTEGER NOT NULL DEFAULT 0,
          rating REAL DEFAULT 0,
          review_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_jasa_ads_status ON jasa_ads(status);
        CREATE INDEX IF NOT EXISTS idx_jasa_ads_category ON jasa_ads(category);
        CREATE INDEX IF NOT EXISTS idx_jasa_ads_user ON jasa_ads(user_id);
      `);

      const countRow = dbInstance.prepare('SELECT COUNT(*) as cnt FROM jasa_ads').get();
      if (!countRow || countRow.cnt === 0) {
        const anyUser = dbInstance.prepare('SELECT id FROM users LIMIT 1').get();
        if (anyUser) {
          const insertStmt = dbInstance.prepare(`
            INSERT INTO jasa_ads (id, user_id, title, category, description, price, price_type, city, whatsapp, status, views_count, rating, review_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `);
          insertStmt.run(
            'ad-jasa-001',
            anyUser.id,
            'Jasa Service & Cuci AC Panggilan Cepat Bergaransi',
            'Teknik & Pertukangan',
            'Melayani cuci AC, perbaikan AC bocor, tambah freon R32/R410/R22, dan bongkar pasang AC semua merk. Teknisi berpengalaman dan bergaransi.',
            75000,
            'fixed',
            'Bandung & Cimahi',
            '081234567890',
            'active',
            142,
            4.9,
            28
          );
          insertStmt.run(
            'ad-jasa-002',
            anyUser.id,
            'Jasa Desain Grafis Profesional (Logo, Brosur, Sosmed)',
            'Desain & Multimedia',
            'Pembuatan desain logo branding UMKM/Perusahaan, banner promosi, feed Instagram, kartu nama, dan kemasan produk. Revisi fleksibel sampai puas.',
            150000,
            'nego',
            'Jakarta Selatan',
            '081987654321',
            'active',
            320,
            5.0,
            45
          );
          insertStmt.run(
            'ad-jasa-003',
            anyUser.id,
            'Jasa Pembuatan Website Company Profile & Toko Online',
            'Teknologi & IT',
            'Website modern, responsif mobile, cepat, dan SEO-friendly. Sudah termasuk hosting, domain .com 1 tahun, dan integrasi WhatsApp CS.',
            850000,
            'fixed',
            'Surabaya',
            '082133445566',
            'active',
            215,
            4.8,
            19
          );
          insertStmt.run(
            'ad-jasa-004',
            anyUser.id,
            'Jasa Instalasi & Perbaikan Listrik Rumah / Kantor',
            'Teknik & Pertukangan',
            'Pemasangan instalasi kabel baru, tambah titik lampu/stop kontak, perbaikan konsleting listrik, dan perapihan panel MCB.',
            50000,
            'hourly',
            'Bekasi',
            '085678901234',
            'pending',
            48,
            4.7,
            8
          );
        }
      }
    } catch (e) {
      console.warn('[localDb] jasa_ads setup notice:', e.message);
    }

    // Ensure marketplace_products & marketplace_transactions tables exist
    try {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS marketplace_products (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          seller_name TEXT NOT NULL,
          seller_role TEXT NOT NULL DEFAULT 'seeker',
          seller_verified INTEGER NOT NULL DEFAULT 0,
          seller_avatar TEXT,
          seller_whatsapp TEXT NOT NULL,
          seller_city TEXT NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          sub_category TEXT,
          condition TEXT NOT NULL,
          price REAL NOT NULL,
          price_type TEXT NOT NULL DEFAULT 'nego',
          images TEXT NOT NULL DEFAULT '[]',
          description TEXT NOT NULL,
          stock INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'available',
          digital_download_url TEXT,
          views_count INTEGER NOT NULL DEFAULT 0,
          likes_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_mp_products_cat ON marketplace_products(category);
        CREATE INDEX IF NOT EXISTS idx_mp_products_status ON marketplace_products(status);

        CREATE TABLE IF NOT EXISTS marketplace_transactions (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL,
          product_title TEXT NOT NULL,
          product_price REAL NOT NULL,
          product_image TEXT,
          buyer_id TEXT NOT NULL,
          buyer_name TEXT NOT NULL,
          buyer_whatsapp TEXT NOT NULL,
          seller_id TEXT NOT NULL,
          seller_name TEXT NOT NULL,
          seller_whatsapp TEXT NOT NULL,
          offer_price REAL NOT NULL,
          notes TEXT,
          payment_method TEXT NOT NULL DEFAULT 'whatsapp',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_mp_tx_buyer ON marketplace_transactions(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_mp_tx_seller ON marketplace_transactions(seller_id);
      `);

      const mpCount = dbInstance.prepare('SELECT COUNT(*) as cnt FROM marketplace_products').get();
      if (!mpCount || mpCount.cnt === 0) {
        const anyUser = dbInstance.prepare('SELECT id FROM users LIMIT 1').get();
        const userId = anyUser?.id || 'usr-demo-dev-1';
        const insProduct = dbInstance.prepare(`
          INSERT INTO marketplace_products (
            id, user_id, seller_name, seller_role, seller_verified, seller_whatsapp, seller_city,
            title, category, sub_category, condition, price, price_type, images, description, stock,
            status, digital_download_url, views_count, likes_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        insProduct.run(
          'prod-dig-1',
          userId,
          'Arifin Ahmad (Dev)',
          'freelancer',
          1,
          '6281234567801',
          'Bandung',
          'Source Code Aplikasi Kasir & POS Multi-Cabang (React + Node.js)',
          'digital',
          'Source Code & Script',
          'Digital',
          450000,
          'nego',
          JSON.stringify(['https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80']),
          'Source code lengkap aplikasi POS Kasir & Inventaris toko siap pakai. Fitur cetak struk bluetooth, laporan penjualan harian/bulanan, stok barang otomatis, barcode scanner, dan dashboard admin modern. Include dokumentasi instalasi lengkap.',
          99,
          'available',
          'https://github.com/vrintexcimahi/LOXER',
          342,
          58
        );
        insProduct.run(
          'prod-sec-1',
          userId,
          'PT Vrintex Asset IT',
          'employer',
          1,
          '6281234567802',
          'Jakarta Selatan',
          'MacBook Pro M1 2020 RAM 16GB SSD 512GB Space Grey Like New',
          'second',
          'Laptop & Komputer',
          'Sekon (Second)',
          11500000,
          'nego',
          JSON.stringify(['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80']),
          'Eks pemakaian kantor divisi design & tech. Body 98% mulus tanpa dent/penyok, battery health 91% (Normal cycle count rendah), layar jernih TrueTone aktif, iCloud aman bebas reset. Kelengkapan unit + charger original Type-C 61W.',
          2,
          'available',
          null,
          812,
          94
        );
      }
    } catch (e) {
      console.warn('[localDb] marketplace tables setup notice:', e.message);
    }

    // Auto-record today's analytics snapshot on initialization
    try {
      recordDailyAnalyticsSnapshot();
    } catch {
      // Ignore initial recording error if tables not yet populated
    }

    // Schedule background periodic snapshot check & retention maintenance (every 1 hour)
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => {
        try {
          recordDailyAnalyticsSnapshot();
        } catch {
          // ignore
        }
        try {
          purgeOldAuditLogs(90);
          purgeOldActivityLogs(60);
          notifyExpiringJobListings(3);
          pruneOldSnapshots(7);
        } catch {
          // ignore
        }
      }, 60 * 60 * 1000);
      if (timer.unref) timer.unref();

      // Start automatic daily database backup scheduler
      try {
        startAutoBackupSchedule();
      } catch {
        // ignore
      }
    }
  }

  return dbInstance;
}

// ---------------------------------------------------------------------------
// Security & Auth Utilities (Pure Native Node.js crypto, zero dependencies)
// ---------------------------------------------------------------------------

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  const bufA = Buffer.from(hash);
  const bufB = Buffer.from(originalHash);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

export function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + JWT_EXPIRES_DAYS * 24 * 60 * 60;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Refresh Tokens & Rotational Session Management
// ---------------------------------------------------------------------------

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function createRefreshToken(userId) {
  if (!userId) throw new Error('userId is required for refresh token');
  const rawToken = 'lrt_' + crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const tokenId = 'rt_' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  execute(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked) VALUES (?, ?, ?, ?, 0)',
    [tokenId, userId, tokenHash, expiresAt]
  );

  return { rawToken, tokenId, expiresAt };
}

export function rotateRefreshToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = hashToken(rawToken);
  const existing = queryOne(
    'SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = ?',
    [tokenHash]
  );

  if (!existing || existing.revoked === 1) {
    return null;
  }

  // Check expiration
  if (new Date(existing.expires_at).getTime() < Date.now()) {
    execute('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [existing.id]);
    return null;
  }

  // Atomic rotation inside transaction
  return withTransaction(() => {
    execute('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [existing.id]);

    const newRawToken = 'lrt_' + crypto.randomBytes(32).toString('hex');
    const newTokenHash = hashToken(newRawToken);
    const newId = 'rt_' + crypto.randomUUID();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    execute(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked) VALUES (?, ?, ?, ?, 0)',
      [newId, existing.user_id, newTokenHash, newExpiresAt]
    );

    const user = queryOne('SELECT id, email, created_at FROM users WHERE id = ?', [existing.user_id]);
    const userMeta = queryOne('SELECT role, is_banned FROM users_meta WHERE id = ?', [existing.user_id]);

    const accessToken = generateToken({
      sub: existing.user_id,
      email: user?.email,
      role: userMeta?.role || 'seeker',
    });

    return {
      accessToken,
      refreshToken: newRawToken,
      expiresAt: newExpiresAt,
      user: {
        id: user?.id,
        email: user?.email,
        role: userMeta?.role || 'seeker',
      },
    };
  });
}

export function revokeRefreshToken(rawToken) {
  if (!rawToken) return false;
  const tokenHash = hashToken(rawToken);
  execute('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [tokenHash]);
  return true;
}

// ---------------------------------------------------------------------------
// Database Operations Helper & Statement Caching Engine
// ---------------------------------------------------------------------------

const dbStatementCaches = new WeakMap();
const MAX_STATEMENT_CACHE_ENTRIES = 250;

export function clearStatementCache() {
  if (dbInstance) {
    dbStatementCaches.delete(dbInstance);
  }
}

function getCachedStatement(db, sql) {
  let cache = dbStatementCaches.get(db);
  if (!cache) {
    cache = new Map();
    dbStatementCaches.set(db, cache);
  }
  let stmt = cache.get(sql);
  if (!stmt) {
    if (cache.size >= MAX_STATEMENT_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    stmt = db.prepare(sql);
    cache.set(sql, stmt);
  }
  return stmt;
}

function runWithBusyRetry(operation, maxRetries = 3, backoffs = [50, 150, 300]) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return operation();
    } catch (err) {
      const isBusy =
        err &&
        (err.code === 'SQLITE_BUSY' ||
          (typeof err.message === 'string' && err.message.toLowerCase().includes('busy')));

      if (isBusy && attempt < maxRetries) {
        const delayMs = backoffs[attempt] || 100;
        const start = Date.now();
        while (Date.now() - start < delayMs) {
          // Synchronous sleep spin-wait for busy backoff
        }
        continue;
      }
      throw err;
    }
  }
}

export function queryOne(sql, params = []) {
  return runWithBusyRetry(() => {
    const db = getLocalDb();
    const stmt = getCachedStatement(db, sql);
    return stmt.get(...params);
  });
}

export function queryAll(sql, params = []) {
  return runWithBusyRetry(() => {
    const db = getLocalDb();
    const stmt = getCachedStatement(db, sql);
    return stmt.all(...params);
  });
}

export function execute(sql, params = []) {
  return runWithBusyRetry(() => {
    const db = getLocalDb();
    const stmt = getCachedStatement(db, sql);
    return stmt.run(...params);
  });
}

export function withTransaction(callback) {
  return runWithBusyRetry(() => {
    const db = getLocalDb();
    db.exec('BEGIN IMMEDIATE;');
    try {
      const result = callback(db);
      db.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // ignore rollback error
      }
      throw err;
    }
  });
}


// ---------------------------------------------------------------------------
// Automated Daily Analytics Snapshot Generator
// ---------------------------------------------------------------------------

export function recordDailyAnalyticsSnapshot(targetDate = null) {
  const db = dbInstance || getLocalDb();
  const dateStr = targetDate || new Date().toISOString().split('T')[0];

  // Check if snapshot already exists
  const existing = db.prepare('SELECT * FROM analytics_snapshots WHERE snapshot_date = ?').get(dateStr);
  if (existing) return existing;

  // Aggregate current metrics
  const totalUsersRow = db.prepare('SELECT count(*) as c FROM users_meta').get();
  const newUsersRow = db.prepare('SELECT count(*) as c FROM users_meta WHERE DATE(created_at) = ?').get(dateStr);
  const totalJobsRow = db.prepare('SELECT count(*) as c FROM job_listings').get();
  const newJobsRow = db.prepare('SELECT count(*) as c FROM job_listings WHERE DATE(created_at) = ?').get(dateStr);
  const totalAppsRow = db.prepare('SELECT count(*) as c FROM applications').get();
  const newAppsRow = db.prepare('SELECT count(*) as c FROM applications WHERE DATE(applied_at) = ?').get(dateStr);

  const totalUsers = totalUsersRow?.c || 0;
  const newUsers = newUsersRow?.c || 0;
  const totalJobs = totalJobsRow?.c || 0;
  const newJobs = newJobsRow?.c || 0;
  const totalApps = totalAppsRow?.c || 0;
  const newApps = newAppsRow?.c || 0;
  const activeUsers = Math.max(1, Math.round(totalUsers * 0.75));
  const conversionRate = totalUsers > 0 ? Number(((totalApps / totalUsers) * 100).toFixed(1)) : 0;
  const avgTimeToHire = 14.5;
  const platformScore = 95.5;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO analytics_snapshots (
      id, snapshot_date, total_users, new_users, active_users,
      total_jobs, new_jobs, total_apps, new_apps,
      conversion_rate, avg_time_to_hire, platform_score, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, dateStr, totalUsers, newUsers, activeUsers,
    totalJobs, newJobs, totalApps, newApps,
    conversionRate, avgTimeToHire, platformScore, now
  );

  return {
    id,
    snapshot_date: dateStr,
    total_users: totalUsers,
    new_users: newUsers,
    active_users: activeUsers,
    total_jobs: totalJobs,
    new_jobs: newJobs,
    total_apps: totalApps,
    new_apps: newApps,
    conversion_rate: conversionRate,
    avg_time_to_hire: avgTimeToHire,
    platform_score: platformScore,
    created_at: now,
  };
}

// ---------------------------------------------------------------------------
// Automated Database Backup & Snapshot Engine
// ---------------------------------------------------------------------------

export function createDatabaseSnapshot(label = '') {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const db = getLocalDb();
  try {
    db.exec('REINDEX;');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // ignore
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const slug = label ? `-${label.replace(/[^a-zA-Z0-9_-]/g, '')}` : '';
  const filename = `loxer-snapshot-${dateStr}-${timeStr}${slug}.db`;
  const destPath = path.join(BACKUPS_DIR, filename);

  db.prepare('VACUUM INTO ?').run(destPath);
  const stats = fs.statSync(destPath);

  try {
    pruneOldSnapshots(7);
  } catch {
    // ignore
  }

  return {
    filename,
    path: destPath,
    sizeBytes: stats.size,
    createdAt: now.toISOString(),
  };
}

export function listDatabaseSnapshots() {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith('loxer-snapshot-') && f.endsWith('.db'))
    .sort()
    .reverse();

  return files.map((filename) => {
    const fullPath = path.join(BACKUPS_DIR, filename);
    const stats = fs.statSync(fullPath);
    return {
      filename,
      sizeBytes: stats.size,
      createdAt: stats.mtime.toISOString(),
    };
  });
}

export function pruneOldSnapshots(maxKeepDays = 7) {
  if (!fs.existsSync(BACKUPS_DIR)) return 0;
  const cutoff = Date.now() - maxKeepDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.startsWith('loxer-snapshot-') && f.endsWith('.db'));
  let deleted = 0;
  for (const f of files) {
    const fullPath = path.join(BACKUPS_DIR, f);
    const stats = fs.statSync(fullPath);
    if (stats.mtimeMs < cutoff) {
      fs.unlinkSync(fullPath);
      deleted++;
    }
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Automated Database Backup Scheduler (Cron Job)
// ---------------------------------------------------------------------------

let autoBackupTimer = null;

export function startAutoBackupSchedule(intervalMs = 24 * 60 * 60 * 1000) {
  if (autoBackupTimer) return;
  autoBackupTimer = setInterval(() => {
    try {
      console.log('[localDb] Menjalankan scheduled database snapshot otomatis...');
      createDatabaseSnapshot('cron-auto');
      pruneOldSnapshots(7);
    } catch (err) {
      console.warn('[localDb] Scheduled database snapshot notice:', err.message);
    }
  }, intervalMs);

  if (autoBackupTimer.unref) {
    autoBackupTimer.unref();
  }
}

export function stopAutoBackupSchedule() {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
}

export function getSnapshotFilePath(filename) {
  // Prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  if (!filename.startsWith('loxer-snapshot-') || !filename.endsWith('.db')) {
    return null;
  }
  const full = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(full)) return null;
  return full;
}

export function restoreDatabaseSnapshot(filename) {
  const fullPath = getSnapshotFilePath(filename);
  if (!fullPath) {
    throw new Error('Berkas snapshot tidak valid atau tidak ditemukan.');
  }

  // Close active DatabaseSync connection if open
  closeLocalDb();

  // Remove or truncate active WAL and SHM files to avoid conflict
  const walPath = `${DB_FILE}-wal`;
  const shmPath = `${DB_FILE}-shm`;
  if (fs.existsSync(walPath)) {
    try {
      fs.truncateSync(walPath, 0);
      fs.unlinkSync(walPath);
    } catch {
      try { fs.writeFileSync(walPath, Buffer.alloc(0)); } catch {}
    }
  }
  if (fs.existsSync(shmPath)) {
    try {
      fs.truncateSync(shmPath, 0);
      fs.unlinkSync(shmPath);
    } catch {
      try { fs.writeFileSync(shmPath, Buffer.alloc(0)); } catch {}
    }
  }

  // Copy snapshot over active database with retry for Windows file unlock
  let copied = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.copyFileSync(fullPath, DB_FILE);
      copied = true;
      break;
    } catch (err) {
      if (attempt < 4) {
        try {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        } catch {
          // fallback if SharedArrayBuffer unavailable
        }
      } else {
        throw err;
      }
    }
  }

  // Re-open and verify database
  const db = getLocalDb();
  try {
    db.exec('REINDEX;');
  } catch {}
  const check = db.prepare('PRAGMA integrity_check').get();
  if (check && check.integrity_check !== 'ok') {
    throw new Error(`Integritas basis data gagal: ${check.integrity_check}`);
  }

  return { ok: true, filename };
}

export function purgeOldAuditLogs(maxDays = 90) {
  const db = getLocalDb();
  const cutoff = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();
  const res = db.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(cutoff);
  return res.changes;
}

export function purgeOldActivityLogs(maxDays = 60) {
  const db = getLocalDb();
  const cutoff = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();
  const res = db.prepare('DELETE FROM user_activity_logs WHERE created_at < ?').run(cutoff);
  return res.changes;
}

export function notifyExpiringJobListings(daysThreshold = 3) {
  const db = getLocalDb();
  try {
    const expiringJobs = db.prepare(`
      SELECT j.id, j.title, j.expires_at, c.user_id as employer_user_id, c.name as company_name
      FROM job_listings j
      JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'active'
        AND j.expires_at IS NOT NULL
        AND j.expires_at > datetime('now')
        AND j.expires_at <= datetime('now', '+' || ? || ' days')
    `).all(daysThreshold);

    let notifiedCount = 0;
    for (const job of expiringJobs) {
      if (!job.employer_user_id) continue;

      const existing = db.prepare(`
        SELECT id FROM notifications
        WHERE user_id = ?
          AND type = 'job_expiring'
          AND created_at >= datetime('now', '-3 days')
          AND metadata LIKE ?
        LIMIT 1
      `).get(job.employer_user_id, `%"job_id":"${job.id}"%`);

      if (!existing) {
        const notifId = 'notif_exp_' + crypto.randomUUID();
        const title = 'Lowongan Mendekati Kadaluarsa';
        const message = `Lowongan "${job.title}" akan berakhir pada ${job.expires_at}. Anda dapat memperpanjang durasi lowongan dengan satu klik.`;
        const metadata = JSON.stringify({
          job_id: job.id,
          expires_at: job.expires_at,
          action: 'extend_job',
          company_name: job.company_name,
        });

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, is_read, metadata, created_at)
          VALUES (?, ?, ?, ?, 'job_expiring', 0, ?, datetime('now'))
        `).run(notifId, job.employer_user_id, title, message, metadata);

        notifiedCount++;
      }
    }
    return notifiedCount;
  } catch (err) {
    console.warn('[localDb] notifyExpiringJobListings notice:', err.message);
    return 0;
  }
}

export function extendJobListing(jobId, daysToAdd = 30) {
  const db = getLocalDb();
  const res = db.prepare(`
    UPDATE job_listings
    SET expires_at = datetime(
      CASE 
        WHEN expires_at > datetime('now') THEN expires_at 
        ELSE datetime('now') 
      END, 
      '+' || ? || ' days'
    ),
    updated_at = datetime('now')
    WHERE id = ?
  `).run(daysToAdd, jobId);

  return res.changes > 0;
}

