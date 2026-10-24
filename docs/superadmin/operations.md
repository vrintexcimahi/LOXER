# LOXER Universal Super Admin OS v5.0 — Operations & Deployment Guide

**Date:** 25 Oktober 2026  
**Standards:** Universal Super Admin OS — Master Prompt v5.0  
**Scope:** Admin Guide, Deployment SOP, 1-Click Rollback SOP, Backup & Maintenance

---

## 1. Panduan Admin: Mengelola Pengaturan Sistem & Rollback

### 1.1 Navigasi ke Pusat Kendali Pengaturan
1. Login sebagai Administrator melalui rute `/login` atau `/admin/internal-login`.
2. Dari sidebar kiri Super Admin, pilih menu **"Pengaturan Sistem"** (`/admin/settings`).
3. Tersedia 6 tab navigasi:
   - **Tab 1: Tema & Tampilan** (Warna primer/sekunder, dark/light default, tipografi).
   - **Tab 2: Brand & Identitas** (Nama aplikasi, tagline, logo header, favicon, OG image).
   - **Tab 3: Audio & Musik Latar** (Audio welcome, BGM URL, volume).
   - **Tab 4: Video Background** (Video URL, opacity, loop).
   - **Tab 5: Konfigurasi Umum** (Email kontak, nomor WA CS, link medsos).
   - **Tab 6: Riwayat & Rollback (v5.0)** (Daftar snapshot historis & pemulihan 1-klik).

### 1.2 Menyimpan Perubahan & Pembuatan Snapshot Otomatis
- Setiap kali tombol **"Simpan Semua Pengaturan"** diklik:
  1. Backend secara otomatis mengambil konfigurasi aktif saat ini dan mengarsipkannya ke dalam tabel `system_settings_revisions`.
  2. Konfigurasi baru disimpan ke tabel `system_settings` dan langsung disisipkan sebagai revision snapshot aktif baru.
  3. Perubahan tercatat dalam `audit_logs` bersama identitas admin yang sedang login.

### 1.3 Melakukan 1-Click Rollback
1. Buka **Tab 6: Riwayat & Rollback (v5.0)**.
2. Temukan versi snapshot yang ingin dipulihkan dari daftar kartu riwayat.
3. Klik tombol **"Rollback ke Versi Ini"**.
4. Dialog konfirmasi akan muncul. Klik **"Ya, Rollback Sekarang"**.
5. Backend akan memulihkan data konfigurasi secara atomik dan form pengaturan akan terisi ulang dengan data historis seketika tanpa downtime.

---

## 2. Standard Operating Procedure (SOP) Deployment ke Production

### 2.1 Spesifikasi Server Produksi
- **Host:** `samsung-server` (`192.168.1.14`)
- **Port:** `:3035`
- **Direktori Aplikasi:** `/home/vrintex/loxer`
- **PM2 Process Name:** `loxer` (ID: 13)

### 2.2 Prosedur Rilis Standar (Zero-Downtime)
1. **Verifikasi Lokal:**
   ```powershell
   npm run typecheck
   npm run test:local
   npm run build
   ```
2. **Commit & Push ke GitHub:**
   ```powershell
   git add .
   git commit -m "feat(admin): deploy update Universal Super Admin OS v5.0"
   git push origin main
   ```
3. **Eksekusi Rilis di Server Produksi:**
   ```bash
   ssh samsung-server "cd /home/vrintex/loxer && git pull origin main && npm run build && pm2 reload loxer --update-env"
   ```
4. **Verifikasi Layanan Aktif:**
   ```bash
   curl -I http://192.168.1.14:3035/admin/settings
   ```

---

## 3. Disaster Recovery & Database Backup

### 3.1 Backup Manual Database SQLite
Database utama berada di `data/loxer.db` (menggunakan mode Write-Ahead Logging / WAL).
Untuk membuat snapshot cadangan manual di server:
```bash
sqlite3 data/loxer.db ".backup 'data/backup_$(date +%Y%m%d_%H%M%S).db'"
```

### 3.2 Pemulihan Database Darurat
Bila file database mengalami kerusakan (corruption):
```bash
pm2 stop loxer
cp data/backup_terbaru.db data/loxer.db
pm2 start loxer
```
