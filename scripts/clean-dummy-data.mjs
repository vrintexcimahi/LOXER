// ==============================================================================
// LOXER Clean Dummy Data Script
// Removes dummy demo talents, demo jobs, and simulation test records from SQLite
// ==============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.resolve('data/loxer.db');
const db = new DatabaseSync(DB_PATH);

console.log('🧹 [CLEANUP] Membersihkan data dummy dari database:', DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('BEGIN TRANSACTION;');

try {
  // 1. Delete direct_job_offers if any
  const delOffers = db.prepare('DELETE FROM direct_job_offers').run();
  console.log(`- direct_job_offers dihapus: ${delOffers.changes} baris`);

  // 2. Identify demo users to delete
  const demoEmails = [
    'arifin.ahmad@example.com',
    'agus.sanusi@example.com',
    'puji.prayitno@example.com',
    'sulis.setiawati@example.com',
    'hilman.pratama@example.com',
    'harry.agustian@example.com',
  ];

  // Also include test users created by simulation test runner
  const testUsers = db.prepare("SELECT id, email FROM users WHERE email LIKE '%@loxer.local' OR email IN (?, ?, ?, ?, ?, ?)")
    .all(...demoEmails);

  console.log(`- Ditemukan ${testUsers.length} akun user dummy/test untuk dibersihkan.`);

  for (const u of testUsers) {
    // Delete talent posts
    db.prepare('DELETE FROM talent_marketplace_posts WHERE user_id = ?').run(u.id);

    // Delete seeker education & experience
    const seeker = db.prepare('SELECT id FROM seeker_profiles WHERE user_id = ?').get(u.id);
    if (seeker) {
      db.prepare('DELETE FROM seeker_education WHERE seeker_id = ?').run(seeker.id);
      db.prepare('DELETE FROM seeker_experience WHERE seeker_id = ?').run(seeker.id);
      db.prepare('DELETE FROM seeker_profiles WHERE id = ?').run(seeker.id);
    }

    // Delete users_meta & user
    db.prepare('DELETE FROM users_meta WHERE id = ?').run(u.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
  }

  // 3. Delete any remaining talent_marketplace_posts that were dummy/test
  const delTalents = db.prepare("DELETE FROM talent_marketplace_posts WHERE id LIKE 'tal_fb_%' OR user_id LIKE 'usr_fb_%'").run();
  console.log(`- Sisa talent_marketplace_posts dummy dibersihkan: ${delTalents.changes} baris`);

  // 4. Delete demo job listings from employer@demo.com
  const demoJobTitles = [
    'Senior Fullstack Engineer (React & Node.js)',
    'Product Designer (UI/UX)',
    'Talent Acquisition Specialist',
  ];
  const delJobs = db.prepare('DELETE FROM job_listings WHERE title IN (?, ?, ?)').run(...demoJobTitles);
  console.log(`- Lowongan demo job_listings dihapus: ${delJobs.changes} baris`);

  // 5. Clean moderation_queue for deleted entities
  const delModTalent = db.prepare("DELETE FROM moderation_queue WHERE entity_type = 'talent_post'").run();
  const delModDemoJob = db.prepare("DELETE FROM moderation_queue WHERE entity_id IN ('7923f80a-068e-443a-9817-0666a96e5d82', '917f1d72-d5fc-4790-a826-dd8fd1406b7f', 'e12ec6f2-d38a-4925-9f3e-a5f6a5afcf8d')").run();
  console.log(`- Tiket antrean moderasi dummy dibersihkan: ${delModTalent.changes + delModDemoJob.changes} baris`);

  // 6. Clean fb_scraped_posts for test_azqy
  const delScraped = db.prepare("DELETE FROM fb_scraped_posts WHERE post_url LIKE '%test_azqy%'").run();
  console.log(`- Histori fb_scraped_posts tes simulasi dibersihkan: ${delScraped.changes} baris`);

  db.exec('COMMIT;');
  console.log('✅ [BERHASIL] Seluruh data dummy telah bersih dari database!');
} catch (err) {
  db.exec('ROLLBACK;');
  console.error('❌ [GAGAL] Gagal membersihkan data dummy:', err);
  process.exit(1);
} finally {
  db.close();
}
