# Panduan Deployment LOXER ke Linux VPS (Via Pull GitHub)

Dokumentasi ini adalah panduan resmi untuk men-deploy aplikasi **LOXER** ke server Linux VPS menggunakan alur **Git Pull dari GitHub**.

---

## 1. Informasi Server & Lingkungan

Berdasarkan konfigurasi server aktif (referensi: `akses-ssh-server.md`):

| Parameter | Konfigurasi Server |
| :--- | :--- |
| **Hostname** | `samsung-server` |
| **IP Server (LAN)** | `192.168.1.14` |
| **Port SSH** | `22` |
| **User SSH** | `vrintex` |
| **Password** | `kayaraya3+` |
| **SSH Key (Windows)** | `C:\Users\SERVER PC\.ssh\id_ed25519_antigravity` (atau default `id_ed25519`) |
| **OS** | Ubuntu 22.04 LTS |
| **Path Project di VPS** | `/home/vrintex/loxer` |
| **GitHub Repository** | `git@github.com:vrintexcimahi/LOXER.git` |
| **Port Aplikasi** | `3035` (`0.0.0.0:3035`) |
| **Process Manager** | PM2 (`pm2`) |
| **Runtime** | Node.js v22.x + NPM v10.x |

---

## 2. Arsitektur Deployment di VPS

- **Frontend & Fullstack Middleware**: Menggunakan **Vite Preview** yang membungkus antarmuka React SPA sekaligus backend API middleware (SQLite local handler, Smart CV/Job extractor, partner tenancy, otentikasi admin, dan static file downloads APK).
- **Database**: SQLite lokal persisten yang tersimpan di `/home/vrintex/loxer/data/loxer.db`.
- **Manajemen Proses**: PM2 berjalan di background dengan auto-restart dan log management.
- **Reverse Proxy**: Nginx (opsional jika diarahkan ke domain publik/subdomain) meneruskan port 80/443 ke port internal `3035`.

---

## 3. Alur Singkat: 1-Command Deploy dari Windows PC

Setelah Anda selesai melakukan perubahan kode di laptop/PC Windows:

### Langkah A: Push ke GitHub dari PC Lokal
Buka terminal PowerShell di folder project:
```powershell
git add .
git commit -m "Update fitur dan perbaikan"
git push origin main
```

### Langkah B: Trigger Deploy ke Server via SSH (1 Perintah)
Cukup jalankan satu perintah berikut langsung dari PowerShell Windows:

**Dengan SSH Key (Otomatis tanpa input password):**
```powershell
ssh -i "C:\Users\SERVER PC\.ssh\id_ed25519_antigravity" vrintex@192.168.1.14 "cd /home/vrintex/loxer && bash deploy.sh"
```

**Atau dengan Password biasa:**
```powershell
ssh vrintex@192.168.1.14 "cd /home/vrintex/loxer && bash deploy.sh"
```
*(Ketik password `kayaraya3+` saat diminta)*

Script `deploy.sh` akan otomatis:
1. Mem-backup database SQLite `data/loxer.db` ke folder `data/backups/`.
2. Melakukan `git pull origin main`.
3. Menjalankan `npm install --prefer-offline`.
4. Mengompilasi bundle produksi (`npm run build`).
5. Merestart proses PM2 `loxer`.
6. Melakukan health-check HTTP 200 di port 3035.

---

## 4. Alur Manual di VPS (Jika Menggunakan Terminal SSH Langsung)

Jika Anda sedang membuka SSH terminal ke server (`ssh vrintex@192.168.1.14`):

```bash
# 1. Pindah ke folder project
cd /home/vrintex/loxer

# 2. (Opsional) Cadangkan database manual
mkdir -p data/backups
cp data/loxer.db data/backups/loxer_$(date +%Y%m%d_%H%M%S).db

# 3. Ambil perubahan terbaru dari GitHub
git pull origin main

# 4. Install paket dependensi baru (bila ada)
npm install

# 5. Build bundle Vite untuk production
npm run build

# 6. Restart proses PM2
pm2 restart loxer

# 7. Cek status aplikasi
pm2 status
curl -I http://127.0.0.1:3035
```

---

## 5. Konfigurasi Environment (`.env`) di Server

File `.env` di VPS berlokasi di `/home/vrintex/loxer/.env`. File ini **tidak boleh di-commit ke Git** agar konfigurasi lokal dan rahasia tetap aman.

Contoh konfigurasi standar production di server:
```env
# Mode Database Lokal (SQLite)
VITE_USE_LOCAL_DB=true

# Akun Admin Utama
VITE_DEFAULT_ADMIN_EMAIL=vrintex
DEFAULT_ADMIN_EMAIL=vrintex

# Google OAuth 2.0 (Login Google)
VITE_GOOGLE_CLIENT_ID=662697453086-6ck31s04jn29r8ii58k88jq11id5071k.apps.googleusercontent.com

# Partner / Subdomain Tenancy
PARTNER_CHILD_PANEL_ENABLED=false
APP_BASE_DOMAIN=192.168.1.14
APP_PUBLIC_ORIGIN=http://192.168.1.14:3035
JWT_SECRET=b63c87f9024e4f9b8175d71c6183ef99ac483719b0271ca7832ef8a174092b31

# Integrasi Eksternal (Opsional)
CAREERJET_API_KEY=
JOOBLE_API_KEY=
RAPIDAPI_KEY=
```

---

## 6. Perintah Manajemen PM2

Gunakan perintah PM2 berikut untuk memonitor jalannya aplikasi di VPS:

| Tindakan | Perintah Terminal |
| :--- | :--- |
| **Lihat status semua proses** | `pm2 list` |
| **Lihat detail proses LOXER** | `pm2 show loxer` |
| **Pantau log real-time** | `pm2 logs loxer` |
| **Lihat 50 log terakhir tanpa streaming** | `pm2 logs loxer --lines 50 --nostream` |
| **Restart aplikasi** | `pm2 restart loxer` |
| **Stop aplikasi** | `pm2 stop loxer` |
| **Start manual aplikasi pertama kali** | `pm2 start npm --name "loxer" -- run preview` *(atau `pm2 start ecosystem.config.cjs`)* |
| **Simpan daftar proses saat ini** | `pm2 save` |
| **Monitoring CPU / RAM interaktif** | `pm2 monit` |

---

## 7. Konfigurasi Nginx Reverse Proxy (Domain / Subdomain)

Jika ingin mengakses LOXER menggunakan nama domain (misalnya `loxer.vrintex.id` atau `loxer.vrintex.co.id`) dengan SSL HTTPS:

### Buat file Nginx site:
```bash
sudo nano /etc/nginx/sites-available/loxer.vrintex.id.conf
```

### Masukkan konfigurasi berikut:
```nginx
server {
    listen 80;
    server_name loxer.vrintex.id;

    # Batas ukuran upload (untuk file CV dan file APK Android)
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3035;
        proxy_http_version 1.1;

        # Header WebSocket & upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Header identitas client
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout proxy untuk request berat/analisis AI
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Aktifkan dan restart Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/loxer.vrintex.id.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Pasang SSL Gratis (Certbot Let's Encrypt):
```bash
sudo certbot --nginx -d loxer.vrintex.id
```

---

## 8. Pemulihan & Rollback (Jika Ada Error Pasca-Deploy)

Jika setelah pull kode baru aplikasi mengalami error:

1. **Cek Log PM2 untuk melihat letak error:**
   ```bash
   pm2 logs loxer --lines 100 --nostream
   ```

2. **Rollback Git ke commit stabil sebelumnya:**
   ```bash
   cd /home/vrintex/loxer
   git reset --hard HEAD~1
   npm run build
   pm2 restart loxer
   ```

3. **Restore Database SQLite dari cadangan jika terjadi masalah data:**
   ```bash
   cd /home/vrintex/loxer
   # Pilih file backup terbaru di data/backups/
   ls -lt data/backups/
   cp data/backups/loxer_YYYYMMDD_HHMMSS.db data/loxer.db
   pm2 restart loxer
   ```
