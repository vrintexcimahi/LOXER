# Matriks Kapabilitas Perangkat & PWA LOXER

**Tanggal:** 25 September 2026  
**Status Evaluasi:** PASS & VERIFIED STATIC

---

## Matriks Fitur & Kapabilitas

| Fitur | Kebutuhan Bisnis | Browser / PWA Target | Android / iOS Target | Adapter / Implementasi | Permission | Fallback | Status & Bukti |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Instalasi PWA (A2HS)** | Pengguna dapat memasang LOXER ke home screen | Chrome, Edge, Safari (iOS 16.4+), Samsung Internet | Standalone App Icon | `usePWAInstall.ts` (`beforeinstallprompt` + petunjuk manual iOS) | None | Tetap berfungsi normal di browser biasa | **PASS** (`src/hooks/usePWAInstall.ts`) |
| **Offline App Shell** | Membuka LOXER saat koneksi terputus tanpa layar putih | Semua browser modern dengan Service Worker | WebView / Browser Standalone | `public/sw.js` (Cache Storage API) | None | Menampilkan halaman HTML cadangan dan data cache | **PASS** (`public/sw.js`) |
| **Antrean Lamaran Offline** | Melamar kerja saat offline tanpa kehilangan data | Semua browser dengan LocalStorage/IndexedDB | Mobile PWA & Native Ready | `offlineSyncService.ts` | None | Disimpan lokal, sinkronisasi otomatis saat online | **PASS** (`src/lib/offlineSyncService.ts`) |
| **Indikator Status Jaringan** | Memberitahu pengguna saat offline dan saat sinkronisasi | Semua perangkat | Semua perangkat | Event listener `online`/`offline` + `OfflineIndicator.tsx` | None | Status senyap jika tidak ada antrean | **PASS** (`src/components/pwa/OfflineIndicator.tsx`) |
| **Pembaruan Aman (Clean Update)** | Memberitahu update versi baru tanpa reload paksa | Service Worker Lifecycle | PWA / Browser | `registerSW.ts` (`onupdatefound`) + `PwaUpdateNotification.tsx` | None | Reload otomatis saat tab berikutnya dibuka | **PASS** (`src/registerSW.ts`) |
| **Web Push Notification** | Menerima info panggilan interview dan status lamaran | Chrome Android, Desktop, iOS 16.4+ (PWA) | Notification Center OS | Push API di `sw.js` + `NotificationBell.tsx` | `notifications` | Notifikasi in-app / email cadangan | **PASS** (`public/sw.js`, `src/hooks/useNotifications.ts`) |
| **Upload Resume & Dokumen** | Melampirkan portofolio atau foto profil | HTML5 File Input / Drag & Drop | File Picker OS / Kamera | `input[type="file"]` + `imageCompressor.ts` | `camera`/`storage` saat diakses | Kompresi otomatis di client sebelum unggah | **PASS** (`src/lib/imageCompressor.ts`) |
| **Safe Area Insets** | Menyesuaikan notch, dynamic island, dan navigation bar gesture | Safari iOS, Chrome Android dengan gesture nav | Display cutout / Gesture bar | CSS `env(safe-area-inset-top)` & `env(safe-area-inset-bottom)` | None | Margin dan padding standar | **PASS** (`src/index.css`) |
| **Haptic Feedback & Sentuhan** | Micro-interaction terasa seperti aplikasi native | Browser dengan Vibration API / CSS active | Haptic Engine OS | CSS `:active { transform: scale(0.98); }` + vibration di notification | None | Animasi CSS halus | **PASS** (`src/index.css`) |
| **Kamera & QR Scan (Opsional)** | Scan presensi atau verifikasi identitas (bila diperlukan) | WebRTC `navigator.mediaDevices` | Camera Hardware | Feature detection | `camera` | Input upload gambar manual | **READY** (Capability detection) |
| **Biometrik / Fingerprint (Opsional)** | Login instan dengan sidik jari (WebAuthn) | WebAuthn API / Credential Management | Keystore / FaceID / BiometricPrompt | Standar WebAuthn | Biometric prompt OS | Login email & password biasa | **READY** (Tersedia modul auth) |
