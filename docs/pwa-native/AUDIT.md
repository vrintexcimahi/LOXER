# Audit PWA dan Kesiapan Native LOXER

**Tanggal Audit:** 25 September 2026  
**Target Proyek:** LOXER (Platform Rekrutmen Indonesia)  
**Root Proyek:** `c:\Users\SERVER PC\Pictures\LOXER-main`  
**Mode Eksekusi:** `implement`  
**Target Distribusi:** `pwa_only` (dengan kesiapan native wrapper opsional)  
**Status Evaluasi:** COMPLETE (Audit Terverifikasi dari Bukti Repository)

---

## 1. Ringkasan Eksekutif & Stack Repository

| Parameter | Temuan Nyata di Repository | Status Bukti |
| :--- | :--- | :--- |
| **Framework & UI** | React 18.3.1 + TypeScript 5.5 + Tailwind CSS 3.4 + Lucide React | Observed (`package.json`) |
| **Bundler & Dev Server** | Vite 5.4.2 (port 3035 / host 0.0.0.0) | Observed (`vite.config.ts`) |
| **Model Rendering** | Single Page Application (Client-Side CSR) dengan Vite Plugins | Observed (`src/App.tsx`, `index.html`) |
| **State & Auth** | Context API (`AuthContext.tsx`, `DeviceContext.tsx`) + Supabase JS Client + Local API Auth Handler | Observed (`src/contexts/`) |
| **Database & API** | Dual Backend: SQLite lokal via Vite plugin dev server (`server/localDb.js`) + Supabase PostgreSQL untuk cloud | Observed (`server/`, `data/schema.sql`) |
| **Package Manager** | npm (menggunakan lockfile `package-lock.json`) | Observed |
| **Aset Branding PWA** | Ikon maskable dan standar lengkap: 32px, 48px, 64px, 96px, 128px, 192px, 256px, 500px, 512px di `/public/branding/` | Observed (`public/branding/`) |
| **Manifest Web** | `public/site.webmanifest` sudah ada dengan display standalone & theme color `#0284c7` | Observed (`public/site.webmanifest`) |
| **Service Worker** | `public/sw.js` dan `src/registerSW.ts` ada tetapi dinonaktifkan secara agresif pada script inline `index.html` | Observed (`index.html:L39-L57`) |

---

## 2. Matriks Role × Platform × Alur Kritis

| Role Pengguna | Platform Target | Alur Kritis Bisnis | Kebutuhan Offline / PWA | Status Eksisting |
| :--- | :--- | :--- | :--- | :--- |
| **Pencari Kerja (Seeker)** | Mobile Browser & Installed PWA | 1. Cari lowongan (`/browse`)<br>2. Lihat detail lowongan<br>3. Lamar kerja 1-klik<br>4. Pantau status lamaran | - Cache App Shell<br>- Antrean lamaran offline (queued write)<br>- Indikator online/offline<br>- Notifikasi status lamaran | **Parsial**: Antrean offline di `offlineSyncService.ts` ada, tetapi SW dinonaktifkan di `index.html`. Mobile bottom nav di `SeekerLayout` sudah ada. |
| **Freelancer / Jasa** | Mobile Browser & PWA | 1. Publikasikan profil ke marketplace (`/seeker/marketplace`)<br>2. Cari proyek freelance | - Draft lokal penawaran jasa<br>- Mobile bottom nav khusus freelancer | **Tersedia**: Mobile nav terintegrasi dengan aksi pusat (center elevated action). |
| **Perusahaan (Employer/HRD)** | Desktop Web & Tablet/Mobile | 1. Pasang lowongan baru (`/employer/jobs/new`)<br>2. Review pelamar (`/employer/applicants`)<br>3. Cari talent (`/employer/talents`) | - Desktop tetap desktop<br>- Mobile layout adaptif (bottom nav)<br>- Form validasi & input ergonomis | **Tersedia**: `EmployerLayout` memiliki desktop sidebar dan mobile bottom navigation bar. |
| **Admin / God Mode** | Desktop Web & Mobile | 1. Monitoring sistem, audit log, user management<br>2. Toggle feature flags & backup DB | - Desktop God Mode sidebar<br>- Mobile simplified bottom nav + drawer | **Tersedia**: `GodModeLayout` mendukung desktop dan mobile drawer. |
| **Publik / Tamu (Visitor)** | Mobile Browser & PWA | 1. Halaman utama (`/`)<br>2. Jelajah lowongan (`/browse`)<br>3. Modal Login & Register | - App-like top app bar & bottom navigation<br>- Bottom sheet dialogs<br>- Tombol pasang PWA (A2HS) | **Perlu Peningkatan**: Halaman publik belum memiliki mobile bottom navigation bar persisten seperti layaknya aplikasi mobile native. |

---

## 3. Temuan Gap & Kerentanan PWA / Mobile

### Gap 1: Blokir Agresif Service Worker di `index.html` (Severity: High)
* **Temuan:** Pada `index.html` baris 39–57 terdapat script inline:
  ```javascript
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    for (var i = 0; i < regs.length; i++) regs[i].unregister();
  });
  caches.keys().then(function(keys) {
    for (var i = 0; i < keys.length; i++) caches.delete(keys[i]);
  });
  ```
* **Dampak:** Service Worker secara aktif dihapus dan seluruh cache browser dibersihkan di setiap reload halaman. Akibatnya, PWA tidak pernah bisa berjalan offline dan instalasi PWA gagal mempertahankan state cache.
* **Tindakan:** Hapus script pembersih paksa tersebut. Pindahkan logika pemeliharaan cache yang aman ke Service Worker dan `src/registerSW.ts`.

### Gap 2: Siklus Pembaruan PWA Tanpa Gangguan (Severity: Medium)
* **Temuan:** Saat ada rilis baru, Service Worker lama langsung digantikan tanpa memberi kesempatan pengguna menyelesaikan form/lamaran yang sedang diisi.
* **Dampak:** Potensi kehilangan draft input jika halaman ter-reload tiba-tiba.
* **Tindakan:** Tambahkan UI toast/banner notifikasi update ("Versi baru LOXER tersedia — Muat ulang") yang dapat diklik pengguna saat siap (`SKIP_WAITING`).

### Gap 3: Pengalaman Navigasi Mobile Pengunjung Publik (Severity: Medium)
* **Temuan:** Pada halaman publik (`Homepage`, `/browse`, `/talents`), pengguna mobile hanya disuguhi navbar desktop dengan hamburger menu. Belum ada Bottom Navigation Bar yang persisten untuk alur umum (Home, Cari Kerja, Cari Talent, Masuk).
* **Dampak:** Terasa seperti website desktop biasa ketimbang aplikasi mobile app-like.
* **Tindakan:** Sediakan `PublicMobileBottomNav` yang muncul khusus pada viewport mobile saat berada di halaman publik tanpa menabrak layout Seeker/Employer/Admin.

### Gap 4: Dialog & Modal pada Layar Kecil (Severity: Low-Medium)
* **Temuan:** `JobDetailModal` dan `TalentDetailModal` menggunakan modal kotak terpusat (`items-center justify-center p-4`).
* **Dampak:** Pada smartphone layar panjang, modal terpusat canggung disentuh dengan satu tangan (ergonomi jempol).
* **Tindakan:** Sesuaikan modal menjadi Bottom Sheet modern pada mobile (`items-end sm:items-center`, `rounded-t-3xl sm:rounded-3xl`, drag handle visual, sticky CTA).

### Gap 5: Indikator Offline & Feedback Sinkronisasi (Severity: Medium)
* **Temuan:** Antrean offline lamaran di `src/lib/offlineSyncService.ts` sudah mengisolasi data per `seeker_id`, tetapi belum ada banner indikator visual universal saat koneksi putus atau tersambung kembali.
* **Dampak:** Pengguna tidak mengetahui apakah aplikasi sedang berjalan offline atau online.
* **Tindakan:** Tambahkan komponen `OfflineIndicator` yang memberikan feedback visual real-time dan notifikasi jumlah antrean yang tersinkronisasi.

---

## 4. Kesimpulan Audit Baseline

LOXER memiliki fondasi aset PWA yang sangat baik (manifest, multi-size icons, background dark mode, offline sync service queue). Dengan menghilangkan blokir inline di `index.html`, mengoptimalkan Service Worker, memasang indikator offline, serta menerapkan Mobile App Shell (Top App Bar + Bottom Navigation + Bottom Sheets) sesuai panduan `mobile-web-pwa-navigasi-interaksi.md`, aplikasi LOXER akan memenuhi 100% kriteria **Mobile App-Like PWA**.
