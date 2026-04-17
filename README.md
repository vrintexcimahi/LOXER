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

## CMS Homepage

- Editor admin: `/admin/editor`
- Homepage publik: `/`
- Fallback: jika data CMS belum ada, app akan pakai komponen `Landing`

Editor homepage sekarang khusus `admin`, bukan employer.

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
