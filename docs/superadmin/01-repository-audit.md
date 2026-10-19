# 01 — Repository Audit: LOXER Universal Super Admin OS

**Project Name:** LOXER (Platform Rekrutmen & Bursa Talenta Indonesia)  
**Host Target:** `samsung-server` (Linux 192.168.1.14 / Client Win 192.168.1.3)  
**Production URL:** `https://loxer.web.id/`  
**Internal Port:** `3035` (Reverse proxy via Caddy :80 -> :3035)  
**Date of Audit:** Oktober 2026  

---

## 1. Stack & Architecture Inventory

| Layer | Technology | Current State / Notes |
|---|---|---|
| **Frontend Framework** | React 18.3.1 + TypeScript 5.5.3 + Vite 5.4.21 | Single Page Application (SPA) with lazy-loaded routes and split vendor chunks (`vendor-core`, `vendor-react`, `vendor-charts`). |
| **Styling & Design System** | Tailwind CSS 3.4.1 + CSS Variables (`clay-theme.css`, `glass-theme.css`, `compact-theme.css`, `index.css`) | Dual-theme (Light & Dark) with live class synchronization on `document.documentElement`. Support for PWA and desktop preview. |
| **Icons & Visual Media** | Lucide React 0.344.0 + Custom SVGs | Centralized icon imports, standard responsive sizing, custom clay icon styling. |
| **Backend & Runtime** | Node.js Express / Local API Server (`server/localApiHandler.js`, `server/localDb.js`) | Node native runtime handling REST APIs under `/api/*`, JWT verification, file upload storage, and SQLite transaction handling. |
| **Database** | SQLite 3 (`data/loxer.db` with WAL mode & busy_timeout=5000) + Supabase Client (`@supabase/supabase-js 2.57.4`) | Dual hybrid support: full local operation via SQLite WAL and optional cloud sync via Supabase. |
| **PWA & Mobile App** | Service Worker (`public/sw.js`), Web Manifest (`public/site.webmanifest`), Android WebAPK (`public/loxer.apk`, `public/loxer-admin.apk`) | Network-first with cache fallback, standalone PWA display mode, dual store install prompt. |
| **Process Manager** | PM2 (`ecosystem.config.cjs`, process name: `loxer`, ID: 3) | Managed daemon on `samsung-server` with `pm2 save` autostart. |
| **Reverse Proxy & Security** | Caddy v2 (`/home/vrintex/Caddyfile`) + Cloudflare DNS/Tunnel | Automatic HTTPS, strict origin policies, rate limiting, and zero-leak headers. |

---

## 2. Admin & Control Plane Coverage

| Module | Route Path | Implementation File | Status |
|---|---|---|---|
| Executive Dashboard | `/admin/dashboard` | `src/pages/admin/AdminDashboard.tsx` | **Implemented & Live** |
| Users & Device Center | `/admin/users`, `/admin/devices` | `src/pages/admin/AdminUserDataCenter.tsx` | **Implemented & Live** |
| Applicants Directory | `/admin/applications` | `src/pages/admin/Applicants.tsx` | **Implemented & Live** |
| Companies Verification | `/admin/companies` | `src/pages/admin/AdminDashboard.tsx` (tab) | **Implemented & Live** |
| Freelancer / Jasa Management | `/admin/jasa` | `src/pages/admin/AdminJasa.tsx` | **Implemented & Live** |
| Child Panel Mitra | `/admin/partners` | `src/pages/admin/AdminPartners.tsx` | **Implemented & Live** |
| Brand & Theme Studio | `/admin/settings` | `src/pages/admin/AdminSystemSettings.tsx` | **Implemented & Live** |
| Content Moderation Queue | `/admin/moderation` | `src/pages/admin/ModerationQueue.tsx` | **Implemented & Live** |
| Broadcast & Alerts | `/admin/broadcast` | `src/pages/admin/BroadcastSystem.tsx` | **Implemented & Live** |
| 360° Advanced Analytics | `/admin/analytics` | `src/pages/admin/AdvancedAnalytics.tsx` | **Implemented & Live** |
| Feature Flags & Remote Config | `/admin/flags` | `src/pages/admin/FeatureFlags.tsx` | **Implemented & Live** |
| External API Integrations | `/admin/integrations` | `src/pages/admin/AdminDashboard.tsx` (tab) | **Implemented & Live** |
| Security Center & RBAC | `/admin/security` | `src/pages/admin/SecurityCenter.tsx` | **Implemented & Live** |
| Log & Realtime Monitoring | `/admin/monitoring` | `src/pages/admin/LogMonitoring.tsx` | **Implemented & Live** |
| Database Snapshot Backup | `/admin/backup` | `src/pages/admin/DatabaseBackup.tsx` | **Implemented & Live** |
| Developer Workbench | `/admin/dev-workbench` | `src/pages/admin/DeveloperWorkbench.tsx` | **Implemented & Live** |

---

## 3. Findings & Safety Boundaries

1. **No Password Exposure**: Password hashing is conducted strictly via one-way algorithms; plaintext passwords and raw hashes are never exposed via UI or API.
2. **Persistence Guarantee**: Settings changes in `AdminSystemSettings` write directly to `data/loxer.db` (and localStorage fallback for zero-latency client hydration).
3. **Multi-Tenant Boundary**: Partner / Child Panel tenants are isolated by `partner_id` in database queries and cannot access platform superadmin operations.
