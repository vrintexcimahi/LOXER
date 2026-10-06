# VPS Hosting Ready Checklist

Gunakan checklist ini sebelum dan sesudah deploy update ke Linux VPS (`samsung-server`).

---

## 1. Verifikasi Lokal (Sebelum Git Push)

Jalankan di terminal lokal Windows PC:

```bash
npm install
npm run check:prod
```

Hasil yang diharapkan:
- `typecheck` pass
- `lint` pass
- `build` pass

---

## 2. Commit & Push ke GitHub

Pastikan cabang `main` sudah sinkron dengan origin GitHub:

```bash
git add .
git commit -m "Deskripsi perubahan"
git push origin main
```

---

## 3. Verifikasi Konfigurasi di VPS (`/home/vrintex/loxer/.env`)

Pastikan variabel penting pada VPS sudah terpasang:
- `VITE_USE_LOCAL_DB=true` (atau konfigurasi Supabase jika mode Cloud)
- `VITE_DEFAULT_ADMIN_EMAIL=vrintex`
- `DEFAULT_ADMIN_EMAIL=vrintex`
- `APP_PUBLIC_ORIGIN=http://192.168.1.14:3035` (atau URL domain Anda)
- `JWT_SECRET` terisi dengan string acak (minimal 32 karakter)

---

## 4. Eksekusi Deploy ke VPS

Jalankan perintah auto-deploy via SSH dari Windows:

```powershell
ssh -i "C:\Users\SERVER PC\.ssh\id_ed25519_antigravity" vrintex@192.168.1.14 "cd /home/vrintex/loxer && bash deploy.sh"
```

---

## 5. Smoke Test & Health Check

Setelah script deploy selesai, verifikasi:

1. **Koneksi HTTP Port 3035:**
   ```bash
   curl -I http://127.0.0.1:3035
   ```
2. **Status Proses PM2:**
   ```bash
   pm2 show loxer
   ```
3. **Uji Fungsional di Browser:**
   - Akses antarmuka: `http://192.168.1.14:3035/`
   - Buka halaman lowongan: `http://192.168.1.14:3035/seeker/browse`
   - Buka login & dashboard admin: `http://192.168.1.14:3035/admin/internal-login`
   - Pastikan database SQLite tidak ter-reset dan data tersimpan dengan aman.
