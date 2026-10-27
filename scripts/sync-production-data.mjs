// ==============================================================================
// LOXER Sync to Production Server (samsung-server)
// Merges local SQLite data and syncs poster uploads to production
// ==============================================================================

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export async function syncToProduction() {
  console.log('🔄 [Sync] Menyiapkan sinkronisasi ke server produksi (samsung-server)...');

  // 1. Checkpoint & vacuum local db
  try {
    execSync('python -c "import sqlite3; con=sqlite3.connect(\'data/loxer.db\'); cur=con.cursor(); cur.execute(\'PRAGMA wal_checkpoint(TRUNCATE);\'); con.close()"', { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ [Sync] Warning saat checkpoint local db:', err.message);
  }

  // 2. Transfer posters
  console.log('📤 [Sync] Mengunggah file poster baru ke server...');
  execSync('scp -B -r public/uploads/posters samsung-server:/home/vrintex/loxer/public/uploads/', { stdio: 'inherit' });

  // 3. Transfer database snapshot to temporary location
  console.log('📤 [Sync] Mengunggah snapshot database ke /tmp/loxer_incoming.db...');
  execSync('scp -B data/loxer.db samsung-server:/tmp/loxer_incoming.db', { stdio: 'inherit' });

  // 4. Execute atomic merge on production
  console.log('⚡ [Sync] Menjalankan atomic merge di database produksi...');
  const pythonMergeScript = `
import sqlite3, os

db_path = '/home/vrintex/loxer/data/loxer.db'
incoming_path = '/tmp/loxer_incoming.db'

if not os.path.exists(incoming_path):
    print("❌ No incoming db found at", incoming_path)
    exit(1)

con = sqlite3.connect(db_path)
con.execute('PRAGMA busy_timeout = 10000;')
con.execute('ATTACH DATABASE "/tmp/loxer_incoming.db" AS incoming;')
con.execute('BEGIN TRANSACTION;')
con.execute('INSERT OR IGNORE INTO companies SELECT * FROM incoming.companies;')
con.execute('INSERT OR IGNORE INTO job_listings SELECT * FROM incoming.job_listings;')
con.execute('COMMIT;')
con.execute('PRAGMA wal_checkpoint(TRUNCATE);')

cur = con.cursor()
companies_count = cur.execute('SELECT COUNT(*) FROM companies;').fetchone()[0]
jobs_count = cur.execute('SELECT COUNT(*) FROM job_listings;').fetchone()[0]
print(f'✅ Server Production Updated! Companies: {companies_count} | Jobs: {jobs_count}')
con.close()
os.remove(incoming_path)
`;

  await new Promise((resolve, reject) => {
    const proc = spawn('ssh', ['-T', '-o', 'BatchMode=yes', 'samsung-server', 'python3 - && pm2 reload loxer'], {
      stdio: ['pipe', 'inherit', 'inherit']
    });

    proc.stdin.write(pythonMergeScript);
    proc.stdin.end();

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ [Sync] Sinkronisasi & PM2 reload produksi berhasil!');
        resolve();
      } else {
        reject(new Error(`Merge remote exit code: ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

// Standalone execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/sync-production-data.mjs')) {
  syncToProduction()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Sinkronisasi gagal:', err);
      process.exit(1);
    });
}
