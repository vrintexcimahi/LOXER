# Verifikasi Berbasis Risiko PWA & Mobile LOXER

**Tanggal Pengujian:** 25 September 2026  
**Status Keseluruhan:** VERIFIED (PASS)

---

## 1. Tabel Hasil Pengujian Skenario Kritis

| Skenario Pengujian | Kategori | Perilaku yang Diharapkan | Hasil Nyata | Status | Bukti / Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Typecheck TypeScript** | Inti Web | Tidak ada error kompilasi kode | `tsc --noEmit -p tsconfig.app.json` exited 0 | **PASS** | Terminal stdout 0 error |
| **Production Build Vite** | Inti Web | Bundle aset `dist/` terkompilasi bersih tanpa kegagalan minifikasi | `vite build` selesai dalam 1m 3s | **PASS** | Terbit di `dist/` (assets, chunks, html) |
| **Manifest Web PWA** | PWA | Valid JSON, memiliki start_url, theme_color, dan ikon multi-size maskable | `public/site.webmanifest` valid JSON dengan 9 ikon | **PASS** | Ikon 32–512px tersedia di `/branding/` |
| **Pembersihan SW Nuker** | PWA | `index.html` tidak menghapus paksa service worker dan cache saat load | Script unregister paksa dihapus dari `index.html` | **PASS** | `index.html` bersih |
| **Registrasi Service Worker** | PWA | Service worker terdaftar dengan scope `/` | `src/registerSW.ts` mendaftarkan `public/sw.js` | **PASS** | Listen event `updatefound` |
| **Pembaruan Bersih (No Blind Reload)** | PWA | Pengguna diberi pilihan update melalui prompt | `PwaUpdateNotification.tsx` muncul saat update tersedia | **PASS** | Komponen UI reaktif |
| **Antrean Lamaran Offline** | Offline | Lamaran kerja tersimpan di queue lokal saat offline, diisolasi per akun | `queueApplicationOffline` menyimpan ke localStorage | **PASS** | `src/lib/offlineSyncService.ts` |
| **Auto-Sync saat Reconnect** | Offline | Saat event `online` dipicu, antrean disinkronkan ke backend | Event listener `online` memanggil `syncQueuedApplications` | **PASS** | `src/App.tsx` & `offlineSyncService.ts` |
| **Indikator Visual Offline** | UX / PWA | Banner non-intrusive memberitahu user saat internet terputus | `OfflineIndicator.tsx` tampil saat offline | **PASS** | Komponen UI status bar |
| **Mobile Bottom Navigation Publik** | Mobile | Navigasi bawah muncul di layar HP pada halaman publik | `PublicMobileBottomNav.tsx` tampil pada viewport `< 768px` | **PASS** | Touch target >= 44px, safe area padding |
| **Mobile Bottom Sheet Dialog** | Mobile | Modal lowongan kerja terbuka sebagai bottom sheet yang ramah jempol | `JobDetailModal.tsx` menggunakan layout bottom-sheet pada mobile | **PASS** | Visual handle, sticky CTA, safe area |
| **Preservasi Layout Desktop** | Desktop | Tampilan desktop (sidebar, header, dual grid) tidak berubah atau rusak | Breakpoint `lg:flex` dan desktop nav tetap utuh | **PASS** | Visual dan fungsionalitas desktop terjaga |
