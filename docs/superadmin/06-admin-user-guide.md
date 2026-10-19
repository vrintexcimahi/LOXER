# 06 — Admin User Guide: LOXER Universal Super Admin OS

Panduan operasional harian untuk Administrator dan Super Administrator platform LOXER.

---

## 1. Mengakses Super Admin OS

1. **Jalur Utama:**
   - Masuk ke `https://loxer.web.id/admin-login`.
   - Gunakan kredensial resmi administrator (`admin@loxer.id`).
2. **Easter Egg Developer Trigger:**
   - Pada halaman utama, ketuk Logo LOXER sebanyak 5 kali secara berurutan.
   - Modal autentikasi rahasia akan terbuka untuk verifikasi God Mode.
3. **Penyimpanan Sesi:**
   - Status sesi tersimpan secara aman dalam token JWT dan session storage terproteksi.

---

## 2. Navigasi Sidebar 4-Tier

| Kelompok Menu | Modul | Fungsi Utama |
|---|---|---|
| **Core Admin** | Dashboard Admin | Ringkasan metrik 360°, statistik harian, grafik pendaftaran. |
| | Manajemen Users | Verifikasi akun, monitor perangkat login, revoke sesi, ubah role. |
| | Pelamar | Pantau CV terkirim, status lamaran, dan unduh rekap pelamar. |
| | Perusahaan | Audit kelayakan profil perusahaan dan keaslian lowongan kerja. |
| | Manajemen Jasa | Moderasi layanan mandiri/panggilan (bengkel, pertukangan, dsb). |
| | Child Panel Mitra | Setup cabang digital mitra, pantau saldo komisi dan custom domain. |
| **Konten & Brand** | Brand & Desain Studio | Ganti logo, favicon, tema warna, BGM, dan identitas perusahaan. |
| | Moderasi Konten | Persetujuan posting loker & CV hasil scraping AI Facebook. |
| | Broadcast Sistem | Kirim pengumuman global, alert banner, dan notifikasi in-app. |
| **Platform & Keamanan** | Analitik 360° | Corong konversi (funnel), retensi pengunjung, dan demografi lokasi. |
| | Feature Flags | Aktifkan/nonaktifkan modul fitur secara real-time (kill-switch). |
| | Integrasi API | Status koneksi API eksternal (Careerjet, Facebook AI, dsb). |
| | Pusat Keamanan | Pantau upaya brute-force, riwayat IP mencurigakan, dan RBAC. |
| **System Tools** | Log & Monitoring | Live tail log sistem, filter error, dan jejak audit administrator. |
| | Backup Database | Cadangkan database SQLite seketika, kirim arsip ke Telegram bot. |
| | Developer Mode | Simulator multi-device (Android & Desktop) untuk pengujian UI. |

---

## 3. Prosedur Perubahan Brand & Desain Studio

1. Buka menu **Brand & Desain Studio** (`/admin/settings`).
2. Pilih tab:
   - **Tema Warna:** Terapkan preset warna (Ocean Azure, Cyan Neon, dsb) atau sesuaikan HEX code.
   - **Aset Media:** Unggah logo baru (PNG/SVG) atau pilih dari pustaka bawaan.
   - **Identitas Umum:** Perbarui nama platform, tagline, dan kontak legal.
3. Klik tombol **Simpan Konfigurasi**. Perubahan langsung tersimpan ke database dan terdistribusi ke seluruh antarmuka publik.
