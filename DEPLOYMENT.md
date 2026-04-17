# Deployment Guide

## Rekomendasi Hosting

Gunakan `Vercel`.

Alasannya:

- frontend Vite SPA sudah cocok
- folder `api/` sudah disiapkan untuk serverless function
- rewrite SPA sudah disediakan lewat `vercel.json`

## Checklist Sebelum Deploy

1. Pastikan command berikut lolos:

```bash
npm run typecheck
npm run lint
npm run build
```

2. Jalankan semua migration Supabase.

Minimal pastikan migration berikut sudah ter-apply:

- `20260410065102_create_joob_schema_v1.sql`
- `20260410104000_add_pages_cms.sql`
- `20260411130000_add_admin_role_and_audit_logs.sql`
- `20260417090000_harden_production_policies.sql`

3. Siapkan environment variable di hosting.

## Environment Variables

Wajib:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_EMAIL`

Opsional:

- `CAREERJET_API_KEY`
- `JOOBLE_API_KEY`
- `RAPIDAPI_KEY`

Rekomendasi:

- isi `VITE_DEFAULT_ADMIN_EMAIL` dan `DEFAULT_ADMIN_EMAIL` dengan email yang sama
- gunakan template siap-copy dari [VERCEL_ENV_TEMPLATE.txt](./VERCEL_ENV_TEMPLATE.txt)

## Urutan Migration Supabase

Gunakan urutan yang sudah disiapkan di [SUPABASE_MIGRATION_ORDER.md](./SUPABASE_MIGRATION_ORDER.md).

## Langkah Deploy ke Vercel

1. Import repository ini ke Vercel.
2. Framework preset: `Vite`.
3. Tambahkan semua environment variable di Project Settings.
4. Deploy.

File `vercel.json` sudah menangani rewrite SPA agar route seperti:

- `/seeker/browse`
- `/employer/dashboard`
- `/admin/dashboard`

tetap bisa dibuka langsung.

## Endpoint Production yang Wajib Tersedia

Route berikut sudah disiapkan di folder `api/`:

- `/api/jobs`
- `/api/integrations-status`
- `/api/application-status-notification`
- `/api/admin-audit-log`
- `/api/admin/users`
- `/api/admin/ensure-default-admin`

## Catatan Penting Production

- `SUPABASE_SERVICE_ROLE_KEY` hanya untuk serverless/backend, jangan pernah expose ke client.
- Homepage publik sudah dipisah dari runtime editor, jadi payload public lebih ringan.
- Notifikasi status lamaran dan audit log sudah dipindahkan ke server-side.
- Policy database yang baru harus aktif sebelum go-live agar akses data seeker tetap aman.

## Verifikasi Setelah Deploy

1. Buka `/`
2. Buka `/seeker/browse`
3. Login admin lalu buka `/admin/dashboard`
4. Buka `/admin/editor`
5. Uji update status pelamar di dashboard employer
6. Pastikan audit log masuk
7. Pastikan notifikasi pelamar masuk

## Risiko Yang Masih Perlu Dipantau

- chunk `vendor-charts` masih besar karena `recharts`
- chunk `vendor-puck` besar, tapi sekarang hanya relevan untuk editor admin
- observability production seperti error tracking dan alerting belum ditambahkan
