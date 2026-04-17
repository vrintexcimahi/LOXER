# Supabase Migration Order

Jalankan migration sesuai urutan nama file berikut:

1. `20260410065102_create_joob_schema_v1.sql`
2. `20260410104000_add_pages_cms.sql`
3. `20260411130000_add_admin_role_and_audit_logs.sql`
4. `20260417090000_harden_production_policies.sql`

## Urutan Aman di Supabase SQL Editor

1. Buka project Supabase production.
2. Jalankan file `20260410065102_create_joob_schema_v1.sql`.
3. Pastikan seluruh tabel inti berhasil dibuat.
4. Jalankan file `20260410104000_add_pages_cms.sql`.
5. Jalankan file `20260411130000_add_admin_role_and_audit_logs.sql`.
6. Jalankan file `20260417090000_harden_production_policies.sql`.

## Setelah Semua Migration Jalan

Verifikasi minimal:

- tabel `users_meta` punya kolom `is_banned`
- tabel `audit_logs` ada
- tabel `pages` ada
- policy `Admins can insert pages` / `Admins can update pages` / `Admins can delete pages` ada
- policy `Service role can insert notifications` ada

## Catatan Penting

- migration terakhir mengubah policy production agar lebih ketat
- jangan deploy ke public hosting sebelum migration terakhir selesai
- jika project Supabase lama sudah punya data, backup dulu sebelum apply migration hardening
