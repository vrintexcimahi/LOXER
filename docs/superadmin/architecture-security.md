# LOXER Universal Super Admin OS v5.0 — Architecture & Security Model

**Date:** 25 Oktober 2026  
**Standards:** Universal Super Admin OS — Master Prompt v5.0  
**Scope:** Trust Boundary, Data Model, Provenance, & Recovery Access

---

## 1. System Topology & Trust Boundaries

```text
       [PUBLIC USERS / BROWSER / PWA / MOBILE]
                         │
                         ▼
             HTTPS (Port 443 / 80)
     [CADDY / NGINX PROXY + CLOUDFLARE CDN]
       • TLS Termination
       • Rate Limiting & Gzip/Brotli Compression
       • Hostname Routing (Main App & Partner Tenants)
                         │
                         ▼ HTTP (localhost:3035)
     [NODE.JS EXPRESS & VITE APP SERVER]
  ┌──────────────────────┴──────────────────────┐
  │  TRUST BOUNDARY: verifyAdminRequest (JWT)    │
  ▼                                             ▼
[PUBLIC API / SPA]                     [SUPER ADMIN CONTROL CENTER]
• /api/auth/*                          • /api/system/settings
• /api/jobs/*                          • /api/system/settings/history (v5.0)
• /api/cv/*                            • /api/system/settings/rollback (v5.0)
• /api/public-settings                 • /api/admin/users
                                       • /api/admin/logs
                                                │
                                                ▼ (Direct SQLite Queries / WAL)
                                      [SQLITE DATABASE: data/loxer.db]
                                      • system_settings (Active Snapshot)
                                      • system_settings_revisions (Immutable History)
                                      • audit_logs (Provenance Trail)
                                      • users & user_devices
```

### Trust Boundary Rules
1. **Never Trust Client Payloads:** Seluruh endpoint yang dapat memodifikasi konfigurasi sistem dilindungi oleh `verifyAdminRequest`. Token JWT diverifikasi secara kriptografis menggunakan `JWT_SECRET`.
2. **Read/Write Segregation:** Endpoint publik (`/api/public-settings`) hanya mengembalikan konfigurasi allowlisted (nama brand, logo, tema CSS variables, tautan sosial) dan **tidak pernah** mengembalikan token internal, password hash, atau audit metadata.
3. **Audit Trail Mandat:** Setiap perubahan konfigurasi menulis record ke `system_settings_revisions` dan `audit_logs` dengan identitas `actor_email`, `timestamp`, `action`, dan snapshot data.

---

## 2. Data Model: Configuration & Provenance (v5.0)

### 2.1 Active Configuration Table (`system_settings`)
Menyimpan state konfigurasi aktif sistem saat ini:
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

### 2.2 Immutable Provenance & Revision Table (`system_settings_revisions`)
Menyimpan riwayat snapshot immutable untuk mendukung 1-Click Rollback non-destruktif:
```sql
CREATE TABLE IF NOT EXISTS system_settings_revisions (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL,
  value TEXT NOT NULL,
  change_summary TEXT,
  actor_email TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_settings_rev_key ON system_settings_revisions(setting_key, created_at DESC);
```

### 2.3 Audit Logs Table (`audit_logs`)
Merekam semua aksi administratif penting (create, update, delete, rollback, login):
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  details_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
```

---

## 3. Rollback & Disaster Recovery Architecture (M02)

### Prosedur 1-Click Rollback
1. **Frontend Request:** Admin memilih riwayat revision snapshot pada Tab 6 (`AdminSystemSettings.tsx`) dan mengonfirmasi pemulihan.
2. **Payload:** Mengirimkan `POST /api/system/settings/rollback` dengan `{ revisionId: "rev_..." }`.
3. **Backend Execution (`handleRollbackSystemSettings`):**
   - Mengambil baris revision dari `system_settings_revisions` berdasarkan `revisionId`.
   - Melakukan parse dan validasi keutuhan payload snapshot JSON (`theme`, `assets`, `audio`, `video`, `general`).
   - Menyimpan konfigurasi aktif saat ini sebagai backup revision baru bertanda `Pre-rollback snapshot`.
   - Meng-update tabel `system_settings` dengan konfigurasi target yang dipulihkan secara atomik.
   - Menyisipkan revision log baru bertanda `Rollback ke revision: {revisionId}`.
   - Mencatat aksi pemulihan ke `audit_logs`.
   - Mengembalikan HTTP 200 dengan payload snapshot yang telah dipulihkan.
4. **Runtime Refresh:** Frontend me-reload state form seketika dan menampilkan notifikasi sukses tanpa memerlukan restart server.

### Emergency Backend Recovery (Out-of-Band)
Bila akses web UI terputus atau rusak akibat kesalahan konfigurasi:
1. Akses server melalui SSH: `ssh samsung-server`.
2. Jalankan pemulihan database dari snapshot backup:
   ```bash
   cd /home/vrintex/loxer
   # Salin backup snapshot terakhir
   cp data/loxer.db.backup data/loxer.db
   pm2 reload loxer
   ```
3. Atau reset tabel `system_settings` via SQLite CLI:
   ```bash
   sqlite3 data/loxer.db "UPDATE system_settings SET theme_json='{}' WHERE id='global_config';"
   pm2 reload loxer
   ```
