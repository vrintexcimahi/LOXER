# LOXER

Platform rekrutmen berbasis `Vite + React + Supabase` dengan area `seeker`, `employer`, `admin`, editor homepage visual, dan API serverless untuk operasi yang sensitif.

## Jalankan Lokal

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari `.env.example`.

3. Isi minimal:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Jalankan dev server:

```bash
npm run dev:live
```

Alternatif localhost-only:

```bash
npm run dev
```

Preview hasil build:

```bash
npm run build
npm run preview:live
```

## Quality Gates

```bash
npm run typecheck
npm run lint
npm run build
```

Status repo saat ini:

- `typecheck`: pass
- `lint`: pass tanpa error
- `build`: pass

## Child Panel Mitra (pilot)

Fondasi Master–Child tersedia di `docs/PROMPT_MASTER_CHILD_TECHNICAL.md`, dengan migration cloud `supabase/migrations/20261004000000_partner_tenant_foundation.sql` dan route `/api/partner-platform/*`. Fitur ini tetap mati sampai migration diterapkan, secret sesi lokal disiapkan, dan pengujian isolasi tenant selesai.

Untuk pilot lokal, tambahkan pada `.env`:

```text
PARTNER_CHILD_PANEL_ENABLED=true
APP_BASE_DOMAIN=localhost
APP_PUBLIC_ORIGIN=http://localhost:3035
JWT_SECRET=<random-minimal-32-karakter>
PARTNER_MASTER_USER_IDS=<id-akun-admin-yang-ditunjuk>
```

Setelah login sebagai administrator master, buka `/admin/partners` untuk membuat dan mengaktifkan Child. Fallback URL Child adalah `/p/<slug>`, sementara subdomain memerlukan wildcard DNS/proxy yang diarahkan ke aplikasi.

Untuk panduan deployment ke Linux VPS via Git Pull GitHub, lihat dokumentasi lengkap di [DEPLOYMENT.md](./DEPLOYMENT.md).

Endpoint production legacy tetap memakai path publik yang sama dan di-route melalui API middleware di `vite.config.ts` saat server dijalankan di Linux VPS (PM2). Implementasi handler tersimpan di `api-legacy/` dan tidak boleh dipanggil langsung dari browser.

## Setup Database

Jalankan migration Supabase yang ada di folder:

```bash
supabase/migrations/
```

Yang paling penting untuk production saat ini:

- `20260410065102_create_joob_schema_v1.sql`
- `20260410104000_add_pages_cms.sql`
- `20260411130000_add_admin_role_and_audit_logs.sql`
- `20260417090000_harden_production_policies.sql`

## Deploy

Dokumen deploy production ada di [DEPLOYMENT.md](./DEPLOYMENT.md).
