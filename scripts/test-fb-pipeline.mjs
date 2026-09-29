import path from 'node:path';
import fs from 'node:fs';
import { extractPostWithAI } from '../services/fbAiExtractor.js';
import { ingestToLoxer } from '../services/fbIngestService.js';
import { getLocalDb } from '../server/localDb.js';

async function runPipelineTest() {
  console.log('===============================================================');
  console.log('🧪 [TEST PIPELINE] Memulai Pengujian Real-Time FB Scraper Pipeline');
  console.log('===============================================================');

  const sampleImagePath = path.resolve('public/uploads/fb_scraped/sample_cv_azqy.png');
  if (!fs.existsSync(sampleImagePath)) {
    throw new Error(`Sample image tidak ditemukan di ${sampleImagePath}. Silakan generate terlebih dahulu.`);
  }

  const sampleCaption = 'Manawian sugan Aya loker na modal KTP sareng ijazah SMP';
  const testPostId = `test_azqy_${Date.now()}`;
  const samplePostUrl = `https://www.facebook.com/groups/719722324747243/posts/${testPostId}`;
  const authorName = 'Azqy Ahmad Saputra';

  console.log('1. Mengirim sampel data ke fbAiExtractor (9Router AI Vision)...');
  console.log('   - Caption:', sampleCaption);
  console.log('   - Gambar:', sampleImagePath);

  const aiResult = await extractPostWithAI({
    postText: sampleCaption,
    imageBuffers: [sampleImagePath],
    postUrl: samplePostUrl,
  });

  console.log('\n--- Hasil Ekstraksi AI Vision ---');
  console.log('Kategori:', aiResult.category);
  console.log('Confidence Score:', aiResult.confidence_score);
  console.log('Nama Calon:', aiResult.candidate?.full_name);
  console.log('Kontak:', aiResult.candidate?.phone);
  console.log('Domisili:', aiResult.candidate?.domicile_city);
  console.log('Pendidikan:', JSON.stringify(aiResult.candidate?.education));
  console.log('Pengalaman:', JSON.stringify(aiResult.candidate?.experience));
  console.log('Keahlian:', JSON.stringify(aiResult.candidate?.skills));
  console.log('Ringkasan AI:', aiResult.ai_summary);

  if (aiResult.category !== 'PELAMAR_KERJA') {
    throw new Error(`Ekspektasi kategori PELAMAR_KERJA, tapi AI mengembalikan: ${aiResult.category}`);
  }

  console.log('\n2. Mengirim data terekstraksi ke fbIngestService (SQLite loxer.db)...');
  const ingestResult = await ingestToLoxer({
    postUrl: samplePostUrl,
    authorName,
    rawCaption: sampleCaption,
    imagePaths: [sampleImagePath],
    aiResult,
  });

  console.log('   - Ingest Status:', ingestResult.success ? 'BERHASIL' : 'GAGAL');
  console.log('   - Scraped Post ID:', ingestResult.scrapedId);
  console.log('   - Moderation Queue ID:', ingestResult.modQueueId);
  console.log('   - Entity Type:', ingestResult.entityType);
  console.log('   - Entity ID:', ingestResult.entityId);

  // 3. Validasi database SQLite
  console.log('\n3. Melakukan verifikasi data di SQLite database (data/loxer.db)...');
  const db = getLocalDb();

  // A. Cek tabel fb_scraped_posts
  const scrapedRow = db.prepare('SELECT * FROM fb_scraped_posts WHERE id = ?').get(ingestResult.scrapedId);
  if (!scrapedRow) {
    throw new Error(`Data tidak ditemukan di fb_scraped_posts untuk id ${ingestResult.scrapedId}`);
  }
  console.log('   [OK] fb_scraped_posts tersimpan dengan benar.');

  // B. Cek tabel moderation_queue
  const modRow = db.prepare('SELECT * FROM moderation_queue WHERE id = ?').get(ingestResult.modQueueId);
  if (!modRow) {
    throw new Error(`Data tiket tidak ditemukan di moderation_queue untuk id ${ingestResult.modQueueId}`);
  }
  console.log(`   [OK] moderation_queue tercatat (Status: ${modRow.status}, Score: ${modRow.ai_score}).`);

  // C. Cek tabel seeker_profiles & talent_marketplace_posts
  const talentRow = db.prepare('SELECT * FROM talent_marketplace_posts WHERE id = ?').get(ingestResult.entityId);
  if (!talentRow) {
    throw new Error(`Data talent_marketplace_posts tidak ditemukan untuk id ${ingestResult.entityId}`);
  }
  console.log(`   [OK] talent_marketplace_posts tersimpan (Headline: "${talentRow.headline}").`);

  const seekerRow = db.prepare('SELECT * FROM seeker_profiles WHERE id = ?').get(talentRow.seeker_id);
  if (!seekerRow) {
    throw new Error(`Data seeker_profiles tidak ditemukan untuk id ${talentRow.seeker_id}`);
  }
  console.log(`   [OK] seeker_profiles tersimpan (Nama: "${seekerRow.full_name}", Kontak: "${seekerRow.phone}").`);

  // D. Uji proteksi duplikasi
  console.log('\n4. Menguji proteksi anti-duplikasi...');
  const duplicateResult = await ingestToLoxer({
    postUrl: samplePostUrl,
    authorName,
    rawCaption: sampleCaption,
    imagePaths: [sampleImagePath],
    aiResult,
  });

  if (!duplicateResult.skipped) {
    throw new Error('Gagal: Postingan duplikat seharusnya di-skip, tapi tetap di-ingest!');
  }
  console.log('   [OK] Proteksi anti-duplikasi bekerja sempurna (skipped = true).');

  console.log('\n===============================================================');
  console.log('Test Pipeline Passed 100%!');
  console.log('===============================================================\n');
}

runPipelineTest().catch((err) => {
  console.error('\n❌ [TEST FAILED]:', err);
  process.exit(1);
});
