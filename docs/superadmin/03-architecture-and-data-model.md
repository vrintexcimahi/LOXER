# 03 — Architecture & Data Model: LOXER Universal Super Admin OS

## 1. System Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / USER CHANNELS                          │
│   Web Browser (Desktop/Mobile)  │  PWA (Standalone WebAPK)  │  Partners │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTPS (Caddy :80/:443 + Cloudflare)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       REVERSE PROXY & GATEWAY                          │
│   - SSL/TLS Termination         - Hostname / Tenant Resolution          │
│   - Rate Limiting & Gzip/Brotli - No-cache Headers for App Shell       │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTP localhost:3035
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    NODE.JS EXPRESS & VITE RUNTIME                      │
│   - App Router (SPA)            - TenantGateway Middleware              │
│   - /api/v1/* Endpoints         - LocalApiHandler (Auth, JWT, CRUD)     │
│   - Static Asset Serving        - Image Processor & File Uploads        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        LOCAL SQLITE DATABASE         │  │   SUPABASE CLOUD (FALLBACK)  │
│  - data/loxer.db (WAL Mode)          │  │  - PostgreSQL Engine         │
│  - Busy Timeout: 5000ms              │  │  - RLS Policies              │
│  - Automatic Backup Snapshots        │  │  - Auth Service              │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 2. Core Relational Data Schema (`data/schema.sql`)

### 1. Settings & Configuration Registry
```sql
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  theme_json TEXT NOT NULL,
  assets_json TEXT NOT NULL,
  audio_json TEXT NOT NULL,
  video_json TEXT NOT NULL,
  general_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);
```

### 2. User Accounts & RBAC
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'seeker', -- seeker, employer, partner, admin, superadmin
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_active_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. Moderation & Ingestion Queue
```sql
CREATE TABLE IF NOT EXISTS moderation_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- job_listing, smart_cv, talent_post
  source TEXT NOT NULL, -- direct_user, fb_group_scraper, api
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);
```

### 4. Partner Multi-Tenancy (Child Panels)
```sql
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT,
  commission_rate REAL NOT NULL DEFAULT 0.10,
  balance_idr INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
