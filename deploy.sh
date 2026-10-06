#!/usr/bin/env bash
set -e

# ==============================================================================
# LOXER - Auto Deploy Script (Pull from GitHub & Restart PM2)
# ==============================================================================

PROJECT_DIR="/home/vrintex/loxer"
BRANCH="main"

echo "=== [1/6] Berpindah ke direktori project: $PROJECT_DIR ==="
cd "$PROJECT_DIR"

echo "=== [2/6] Mem-backup data SQLite & environment produksi ==="
mkdir -p data/backups
LATEST_BACKUP_DB=""
if [ -f "data/loxer.db" ]; then
  LATEST_BACKUP_DB="data/backups/loxer_$(date +%Y%m%d_%H%M%S).db"
  cp data/loxer.db "$LATEST_BACKUP_DB"
  echo "✔ Database SQLite dicadangkan ke $LATEST_BACKUP_DB"
fi
if [ -f ".env" ]; then
  cp .env data/backups/.env.prod.bak
  echo "✔ File .env dicadangkan ke data/backups/.env.prod.bak"
fi

echo "=== [3/6] Mengambil update terbaru dari GitHub origin/$BRANCH ==="
git fetch origin "$BRANCH"
git checkout "$BRANCH"
# Pastikan branch lokal di server sinkron 100% dengan origin/main tanpa merge conflict
git reset --hard "origin/$BRANCH"

# Pertahankan database SQLite produksi dan file .env server
if [ -n "$LATEST_BACKUP_DB" ] && [ -f "$LATEST_BACKUP_DB" ]; then
  cp "$LATEST_BACKUP_DB" data/loxer.db
  echo "✔ Database SQLite produksi server dipertahankan."
fi
if [ -f "data/backups/.env.prod.bak" ]; then
  cp data/backups/.env.prod.bak .env
  echo "✔ Konfigurasi .env produksi server dipertahankan."
fi

echo "=== [4/6] Menginstal dependensi (npm install) ==="
npm install --prefer-offline

echo "=== [5/6] Membangun bundle produksi (npm run build) ==="
npm run build

echo "=== [6/6] Merestart service PM2 (loxer) ==="
if pm2 describe loxer > /dev/null 2>&1; then
  pm2 restart loxer
else
  pm2 start npm --name "loxer" -- run preview
fi

# Simpan state PM2 agar selalu auto-start saat VPS reboot
pm2 save

echo "=== [VERIFIKASI] Mengecek ketersediaan port 3035 ==="
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3035 || echo "FAIL")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✔ Status OK (HTTP $HTTP_CODE) - Aplikasi LOXER aktif & siap melayani traffic."
else
  echo "⚠ Peringatan: Status HTTP $HTTP_CODE. Cek logs dengan: pm2 logs loxer --lines 50"
fi
echo "=============================================================================="
