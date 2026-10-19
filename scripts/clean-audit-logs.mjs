// ==============================================================================
// LOXER Clean Audit Logs & WAL Optimizer Script (Rekomendasi 1 & 2)
// Archives / purges stale audit logs > 90 days and runs WAL checkpoint & vacuum.
// ==============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve('data/loxer.db');
const ARCHIVE_DIR = path.resolve('data/archives');

if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

console.log('🧹 [AUDIT_CLEANUP] Memulai pembersihan log audit dan optimasi WAL...');
console.log('📂 Database:', DB_PATH);

const db = new DatabaseSync(DB_PATH);

try {
  db.exec('PRAGMA busy_timeout = 5000;');

  // 1. Hitung log yang lebih tua dari 90 hari
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  
  const staleCountStmt = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE created_at < ?');
  const staleRow = staleCountStmt.get(ninetyDaysAgo);
  const count = staleRow ? staleRow.count : 0;

  console.log(`📊 Log audit lebih tua dari 90 hari (${ninetyDaysAgo}): ${count} entri`);

  if (count > 0) {
    // Ambil data untuk diarsip ke berkas JSON sebelum dihapus
    const staleLogs = db.prepare('SELECT * FROM audit_logs WHERE created_at < ? ORDER BY created_at ASC').all(ninetyDaysAgo);
    const archiveFileName = `audit_logs_${Date.now()}.json`;
    const archiveFilePath = path.join(ARCHIVE_DIR, archiveFileName);

    fs.writeFileSync(archiveFilePath, JSON.stringify(staleLogs, null, 2), 'utf-8');
    console.log(`📦 Berhasil mengarsipkan ${staleLogs.length} baris log ke ${archiveFilePath}`);

    // Hapus dari database
    const delStmt = db.prepare('DELETE FROM audit_logs WHERE created_at < ?');
    const result = delStmt.run(ninetyDaysAgo);
    console.log(`✅ ${result.changes} baris audit_logs lama berhasil dibersihkan dari database.`);
  } else {
    console.log('✨ Tidak ada log usang yang perlu dihapus saat ini.');
  }

  // 2. Optimasi WAL Checkpoint & Incremental Vacuum
  console.log('⚡ Menjalankan WAL Checkpoint (TRUNCATE) & Optimasi Ruang Disk...');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  db.exec('PRAGMA incremental_vacuum;');
  
  // 3. Verifikasi integritas akhir
  const integrity = db.prepare('PRAGMA integrity_check;').get();
  console.log('🔍 Integritas Database:', integrity);

  console.log('🎉 [SELESAI] Pembersihan log audit dan optimasi database selesai dengan sukses!');
} catch (err) {
  console.error('❌ Gagal menjalankan pembersihan log:', err.message);
  process.exit(1);
}
