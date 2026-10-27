// ==============================================================================
// LOXER Continuous Ingestion Daemon
// ==============================================================================

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHECKPOINT_PATH = path.resolve('data/smart_add_checkpoint.json');
const POSTERS_DIR = path.resolve('C:/Users/SERVER PC/Pictures/POSTER_IKLAN_LOKER');
const MULTI_POSISI_DIR = path.join(POSTERS_DIR, 'IKLAN_MULTI_POSISI');

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function getRemainingCount() {
  const allQueue = [];
  if (fs.existsSync(MULTI_POSISI_DIR)) {
    const multiEntries = fs.readdirSync(MULTI_POSISI_DIR, { withFileTypes: true });
    for (const e of multiEntries) {
      if (e.isDirectory()) allQueue.push(`[FOLDER] ${e.name}`);
    }
  }
  const rootEntries = fs.readdirSync(POSTERS_DIR, { withFileTypes: true });
  for (const e of rootEntries) {
    if (e.isFile() && /\.(jpg|jpeg|png)$/i.test(e.name)) {
      allQueue.push(e.name);
    }
  }

  let processed = {};
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      processed = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
    } catch {}
  }

  const remaining = allQueue.filter((id) => !processed[id]);
  return { total: allQueue.length, done: Object.keys(processed).length, remaining: remaining.length };
}

console.log('🚀 LOXER Auto Ingestion Daemon Running in background...');
const BATCH_SIZE = 15;

while (true) {
  const stats = getRemainingCount();
  console.log(`\n📊 Status: ${stats.done}/${stats.total} selesai | Sisa: ${stats.remaining}`);
  if (stats.remaining === 0) {
    console.log('🎉 Seluruh iklan poster loker telah selesai diposting!');
    break;
  }

  try {
    console.log(`▶️ Menjalankan batch (${BATCH_SIZE} iklan)...`);
    execSync(`node scripts/batch-smart-add-jobs.mjs ${BATCH_SIZE}`, { stdio: 'inherit' });

    // Reindex & wal checkpoint
    execSync('python -c "import sqlite3; con=sqlite3.connect(\'data/loxer.db\'); cur=con.cursor(); cur.execute(\'REINDEX;\'); cur.execute(\'PRAGMA wal_checkpoint(TRUNCATE);\'); con.close()"', { stdio: 'inherit' });

    // Sync to production via incremental merge
    console.log('🔄 Menyinkronkan ke server produksi https://loxer.web.id/browse via sync-production-data...');
    execSync('node scripts/sync-production-data.mjs', { stdio: 'inherit' });
    console.log('✅ Batch sukses disinkronkan ke produksi https://loxer.web.id/browse via merge!');
  } catch (err) {
    console.error('⚠️ Terjadi kendala batch:', err.message);
    sleepMs(5000);
  }
}
