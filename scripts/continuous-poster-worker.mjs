// ==============================================================================
// LOXER Continuous Ingestion Daemon
// ==============================================================================

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHECKPOINT_PATH = path.resolve('data/smart_add_checkpoint.json');
const POSTERS_DIR = path.resolve('C:/Users/SERVER PC/Downloads/IKLAN LOKER/POSTER_IKLAN_LOKER');

function getRemainingCount() {
  const allFiles = fs.readdirSync(POSTERS_DIR).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpeg'));
  let processed = {};
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      processed = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
    } catch {}
  }
  const remaining = allFiles.filter(f => !processed[f]);
  return { total: allFiles.length, done: Object.keys(processed).length, remaining: remaining.length };
}

console.log('🚀 LOXER Auto Ingestion Daemon Running in background...');
const BATCH_SIZE = 25;

while (true) {
  const stats = getRemainingCount();
  console.log(`\n📊 Status: ${stats.done}/${stats.total} selesai | Sisa: ${stats.remaining}`);
  if (stats.remaining === 0) {
    console.log('🎉 Seluruh 6.716 poster loker telah selesai diposting!');
    break;
  }

  try {
    console.log(`▶️ Menjalankan batch (${BATCH_SIZE} poster)...`);
    execSync(`node scripts/batch-smart-add-jobs.mjs ${BATCH_SIZE}`, { stdio: 'pipe' });

    // Reindex & wal checkpoint
    execSync('python -c "import sqlite3; con=sqlite3.connect(\'data/loxer.db\'); cur=con.cursor(); cur.execute(\'REINDEX;\'); cur.execute(\'PRAGMA wal_checkpoint(TRUNCATE);\'); con.close()"', { stdio: 'pipe' });

    // Sync to production
    console.log('🔄 Menyinkronkan ke server produksi...');
    execSync('scp -B data/loxer.db samsung-server:/home/vrintex/loxer/data/loxer.db', { stdio: 'pipe' });
    execSync('scp -B -r public/uploads/posters samsung-server:/home/vrintex/loxer/public/uploads/', { stdio: 'pipe' });
    execSync('ssh -T -o BatchMode=yes samsung-server "pm2 restart loxer && pm2 save"', { stdio: 'pipe' });
    console.log('✅ Batch sukses disinkronkan ke produksi!');
  } catch (err) {
    console.error('⚠️ Terjadi kendala batch:', err.message);
    // Pause briefly before retrying
    execSync('sleep 5', { stdio: 'pipe' });
  }
}
