# Hosting Ready Checklist

Gunakan checklist ini tepat sebelum deploy ke hosting production.

## 1. Verifikasi Lokal

Jalankan:

```bash
npm install
npm run check:prod
```

Hasil yang diharapkan:

- `typecheck` pass
- `lint` pass
- `build` pass

## 2. Siapkan Supabase Production

Ikuti urutan file di [SUPABASE_MIGRATION_ORDER.md](./SUPABASE_MIGRATION_ORDER.md).

Setelah selesai, cek:

- tabel `pages` ada
- tabel `audit_logs` ada
- kolom `users_meta.is_banned` ada
- policy hardening terbaru sudah aktif

## 3. Siapkan Environment Variable di Vercel

Copy isi dari [VERCEL_ENV_TEMPLATE.txt](./VERCEL_ENV_TEMPLATE.txt).

Wajib terisi:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_EMAIL`

Opsional:

- `CAREERJET_API_KEY`
- `JOOBLE_API_KEY`
- `RAPIDAPI_KEY`

## 4. Konfigurasi Project di Vercel

Saat import repository:

- Framework Preset: `Vite`
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

`vercel.json` sudah ada untuk SPA rewrite.

## 5. Deploy

Klik `Deploy`.

Setelah build selesai, buka domain preview/production lalu cek:

- `/`
- `/seeker/browse`
- `/login`
- `/admin/dashboard`
- `/admin/editor`

## 6. Smoke Test Setelah Deploy

Lakukan minimal:

1. Login dengan akun seeker.
2. Buka halaman browse lowongan.
3. Login dengan akun employer.
4. Ubah status lamaran kandidat.
5. Pastikan notifikasi kandidat masuk.
6. Login admin.
7. Pastikan audit log muncul.
8. Buka editor homepage dan publish perubahan kecil.
9. Refresh homepage dan pastikan perubahan tampil.

## 7. Go-Live Gate

Anggap aman go-live hanya jika semua ini benar:

- `npm run check:prod` pass
- migration Supabase selesai
- env Vercel lengkap
- route admin dan API serverless bekerja
- smoke test berhasil

## 8. Jika Deploy Gagal

Urutan cek tercepat:

1. env Vercel belum lengkap
2. migration Supabase belum dijalankan
3. `DEFAULT_ADMIN_EMAIL` dan `VITE_DEFAULT_ADMIN_EMAIL` tidak sama
4. `SUPABASE_SERVICE_ROLE_KEY` salah
5. route `/api/*` gagal karena env server belum tersedia
