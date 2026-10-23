#!/usr/bin/env python3
import subprocess, sys, os, time, sqlite3, shutil

BASE_DIR = r'C:/Users/SERVER PC/Pictures/LOXER-main'
DB_PATH = os.path.join(BASE_DIR, 'data/loxer.db')

batch_size = sys.argv[1] if len(sys.argv) > 1 else '10'

print(f'🚀 Running Smart Add Batch ({batch_size} posters)...')
res = subprocess.run(['node', 'scripts/batch-smart-add-jobs.mjs', str(batch_size)], capture_output=True, text=True, cwd=BASE_DIR)

print(res.stdout)
if res.stderr:
    print('STDERR:', res.stderr)

if res.returncode == 0:
    print('🔧 Running SQLite Clean Backup & Integrity Check...')
    clean_dump = os.path.join(BASE_DIR, 'data/loxer_clean_dump.db')
    
    con_src = sqlite3.connect(DB_PATH)
    cur = con_src.cursor()
    cur.execute('REINDEX;')
    cur.execute('PRAGMA wal_checkpoint(TRUNCATE);')
    
    con_dst = sqlite3.connect(clean_dump)
    con_src.backup(con_dst)
    con_dst.close()
    con_src.close()
    
    # Check integrity & foreign keys
    con_chk = sqlite3.connect(clean_dump)
    cur_chk = con_chk.cursor()
    cur_chk.execute('PRAGMA integrity_check;')
    integrity_res = cur_chk.fetchall()
    print('Integrity:', integrity_res)
    if integrity_res != [('ok',)]:
        raise RuntimeError(f"Database integrity check failed: {integrity_res}")

    cur_chk.execute('PRAGMA foreign_key_check;')
    fk_violations = cur_chk.fetchall()
    print('Foreign Key Check:', fk_violations)
    if fk_violations:
        raise RuntimeError(f"Database foreign key check failed ({len(fk_violations)} violations): {fk_violations}")

    cur_chk.execute('SELECT count(*) FROM job_listings')
    count = cur_chk.fetchone()[0]
    print(f'Total Active Jobs: {count}')
    con_chk.close()
    
    shutil.move(clean_dump, DB_PATH)
    
    print('🔄 Incrementally merging batch records to production server (samsung-server)...')
    subprocess.run(['scp', '-B', '-r', os.path.join(BASE_DIR, 'public/uploads/posters'), 'samsung-server:/home/vrintex/loxer/public/uploads/'], check=True)
    subprocess.run(['scp', '-B', DB_PATH, 'samsung-server:/tmp/loxer_incoming.db'], check=True)
    merge_cmd = (
        'python3 -c "'
        'import sqlite3; '
        'con = sqlite3.connect(\'/home/vrintex/loxer/data/loxer.db\'); '
        'con.execute(\'PRAGMA busy_timeout = 10000;\'); '
        'con.execute(\'ATTACH DATABASE \\"/tmp/loxer_incoming.db\\" AS incoming;\'); '
        'con.execute(\'BEGIN TRANSACTION;\'); '
        'con.execute(\'INSERT OR IGNORE INTO companies SELECT * FROM incoming.companies;\'); '
        'con.execute(\'INSERT OR IGNORE INTO job_listings SELECT * FROM incoming.job_listings;\'); '
        'con.execute(\'COMMIT;\'); '
        'con.execute(\'PRAGMA wal_checkpoint(TRUNCATE);\'); '
        'con.close()" && rm -f /tmp/loxer_incoming.db && pm2 reload loxer'
    )
    subprocess.run(['ssh', 'samsung-server', merge_cmd], check=True)
    
    # Post-deployment smoke test (Saran 47)
    try:
        import urllib.request
        smoke_url = 'http://192.168.1.14:3035/api/storage/status'
        time.sleep(2)
        with urllib.request.urlopen(smoke_url, timeout=10) as resp:
            if resp.status == 200:
                print('✅ Smoke test passed on live server!')
            else:
                print(f'⚠️ Smoke test returned status {resp.status}')
    except Exception as e:
        print(f'⚠️ Smoke test note: {e}')

    print('✅ Successfully deployed and synced to production!')
