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
const POSTERS_SRC_DIR = path.resolve('C:/Users/SERVER PC/Pictures/POSTER_IKLAN_LOKER');
const MULTI_POSISI_DIR = path.join(POSTERS_SRC_DIR, 'IKLAN_MULTI_POSISI');
const POSTERS_DEST_DIR = path.resolve('public/uploads/posters');
const CHECKPOINT_PATH = path.resolve('data/smart_add_checkpoint.json');
const LOCK_FILE = path.resolve('data/batch_poster_worker.lock');

// Advisory Process Lock Guard
function acquireProcessLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
      if (lockData && lockData.pid) {
        try {
          process.kill(lockData.pid, 0); // Check if process is still alive
          console.warn(`⚠️ [LOCK] Batch worker sedang berjalan pada PID ${lockData.pid} (sejak ${lockData.started_at}). Menghentikan eksekusi duplikat.`);
          process.exit(0);
        } catch {
          console.log(`ℹ️ [LOCK] Membersihkan stale lock file dari PID ${lockData.pid}.`);
          try { fs.unlinkSync(LOCK_FILE); } catch {}
        }
      }
    } catch {
      try { fs.unlinkSync(LOCK_FILE); } catch {}
    }
  }

  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.warn('⚠️ Gagal menulis file lock:', err.message);
  }

  const release = () => {
    try {
      if (fs.existsSync(LOCK_FILE)) {
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
        if (lockData && lockData.pid === process.pid) {
          fs.unlinkSync(LOCK_FILE);
        }
      }
    } catch {}
  };

  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(130); });
  process.on('SIGTERM', () => { release(); process.exit(143); });
}

acquireProcessLock();

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

// Build complete queue: Multi-position folders first, then single poster files
const allQueueItems = [];

// 1. Folders in IKLAN_MULTI_POSISI (each folder is 1 integrated ad)
if (fs.existsSync(MULTI_POSISI_DIR)) {
  const multiEntries = fs.readdirSync(MULTI_POSISI_DIR, { withFileTypes: true });
  for (const entry of multiEntries) {
    if (entry.isDirectory()) {
      allQueueItems.push({
        id: `[FOLDER] ${entry.name}`,
        isFolder: true,
        name: entry.name,
        path: path.join(MULTI_POSISI_DIR, entry.name),
      });
    }
  }
}

// 2. Single files directly in POSTERS_SRC_DIR
const rootEntries = fs.readdirSync(POSTERS_SRC_DIR, { withFileTypes: true });
for (const entry of rootEntries) {
  if (entry.isFile() && /\.(jpg|jpeg|png)$/i.test(entry.name)) {
    allQueueItems.push({
      id: entry.name,
      isFolder: false,
      name: entry.name,
      path: path.join(POSTERS_SRC_DIR, entry.name),
    });
  }
}

console.log(`📁 Total unit iklan tersedia: ${allQueueItems.length} (Multi-posisi: ${allQueueItems.filter(i => i.isFolder).length}, Single: ${allQueueItems.filter(i => !i.isFolder).length})`);
console.log(`✅ Total unit iklan yang sudah diproses sebelumnya: ${Object.keys(processedMap).length}`);

const unprocessed = allQueueItems.filter(i => !processedMap[i.id] && !processedMap[i.name]);
console.log(`⏳ Unit iklan yang belum diproses: ${unprocessed.length}`);

// Get target batch count from CLI arg, default 20
const batchLimit = parseInt(process.argv[2] || '20', 10);
const targetBatch = unprocessed.slice(0, batchLimit);

console.log(`🚀 Menjalankan ekstraksi Smart Add untuk ${targetBatch.length} iklan...`);

let successCount = 0;
let failCount = 0;

for (let i = 0; i < targetBatch.length; i++) {
  const item = targetBatch[i];
  console.log(`\n[${i + 1}/${targetBatch.length}] Memproses ${item.isFolder ? '[MULTI-POSISI]' : '[SINGLE]'}: ${item.name.slice(0, 75)}...`);

  try {
    let srcPath = '';
    let cleanCaption = '';
    let slideCount = 1;

    if (item.isFolder) {
      const folderFiles = fs.readdirSync(item.path);
      // Primary poster is slide 1 or first jpg
      const slide1 =
        folderFiles.find(f => /_01\.(jpg|jpeg|png)$/i.test(f)) ||
        folderFiles.find(f => /\.(jpg|jpeg|png)$/i.test(f));
      if (!slide1) throw new Error(`Tidak ditemukan gambar poster di folder ${item.path}`);
      srcPath = path.join(item.path, slide1);

      // Read iklan_info.json if present
      const infoJsonPath = path.join(item.path, 'iklan_info.json');
      let adInfo = null;
      if (fs.existsSync(infoJsonPath)) {
        try {
          adInfo = JSON.parse(fs.readFileSync(infoJsonPath, 'utf8'));
        } catch {}
      }

      cleanCaption = adInfo
        ? `${adInfo.judul_atau_perusahaan} (Paket Iklan ${adInfo.jumlah_posisi_slide} Slide Multi-Posisi)`
        : item.name;
      slideCount = adInfo
        ? adInfo.jumlah_posisi_slide
        : folderFiles.filter(f => /\.(jpg|jpeg|png)$/i.test(f)).length;
    } else {
      srcPath = item.path;
      cleanCaption = item.name.replace(/\.(jpg|jpeg|png)$/i, '');
      cleanCaption = cleanCaption.replace(/_[0-9]{4}-[0-9]{2}-[0-9]{2}_.*/, '');
      cleanCaption = cleanCaption.replace(/^[^_]+_/, '');
      cleanCaption = cleanCaption.replace(/_/g, ' ');
    }

    // Baca gambar sebagai base64
    const imgBuf = fs.readFileSync(srcPath);
    const imageBase64 = imgBuf.toString('base64');

    // Panggil Gemini 3.8 melalui smartJobExtractorService
    const jobData = await extractSmartJobAd({
      imageBase64,
      postText: cleanCaption,
    });

    if (!jobData || !jobData.title || !jobData.company_name) {
      throw new Error(`Data tidak lengkap dari AI: ${JSON.stringify(jobData)}`);
    }

    console.log(`   ✨ AI Result: [${jobData.company_name}] - ${jobData.title} (${jobData.category} | ${jobData.location_city})`);

    // Salin poster ke public/uploads/posters & terapkan sensor privasi LOXER
    const ext = path.extname(srcPath) || '.jpg';
    const destPosterName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
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
      processedMap[item.id] = {
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
    processedMap[item.id] = {
      job_id: jobId,
      title: jobData.title,
      company: cleanCompName,
      isFolder: item.isFolder,
      processed_at: now,
    };
    saveCheckpointAtomic(processedMap);

    successCount++;
    console.log(`   ✅ Lowongan berhasil dipublikasikan (ID: ${jobId})`);
  } catch (err) {
    failCount++;
    console.error(`   ❌ Gagal memproses ${item.name}:`, err.message);
  }
}

console.log('\n======================================================');
console.log(`🎉 Batch selesai! Berhasil: ${successCount}, Gagal: ${failCount}`);
console.log(`📊 Total semua lowongan terpasang: ${Object.keys(processedMap).length}`);
console.log('======================================================');
