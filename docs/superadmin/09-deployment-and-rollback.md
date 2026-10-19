# 09 — Deployment & Rollback: LOXER Universal Super Admin OS

## 1. Zero-Downtime Deployment Alur

Deploy otomatis dieksekusi dengan protokol:
1. **Pemeriksaan Kompilasi Lokal:** `npm run typecheck && npm run build`
2. **Sinkronisasi Git:** Push commit terverifikasi ke GitHub `origin main`.
3. **Pemberitahuan Server:**
   ```bash
   ssh samsung-server "cd /home/vrintex/loxer && git fetch origin main && git checkout main && git merge origin/main && npm run build && pm2 restart loxer && pm2 save"
   ```
4. **Verifikasi Ketersediaan:** `curl -s -I http://127.0.0.1:3035` memastikan status `HTTP 200 OK`.

---

## 2. Emergency Rollback Runbook

Jika terjadi anomali pada rilis baru:
1. **Kembalikan Git ke Commit Sebelumnya:**
   ```bash
   git revert HEAD --no-edit && git push origin main
   ```
2. **Rollback di Server Produksi:**
   ```bash
   ssh samsung-server "cd /home/vrintex/loxer && git pull origin main && npm run build && pm2 restart loxer"
   ```
3. **Pemulihan Database SQLite:**
   Arsip snapshot otomatis tersimpan di `/home/vrintex/loxer/data/backups/`. Pulihkan database dengan:
   ```bash
   cp data/backups/loxer_YYYYMMDD_HHMMSS.db data/loxer.db
   pm2 restart loxer
   ```
