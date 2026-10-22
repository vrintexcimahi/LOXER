#!/usr/bin/env python3
import subprocess, sys, os, time, sqlite3, shutil, json

BASE_DIR = r'C:/Users/SERVER PC/Pictures/LOXER-main'
DB_PATH = os.path.join(BASE_DIR, 'data/loxer.db')
CHECKPOINT_PATH = os.path.join(BASE_DIR, 'data/smart_add_checkpoint.json')
POSTERS_DIR = r'C:/Users/SERVER PC/Downloads/IKLAN LOKER/POSTER_IKLAN_LOKER'

BATCH_SIZE = 15
TOTAL_CYCLES = 10  # 10 cycles of 15 = 150 posters per autonomous run

print(f"🚀 Memulai Eksekusi Otonom ({TOTAL_CYCLES} siklus x {BATCH_SIZE} poster = ~{TOTAL_CYCLES * BATCH_SIZE} poster)...")

for cycle in range(1, TOTAL_CYCLES + 1):
    print(f"\n==========================================")
    print(f"▶️ SIKLUS OTONOM {cycle}/{TOTAL_CYCLES}")
    print(f"==========================================")

    # 1. Run batch smart add
    res = subprocess.run(['node', 'scripts/batch-smart-add-jobs.mjs', str(BATCH_SIZE)], capture_output=True, text=True, cwd=BASE_DIR)
    print(res.stdout)
    if res.stderr:
        print("STDERR:", res.stderr)

    # 2. SQLite clean backup & integrity check
    print("🔧 Menjalankan SQLite Clean Backup & Integrity Check...")
    clean_dump = os.path.join(BASE_DIR, 'data/loxer_clean_dump.db')

    con_src = sqlite3.connect(DB_PATH)
    cur = con_src.cursor()
    cur.execute('REINDEX;')
    cur.execute('PRAGMA wal_checkpoint(TRUNCATE);')

    con_dst = sqlite3.connect(clean_dump)
    con_src.backup(con_dst)
    con_dst.close()
    con_src.close()

    con_chk = sqlite3.connect(clean_dump)
    cur_chk = con_chk.cursor()
    cur_chk.execute('PRAGMA integrity_check;')
    integ = cur_chk.fetchall()
    cur_chk.execute('SELECT count(*) FROM job_listings')
    job_count = cur_chk.fetchone()[0]
    con_chk.close()

    print(f"Integritas: {integ} | Total Lowongan Lokal: {job_count}")
    shutil.move(clean_dump, DB_PATH)

    # 3. Deploy to production
    print("🔄 Menyinkronkan ke server produksi (samsung-server)...")
    try:
        subprocess.run(['ssh', 'samsung-server', 'pm2 stop loxer && rm -f /home/vrintex/loxer/data/loxer.db*'], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['scp', '-B', DB_PATH, 'samsung-server:/home/vrintex/loxer/data/loxer.db'], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['scp', '-B', '-r', os.path.join(BASE_DIR, 'public/uploads/posters'), 'samsung-server:/home/vrintex/loxer/public/uploads/'], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['ssh', 'samsung-server', 'pm2 start loxer'], check=True, stdout=subprocess.DEVNULL)
        print(f"✅ Siklus {cycle} berhasil disinkronkan ke produksi! (Lowongan Aktif: {job_count})")
    except Exception as e:
        print(f"⚠️ Kendala sinkronisasi siklus {cycle}: {e}")

    time.sleep(2)

print("\n🎉 Eksekusi Otonom Selesai!")
