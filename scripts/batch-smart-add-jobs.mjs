// ==============================================================================
// LOXER Batch Smart Add Jobs Worker
// Powered by 9Router Gemini 3.8 (ag/gemini-3.8-flash-high)
// ==============================================================================

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { extractSmartJobAd } from '../services/smartJobExtractorService.js';

const DB_PATH = path.resolve('data/loxer.db');
const POSTERS_SRC_DIR = path.resolve('C:/Users/SERVER PC/Downloads/IKLAN LOKER/POSTER_IKLAN_LOKER');
const POSTERS_DEST_DIR = path.resolve('public/uploads/posters');
const CHECKPOINT_PATH = path.resolve('data/smart_add_checkpoint.json');

if (!fs.existsSync(POSTERS_DEST_DIR)) {
  fs.mkdirSync(POSTERS_DEST_DIR, { recursive: true });
}

// Load Checkpoint
let processedMap = {};
if (fs.existsSync(CHECKPOINT_PATH)) {
  try {
    processedMap = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
  } catch {
    processedMap = {};
  }
function saveCheckpointAtomic(map) {
  const tmpPath = `${CHECKPOINT_PATH}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify(map, null, 2), 'utf-8');
  fs.renameSync(tmpPath, CHECKPOINT_PATH);
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA journal_mode = WAL;');

// Get admin user id
const adminRow = db.prepare("SELECT id FROM users WHERE id = 'admin-vrintex-root' OR email LIKE '%admin%' OR email = 'vrintex' LIMIT 1").get();
const defaultAdminId = adminRow ? adminRow.id : 'admin-vrintex-root';

// Read all poster files
const allFiles = fs.readdirSync(POSTERS_SRC_DIR).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpeg'));
console.log(`📁 Total poster tersedia di folder: ${allFiles.length}`);
console.log(`✅ Total poster yang sudah diproses sebelumnya: ${Object.keys(processedMap).length}`);

const unprocessed = allFiles.filter(f => !processedMap[f]);
console.log(`⏳ Poster yang belum diproses: ${unprocessed.length}`);

// Get target batch count from CLI arg, default 20
const batchLimit = parseInt(process.argv[2] || '20', 10);
const targetBatch = unprocessed.slice(0, batchLimit);

console.log(`🚀 Menjalankan ekstraksi Smart Add untuk ${targetBatch.length} poster...`);

let successCount = 0;
let failCount = 0;

for (let i = 0; i < targetBatch.length; i++) {
  const filename = targetBatch[i];
  const srcPath = path.join(POSTERS_SRC_DIR, filename);
  console.log(`\n[${i + 1}/${targetBatch.length}] Memproses: ${filename.slice(0, 75)}...`);

  try {
    // 1. Ekstrak teks caption dari nama file
    let cleanCaption = filename.replace(/\.(jpg|jpeg|png)$/i, '');
    cleanCaption = cleanCaption.replace(/_[0-9]{4}-[0-9]{2}-[0-9]{2}_.*/, '');
    cleanCaption = cleanCaption.replace(/^[^_]+_/, '');
    cleanCaption = cleanCaption.replace(/_/g, ' ');

    // 2. Baca gambar sebagai base64
    const imgBuf = fs.readFileSync(srcPath);
    const imageBase64 = imgBuf.toString('base64');

    // 3. Panggil Gemini 3.8 melalui smartJobExtractorService
    const jobData = await extractSmartJobAd({
      imageBase64,
      postText: cleanCaption,
    });

    if (!jobData || !jobData.title || !jobData.company_name) {
      throw new Error(`Data tidak lengkap dari AI: ${JSON.stringify(jobData)}`);
    }

    console.log(`   ✨ AI Result: [${jobData.company_name}] - ${jobData.title} (${jobData.category} | ${jobData.location_city})`);

    // 4. Salin poster ke public/uploads/posters & terapkan sensor privasi LOXER
    const destPosterName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${path.extname(filename)}`;
    const destPosterPath = path.join(POSTERS_DEST_DIR, destPosterName);
    fs.copyFileSync(srcPath, destPosterPath);

    // Jalankan sensor privasi visual
    try {
      execSync(`python scripts/censor_single_poster.py "${destPosterPath}"`, { stdio: 'ignore' });
    } catch (e) {
      console.warn('   ⚠️ Gagal sensor gambar visual:', e.message);
    }

    const posterPublicUrl = `/uploads/posters/${destPosterName}`;

    // 5. Simpan / Temukan Perusahaan
    const cleanCompName = String(jobData.company_name).trim();
    const cleanJobTitle = String(jobData.title).trim();

    // Check duplicate by title + company
    const existingJob = db.prepare(`
      SELECT j.id FROM job_listings j
      JOIN companies c ON j.company_id = c.id
      WHERE LOWER(j.title) = LOWER(?) AND LOWER(c.name) = LOWER(?)
    `).get(cleanJobTitle, cleanCompName);

    if (existingJob) {
      console.log(`   ⏭️ Lowongan [${cleanJobTitle}] di [${cleanCompName}] sudah terdaftar sebelumnya (ID: ${existingJob.id}), lewati...`);
      processedMap[filename] = {
        job_id: existingJob.id,
        title: cleanJobTitle,
        company: cleanCompName,
        status: 'duplicate_skipped',
        processed_at: new Date().toISOString(),
      };
      saveCheckpointAtomic(processedMap);
      continue;
    }

    let company = db.prepare('SELECT id, name FROM companies WHERE LOWER(name) = LOWER(?)').get(cleanCompName);

    const now = new Date().toISOString();

    if (!company) {
      const companyId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO companies (id, user_id, name, industry, city, description, website, verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        companyId,
        defaultAdminId,
        cleanCompName,
        jobData.category || 'Teknik & Rekayasa',
        jobData.location_city || 'Bandung / Cimahi',
        `Perusahaan terverifikasi resmi: ${cleanCompName}`,
        jobData.application_url?.startsWith('http') ? jobData.application_url : '',
        now,
        now
      );
      company = { id: companyId, name: cleanCompName };
    }

    // 6. Simpan Lowongan ke job_listings
    const jobId = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiresAt = expiryDate.toISOString();

    let finalRequirements = (jobData.requirements || '').trim();
    if (jobData.benefits && !finalRequirements.toLowerCase().includes('benefit')) {
      finalRequirements += `\n\nBenefit & Fasilitas:\n${jobData.benefits}`;
    }
    if (jobData.contact_phone && !finalRequirements.includes(jobData.contact_phone)) {
      finalRequirements += `\n\nKontak Rekruter: ${jobData.contact_phone}`;
    }
    if (jobData.application_url && !finalRequirements.includes(jobData.application_url)) {
      finalRequirements += `\n\nLink Pendaftaran: ${jobData.application_url}`;
    }

    db.prepare(`
      INSERT INTO job_listings (
        id, company_id, title, category, location_city, job_type,
        salary_min, salary_max, description, requirements, benefits,
        application_url, poster_url, quota, status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(
      jobId,
      company.id,
      String(jobData.title).trim(),
      jobData.category || 'Teknik & Rekayasa',
      jobData.location_city || 'Bandung / Cimahi',
      jobData.job_type || 'full-time',
      parseInt(jobData.salary_min || '0', 10) || 0,
      parseInt(jobData.salary_max || '0', 10) || 0,
      jobData.description || '',
      finalRequirements,
      jobData.benefits || '',
      jobData.application_url || '',
      posterPublicUrl,
      parseInt(jobData.quota || '1', 10) || 1,
      expiresAt,
      now,
      now
    );

    // 7. Catat Checkpoint
    processedMap[filename] = {
      job_id: jobId,
      title: jobData.title,
      company: cleanCompName,
      processed_at: now,
    };
    saveCheckpointAtomic(processedMap);

    successCount++;
    console.log(`   ✅ Lowongan berhasil dipublikasikan (ID: ${jobId})`);
  } catch (err) {
    failCount++;
    console.error(`   ❌ Gagal memproses ${filename}:`, err.message);
  }
}

console.log('\n======================================================');
console.log(`🎉 Batch selesai! Berhasil: ${successCount}, Gagal: ${failCount}`);
console.log(`📊 Total semua lowongan terpasang: ${Object.keys(processedMap).length}`);
console.log('======================================================');
