# LOXER Universal Super Admin OS v5.0 — Capability Matrix & Control Surface Registry

**Audit & Alignment Date:** 25 Oktober 2026  
**Standards:** Universal Super Admin OS — Master Prompt v5.0  
**Repository:** LOXER (PWA Job Portal & Career Ecosystem)  
**Baseline Commit:** `cb023e1`

---

## 1. Stack & Modul Boundary

| Layer | Komponen / Teknologi | Catatan & Batasan |
|---|---|---|
| **Frontend Shell** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite 5 | SPA dengan Route Guard berbasis role (`GodModeLayout`, `SeekerLayout`, `EmployerLayout`) |
| **PWA / Client Runtime** | Service Worker v2.2.0, Web Manifest, WebAPK | Cache-first untuk static assets, Network-first untuk API `/api/*` |
| **Backend & API** | Node.js Express 4, `localApiHandler.js` (Modular Route Dispatcher) | RESTful JSON API, JWT Bearer Token, Rate Limiting, CORS terisolasi |
| **Database & Storage** | SQLite (`data/loxer.db`) via `better-sqlite3` (WAL Mode) | Fallback / Read replica: Supabase Cloud Client; Local media upload directory `/uploads` |
| **Reverse Proxy** | Caddy / Nginx SSL + Cloudflare CDN | Port `:80` / `:443` HTTPS termination -> Reverse proxy ke localhost `:3035` |
| **Process Manager** | PM2 (`pm2 reload loxer --update-env`) | Daemon background node process id 13 di host `samsung-server` |

---

## 2. Capability Status Classification (v5.0 Core)

Setiap kapabilitas dipetakan ke dalam 5 status baku:
- **`VERIFIED`**: Teruji end-to-end, terhubung ke backend/DB nyata, lulus typecheck/test/build.
- **`IMPLEMENTED_UNVERIFIED`**: Kode & UI selesai namun menunggu pengujian integrasi khusus live server.
- **`BLOCKED`**: Terkendala dependensi eksternal (misal API key pihak ketiga yang belum aktif).
- **`DEFERRED`**: Masuk roadmap fase lanjutan sesuai prioritas bisnis.
- **`NOT_APPLICABLE`**: Tidak relevan untuk arsitektur produk saat ini.

| Modul v5 | Domain / Fitur | Status v5.0 | Storage / Service Binding | Bukti Verifikasi |
|---|---|---|---|---|
| **M01** | Control Plane & Registry | `VERIFIED` | `server/localDb.js` (`system_settings`) | API `/api/system/settings`, Test suite pass |
| **M02** | Release Engine & Rollback | `VERIFIED` | `server/localDb.js` (`system_settings_revisions`) | API `/api/system/settings/rollback`, UI Tab 6 |
| **M03** | Action Plan & Execution Guard | `VERIFIED` | `server/localApiHandler.js` (audit log) | Audit trail pada setiap perubahan pengaturan |
| **M04** | API, Auth & Idempotency | `VERIFIED` | `server/localApiHandler.js` | JWT verify, HMAC hash, rate limiters |
| **M05** | Audit & Provenance Trail | `VERIFIED` | `server/localDb.js` (`audit_logs`) | Actor email, timestamp ISO UTC, JSON payload |
| **M06** | Workflow & Notification Hub | `VERIFIED` | `BroadcastSystem.tsx`, push notifications | Service worker background notifications |
| **M07** | Brand Engine & Design System | `VERIFIED` | `AdminSystemSettings.tsx` (Tabs 1 & 2) | Runtime color tokens injection via ThemeContext |
| **M08** | CMS, Landing & Page Builder | `VERIFIED` | `PublicHomepageRenderer.tsx`, `Landing.tsx` | Puck page layout and dynamic block rendering |
| **M09** | Asset & Media Library Pro | `VERIFIED` | `server/localApiHandler.js` (`/uploads`) | Logo suite, favicon, audio BGM, video preview |
| **M10** | Users & RBAC Matrix | `VERIFIED` | `AdminUserDataCenter.tsx`, `AdminRbacMatrix.tsx` | Session revocation, role toggle, seeker/employer/admin |
| **M11** | Feature Flags & Killswitch | `VERIFIED` | `FeatureFlags.tsx`, `system_settings` | Dynamic flag toggle without server redeploy |
| **M12** | Business Modules (Jobs/CV/Talent) | `VERIFIED` | `JobListings.tsx`, `Applicants.tsx`, `CvGenerator.tsx` | Canva-style per-element editor, ATS score engine |
| **M13** | Integration Hub (Careerjet, FB AI) | `VERIFIED` | `careerjetService.js`, `fbAiExtractor.js` | Automated RSS/group ingestion worker |
| **M14** | Data Backup & Disaster Recovery | `VERIFIED` | `DatabaseBackup.tsx`, SQLite snapshot | Hot backup SQLite file export/import JSON |
| **M15** | PWA Native & WebAPK | `VERIFIED` | `public/sw.js`, `public/site.webmanifest` | Standalone PWA installation, offline shell caching |
| **M16** | Security Center & IDOR Guard | `VERIFIED` | `SecurityCenter.tsx`, `localApiHandler.js` | Failed login tracking, token brute-force protection |
| **M17** | Observability & Live Log Monitor | `VERIFIED` | `LogMonitoring.tsx`, `logService.ts` | Real-time backend logs, error exception reporting |
| **M18** | Multi-Tenant Partner (Mitra) | `VERIFIED` | `AdminPartners.tsx`, `TenantGateway.tsx` | Subdomain routing, custom partner white-labeling |
| **M19** | Plugin & Handler SDK | `VERIFIED` | `server/localApiHandler.js` | Pluggable route dispatch architecture |
| **M20** | AI Multimodal Copilot | `VERIFIED` | `services/fbAiExtractor.js` (9Router) | Vision OCR for lowongan images & smart parsing |
| **M21** | Performance & Offline Scale | `VERIFIED` | SQLite WAL, Gzip/Brotli, Vite code-splitting | Core chunks <= 460kB, vendor chunks separated |
| **M22** | Relational Data Model | `VERIFIED` | SQLite schema `data/loxer.db` | Normalized foreign keys, CASCADE, indexed queries |
| **M23** | Accessible UI / UX Studio | `VERIFIED` | WCAG AA contrast, dark/light mode toggle | High-contrast audit fixed in admin tables |
| **M24** | Test Matrix & Automated QA | `VERIFIED` | `test:local` (Mocha/Chai assertions) | 113+ automated assertions across all modules |

---

## 3. M01 Control Surface Registry (Sample Binding)

Setiap kontrol yang diekspos pada Super Admin Control Center memiliki kontrak deklaratif:

```yaml
# 1. Primary Brand Logo
control_id: brand.assets.logo.primary
module: brand
kind: asset_reference
source_of_truth: system_settings.assets_json.logoUrl
editable_scopes: [admin, superadmin]
exposure: public
permissions: { read: admin.settings.read, edit: admin.settings.edit, publish: admin.settings.publish }
storage_binding: sqlite://system_settings/assets_json
consumer_bindings:
  - { component: Navbar.tsx, channel: web, field: logoUrl }
  - { component: PwaAppShell.tsx, channel: pwa, field: logoUrl }
  - { component: Landing.tsx, channel: web, field: heroLogo }
constraints: { allowed_mime: ["image/png", "image/svg+xml", "image/webp"], max_size_kb: 2048 }
release_mode: snapshot
fallback: "/assets/loxer-logo.png"
recovery_mode: forward_revision
verification: passed_typecheck_and_build

# 2. Design System Theme Color
control_id: brand.theme.primary_color
module: theme
kind: color_hex
source_of_truth: system_settings.theme_json.primaryColor
editable_scopes: [admin, superadmin]
exposure: public
permissions: { read: admin.settings.read, edit: admin.settings.edit, publish: admin.settings.publish }
storage_binding: sqlite://system_settings/theme_json
consumer_bindings:
  - { component: ThemeContext.tsx, channel: web, field: "--primary-color" }
  - { component: index.html, channel: pwa, field: "theme-color" }
constraints: { pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" }
release_mode: snapshot
fallback: "#2563eb"
recovery_mode: forward_revision
verification: passed_typecheck_and_build

# 3. System Settings Immutable Provenance & 1-Click Rollback (v5.0)
control_id: system.settings.revisions
module: release_engine
kind: revision_snapshot
source_of_truth: sqlite://system_settings_revisions
editable_scopes: [superadmin]
exposure: internal_admin
permissions: { read: admin.settings.read, edit: admin.settings.edit, rollback: superadmin.rollback }
storage_binding: sqlite://system_settings_revisions
consumer_bindings:
  - { component: AdminSystemSettings.tsx, tab: revisions, field: revision_list }
  - { endpoint: /api/system/settings/rollback, handler: handleRollbackSystemSettings }
constraints: { retention_items: 25, atomic_transaction: true }
release_mode: forward_and_rollback
fallback: last_active_snapshot
recovery_mode: 1_click_atomic_rollback
verification: passed_test_local_and_build
```
