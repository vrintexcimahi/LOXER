# Rencana Arsitektur PWA & Mobile Web Experience LOXER

**Tanggal:** 25 September 2026  
**Status:** IMPLEMENTATION PHASE  
**Target:** PWA Universal + Mobile Web App-Like (Android & iOS)

---

## 1. Keputusan Arsitektur

| Aspek | Pendekatan Terpilih | Alasan & Analisis Alternatif |
| :--- | :--- | :--- |
| **Model Distribusi** | **PWA Universal (Installable)** | PWA memenuhi seluruh kebutuhan bisnis (offline queue, add-to-home-screen, push notifications, responsive app-shell) tanpa biaya overhead memelihara codebase native ganda (Kotlin/Swift/Flutter). |
| **Distribusi Native** | **Opsional / Ready for Capacitor** | Struktur bundel web (`dist/`) tetap dipelihara bersih agar kapan pun dibutuhkan, `npx cap add android` dapat langsung disematkan tanpa memodifikasi business logic web. |
| **Pemisahan Desktop & Mobile** | **Adaptive Shared Codebase** | Prinsip: *Desktop tetap desktop, Mobile memiliki pengalaman UI tersendiri yang terasa seperti aplikasi native*. Tidak menduplikasi logic; gunakan styling adaptif, bottom nav, dan responsive shell. |
| **Strategi Caching** | **Multi-tier Caching Contract** | 1. App Shell & Static: Precache + Cache-First.<br>2. SPA Navigation: Network-First dengan fallback ke `/index.html`.<br>3. API Live Data: Network-First (tidak meng-cache sembarangan data privat/auth). |
| **Offline Mutation** | **Durable Queued Writes + User Isolation** | Lamaran kerja offline disimpan di `localStorage` dengan key terisolasi (`seeker_id`), idempotency key (`jobId`), dan auto-sync saat event `online` dipicu. |
| **Siklus Pembaruan** | **Non-intrusive Update Prompt** | Mendeteksi worker baru melalui `onupdatefound`. Menampilkan banner pembaruan interaktif daripada reload mendadak di tengah form atau alur pembayaran. |

---

## 2. Kontrak Caching & Offline per Alur

| Alur / Data | Klasifikasi Alur | Sumber Otoritatif | Perilaku Saat Offline | Penanganan Konflik & Sync |
| :--- | :--- | :--- | :--- | :--- |
| **App Shell (HTML, CSS, JS, Ikon)** | Cache Read | Service Worker Cache (`loxer-pwa-v1`) | Tetap tampil seketika dari cache; fallback ke `/index.html` untuk route SPA apapun. | Diperbarui di background saat online; user diberi notifikasi update. |
| **Katalog Lowongan (`/browse`)** | Stale-while-revalidate | Backend API (SQLite / Supabase) | Menampilkan lowongan yang sempat dibuka/tersimpan di memori client; menampilkan status offline jika baru dicari. | Baca saja; tidak ada mutasi konflik. |
| **Kirim Lamaran Kerja** | Queued Write | Database Server (`applications` table) | **Disimpan ke Antrean Offline Lokal** dengan status `pending`. User mendapat konfirmasi instan "Lamaran Disimpan di Antrean Offline". | Idempotent (1 user tidak bisa submit 2x untuk job sama). Saat koneksi pulih, disinkronkan otomatis. |
| **Autentikasi & Profil Akun** | Online-Only (dengan cached session) | Auth Authority (Supabase / Local API) | Sesi aktif tetap tersimpan di storage lokal. Aksi login/logout baru membutuhkan koneksi internet dan menolak secara jelas jika offline. | Token kedaluwarsa memicu prompt login saat online. |

---

## 3. Rencana Bertahap (Phased Execution)

### Fase 0 — Audit & Identifikasi (SELESAI)
- Memeriksa dependencies, package.json, `index.html`, `public/sw.js`, `src/registerSW.ts`.
- Mendokumentasikan temuan di `docs/pwa-native/AUDIT.md`.

### Fase 1 — Perbaikan Fondasi Service Worker & Manifest
- Hapus script nuke-cache dari `index.html`.
- Sempurnakan `public/sw.js` agar mendukung SPA navigation fallback dan cache-first untuk aset statis ber-hash.
- Sempurnakan `src/registerSW.ts` untuk mendeteksi pembaruan dan memancarkan event `loxer:pwa-update-available`.

### Fase 2 — Komponen PWA: Update Notification & Offline Indicator
- Buat komponen `PwaUpdateNotification.tsx` (tampil saat versi baru terdeteksi, ada tombol "Perbarui Sekarang").
- Buat komponen `OfflineIndicator.tsx` (banner non-intrusive saat koneksi putus dan konfirmasi saat sinkronisasi sukses).
- Hubungkan dengan `offlineSyncService.ts`.

### Fase 3 — Mobile Web App Shell & Ergonomi Sentuh
- Buat `PublicMobileBottomNav.tsx` untuk navigasi mobile di halaman publik (`/`, `/browse`, `/talents`).
- Optimalkan `JobDetailModal.tsx` dan `TalentDetailModal.tsx` dengan perilaku Bottom Sheet pada mobile (drag handle, rounded top, full thumb accessibility).
- Pastikan semua touch targets memiliki ukuran minimal 44px × 44px dan padding safe area `env(safe-area-inset-bottom)`.

### Fase 4 — Verifikasi & Pengujian Regresi
- Validasi TypeScript (`npm run typecheck`).
- Validasi Build (`npm run build`).
- Uji alur antrean offline dan simulasi reconnect.
- Lengkapi `CAPABILITIES.md`, `PROGRESS.md`, `VERIFICATION.md`, dan `BUILD_RELEASE.md`.

---

## 4. Rencana Rollback

Jika terjadi kendala pada Service Worker:
1. Versi Service Worker dinaikkan (`loxer-pwa-v2`) atau disediakan pesan `UNREGISTER_ALL` jika diperlukan darurat.
2. Draft antrean offline disimpan terpisah di `localStorage` sehingga tidak hilang saat cache browser di-clear.
3. Seluruh perubahan UI bersifat murni CSS responsive dan komponen adaptif, tidak mengubah skema database server.
