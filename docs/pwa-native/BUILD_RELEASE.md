# Panduan Build, Rilis, dan Distribusi PWA LOXER

**Tanggal:** 25 September 2026  
**Aplikasi:** LOXER - Platform Rekrutmen Indonesia

---

## 1. Persiapan Lingkungan (Setup)

Pastikan Node.js (v18+) dan npm terinstal pada sistem.

```powershell
# Verifikasi versi node dan npm
node -v
npm -v
```

File konfigurasi lingkungan (`.env`):
Salin template dari `.env.example` jika belum ada:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 2. Command Operasional Harian

### Mode Development
Menjalankan server pengembangan lokal dengan fitur hot-reload dan local API mock handler:
```powershell
npm run dev
# Server aktif pada http://localhost:3035 (atau IP LAN untuk pengujian via smartphone)
```

### Typecheck & Linting
Memastikan keutuhan tipe TypeScript sebelum rilis:
```powershell
npm run typecheck
npm run lint
```

### Production Build
Mengompilasi aset aplikasi web menjadi bundel statis teroptimasi di folder `dist/`:
```powershell
npm run build
```

### Preview Production Build Secara Lokal
Menjalankan preview bundel `dist/` untuk menguji fungsionalitas Service Worker dan instalasi PWA:
```powershell
npm run preview
# Akses melalui http://localhost:3035
```

---

## 3. Verifikasi & Audit PWA

Untuk memverifikasi kesiapan PWA di Google Chrome / Microsoft Edge:
1. Buka `http://localhost:3035` di browser.
2. Buka DevTools (`F12`) → tab **Lighthouse**.
3. Pilih kategori **Progressive Web App** → klik **Analyze page load**.
4. Periksa checklist:
   - [x] Manifest web valid dan terdeteksi.
   - [x] Service Worker terdaftar dan mengendalikan halaman.
   - [x] Respon 200 saat offline untuk navigasi utama.
   - [x] Maskable icons dan theme color sesuai konfigurasi.
   - [x] Viewport meta tag `viewport-fit=cover` terkonfigurasi.

---

## 4. Opsi Distribusi Native Masa Depan (Capacitor / TWA)

Jika di masa mendatang tim memutuskan untuk menerbitkan aplikasi ke Google Play Store (APK/AAB):

### Opsi A: Capacitor Shell (Rekomendasi untuk Bridge Plugin)
1. Pasang Capacitor CLI:
   ```powershell
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```
2. Inisialisasi:
   ```powershell
   npx cap init "LOXER" "id.loxer.app" --web-dir dist
   ```
3. Tambahkan platform Android:
   ```powershell
   npx cap add android
   ```
4. Build web dan sinkronkan ke proyek Android:
   ```powershell
   npm run build
   npx cap sync
   ```
5. Buka Android Studio untuk build APK:
   ```powershell
   npx cap open android
   ```

### Opsi B: Trusted Web Activity (TWA / Bubblewrap)
Untuk distribusi murni web tanpa native bridge:
```powershell
npx @bubblewrap/cli init --manifest=https://loxer.id/site.webmanifest
npx @bubblewrap/cli build
```

---

## 5. Prosedur Pembaruan (Update Lifecycle)

1. Saat kode baru di-push ke server produksi, file `dist/` diperbarui.
2. Service Worker baru akan terunduh di background pada kunjungan berikutnya.
3. Komponen `PwaUpdateNotification` akan mendeteksi status `installed` dan menampilkan banner: *"Pembaruan LOXER Tersedia — Perbarui Sekarang"*.
4. Saat pengguna mengklik perbarui, Service Worker mengaktifkan versi baru (`SKIP_WAITING`) dan me-refresh halaman dengan aman tanpa mengacaukan formulir yang belum disimpan.
