import crypto from 'node:crypto';
import { getLocalDb, hashPassword } from '../server/localDb.js';

/**
 * Ensure scraping history table exists
 */
export function ensureScrapedPostsTable() {
  const db = getLocalDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS fb_scraped_posts (
      id TEXT PRIMARY KEY,
      post_url TEXT UNIQUE,
      author_name TEXT,
      category TEXT,
      confidence_score INTEGER,
      raw_caption TEXT,
      image_paths TEXT,
      ai_payload TEXT,
      status TEXT DEFAULT 'processed',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

/**
 * Generate a short deterministic hash from a string
 */
function createShortHash(input) {
  return crypto.createHash('sha256').update(String(input || crypto.randomUUID())).digest('hex').slice(0, 10);
}

/**
 * Ingest extracted Facebook post data into SQLite database
 *
 * @param {Object} payload
 * @param {string} payload.postUrl Facebook post permalink / URL
 * @param {string} [payload.authorName] Post author name
 * @param {string} [payload.rawCaption] Raw post caption
 * @param {Array<string>} [payload.imagePaths] Saved image paths on disk / public URL
 * @param {Object} payload.aiResult Output from extractPostWithAI
 * @returns {Promise<Object>} Ingestion outcome details
 */
export async function ingestToLoxer({
  postUrl,
  authorName = '',
  rawCaption = '',
  imagePaths = [],
  aiResult,
}) {
  if (!postUrl) {
    throw new Error('postUrl is required for ingestion');
  }
  if (!aiResult) {
    throw new Error('aiResult is required for ingestion');
  }

  ensureScrapedPostsTable();
  const db = getLocalDb();

  // 1. Cek Duplikasi: Query SELECT id FROM fb_scraped_posts WHERE post_url = ?
  const existingPost = db.prepare('SELECT id FROM fb_scraped_posts WHERE post_url = ?').get(postUrl);
  if (existingPost) {
    console.log(`[fbIngestService] Postingan sudah ada sebelumnya (ID: ${existingPost.id}). Melewati ingest.`);
    return {
      success: true,
      skipped: true,
      reason: 'DUPLICATE_POST',
      scrapedId: existingPost.id,
    };
  }

  const category = aiResult.category || 'PELAMAR_KERJA';
  const confidenceScore = Number(aiResult.confidence_score) || 80;
  const scrapedId = `fb_post_${createShortHash(postUrl + Date.now())}`;
  const now = new Date().toISOString();
  const imagePathsJson = JSON.stringify(imagePaths || []);
  const aiPayloadJson = JSON.stringify(aiResult);

  // Staging Moderation Variables
  let entityType = 'talent_post';
  let entityId = null;
  const modQueueId = `mod_fb_${crypto.randomUUID().slice(0, 8)}`;
  const modStatus = confidenceScore >= 85 ? 'approved' : 'pending';

  // Execute in Transaction for WAL integrity
  db.exec('BEGIN TRANSACTION;');
  try {
    // 2. Insert into fb_scraped_posts
    db.prepare(`
      INSERT INTO fb_scraped_posts (
        id, post_url, author_name, category, confidence_score,
        raw_caption, image_paths, ai_payload, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      scrapedId,
      postUrl,
      authorName || aiResult.candidate?.full_name || 'Facebook User',
      category,
      confidenceScore,
      rawCaption,
      imagePathsJson,
      aiPayloadJson,
      category === 'SPAM' ? 'spam' : 'processed',
      now
    );

    if (category === 'PELAMAR_KERJA') {
      entityType = 'talent_post';
      const candidate = aiResult.candidate || {};
      const candidateName = candidate.full_name || authorName || 'Pencari Kerja FB';
      const userHash = createShortHash(postUrl + candidateName);
      const userId = `usr_fb_${userHash}`;
      const userEmail = `${userHash}@loxer.local`;
      const seekerId = `sek_fb_${userHash}`;
      const postId = `tal_fb_${userHash}`;
      entityId = postId;

      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').get(userId, userEmail);
      if (!existingUser) {
        const dummyPasswordHash = hashPassword(crypto.randomUUID());
        db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
          userId,
          userEmail,
          dummyPasswordHash,
          now
        );
        db.prepare('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)').run(
          userId,
          userEmail,
          'seeker',
          now
        );
      }

      // Check or Insert seeker_profiles
      const existingSeeker = db.prepare('SELECT id FROM seeker_profiles WHERE id = ? OR user_id = ?').get(seekerId, userId);
      const primaryPhoto = (imagePaths && imagePaths.length > 0) ? imagePaths[0] : '';
      const domicileCity = candidate.domicile_city || 'Cimahi/Bandung';
      const aboutText = aiResult.ai_summary || candidate.headline || rawCaption || 'Pencari kerja aktif dari Grup Facebook';

      if (!existingSeeker) {
        db.prepare(`
          INSERT INTO seeker_profiles (
            id, user_id, full_name, photo_url, domicile_city, about, phone,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          seekerId,
          userId,
          candidateName,
          primaryPhoto,
          domicileCity,
          aboutText,
          candidate.phone || '',
          now,
          now
        );
      } else {
        // Update contact or photo if newly provided
        db.prepare(`
          UPDATE seeker_profiles
          SET full_name = COALESCE(NULLIF(?, ''), full_name),
              phone = COALESCE(NULLIF(?, ''), phone),
              domicile_city = COALESCE(NULLIF(?, ''), domicile_city),
              about = COALESCE(NULLIF(?, ''), about),
              photo_url = COALESCE(NULLIF(?, ''), photo_url),
              updated_at = ?
          WHERE id = ?
        `).run(candidateName, candidate.phone || '', domicileCity, aboutText, primaryPhoto, now, existingSeeker.id);
      }

      // Insert seeker_education
      if (Array.isArray(candidate.education) && candidate.education.length > 0) {
        for (const edu of candidate.education) {
          const eduId = `edu_fb_${crypto.randomUUID().slice(0, 8)}`;
          db.prepare(`
            INSERT INTO seeker_education (
              id, seeker_id, school_name, degree, major, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            eduId,
            seekerId,
            edu.school_name || 'Pendidikan',
            edu.degree || 'Umum',
            edu.major || '',
            now
          );
        }
      }

      // Insert seeker_experience
      if (Array.isArray(candidate.experience) && candidate.experience.length > 0) {
        for (const exp of candidate.experience) {
          const expId = `exp_fb_${crypto.randomUUID().slice(0, 8)}`;
          db.prepare(`
            INSERT INTO seeker_experience (
              id, seeker_id, company_name, position, description, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            expId,
            seekerId,
            exp.company_name || 'Pengalaman Sebelumnya',
            exp.position || 'Staf / Operator',
            exp.period || '',
            now
          );
        }
      }

      // Insert seeker_skills
      if (Array.isArray(candidate.skills) && candidate.skills.length > 0) {
        for (const skill of candidate.skills) {
          const sklId = `skl_fb_${crypto.randomUUID().slice(0, 8)}`;
          db.prepare(`
            INSERT INTO seeker_skills (
              id, seeker_id, skill_name, created_at
            ) VALUES (?, ?, ?, ?)
          `).run(sklId, seekerId, String(skill).trim(), now);
        }
      }

      // Insert into talent_marketplace_posts
      const existingTalentPost = db.prepare('SELECT id FROM talent_marketplace_posts WHERE id = ?').get(postId);
      if (!existingTalentPost) {
        const headline = candidate.headline || `Siap Kerja - ${candidateName}`;
        const skillsJson = JSON.stringify(candidate.skills || []);
        db.prepare(`
          INSERT INTO talent_marketplace_posts (
            id, seeker_id, user_id, headline, category, bio, bio_summary,
            skills, availability_status, domicile_city, whatsapp_number,
            photo_url, badge, is_published, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          postId,
          seekerId,
          userId,
          headline,
          'Umum & Jasa',
          aboutText,
          aboutText.slice(0, 200),
          skillsJson,
          'available',
          domicileCity,
          candidate.phone || '',
          primaryPhoto,
          'SIAP KERJA',
          1,
          now,
          now
        );
      }
    } else if (category === 'IKLAN_LOKER') {
      entityType = 'job_listing';
      const jobPosting = aiResult.job_posting || {};
      const companyName = jobPosting.company_name || authorName || 'Mitra Loxer Facebook';
      const compHash = createShortHash(companyName);
      const jobListingId = `job_fb_${crypto.randomUUID().slice(0, 8)}`;
      entityId = jobListingId;

      // Cari atau buatkan placeholder di companies
      let company = db.prepare('SELECT id FROM companies WHERE name = ?').get(companyName);
      let compId = company?.id;

      if (!compId) {
        compId = `comp_fb_${compHash}`;
        const empUserId = `usr_emp_${compHash}`;
        const empEmail = `employer_${compHash}@loxer.local`;

        // Check employer user
        const existingEmpUser = db.prepare('SELECT id FROM users WHERE id = ?').get(empUserId);
        if (!existingEmpUser) {
          db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
            empUserId,
            empEmail,
            hashPassword(crypto.randomUUID()),
            now
          );
          db.prepare('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)').run(
            empUserId,
            empEmail,
            'employer',
            now
          );
        }

        db.prepare(`
          INSERT INTO companies (
            id, user_id, name, industry, city, description, verified, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          compId,
          empUserId,
          companyName,
          'Umum',
          jobPosting.location_city || 'Cimahi/Bandung',
          aiResult.ai_summary || 'Perusahaan penyedia lowongan kerja',
          0,
          now,
          now
        );
      }

      const jobTitle = jobPosting.title || 'Lowongan Kerja Terbuka';
      const jobCity = jobPosting.location_city || 'Cimahi/Bandung';
      const jobReqs = jobPosting.requirements || '';
      const jobType = jobPosting.job_type || 'full-time';
      const jobStatus = confidenceScore >= 85 ? 'active' : 'draft';
      const jobDesc = `${aiResult.ai_summary || 'Informasi lowongan dari Facebook Group.'}\n\nKontak: ${jobPosting.contact_phone || '-'}\nSumber: ${postUrl}`;

      db.prepare(`
        INSERT INTO job_listings (
          id, company_id, title, category, location_city, job_type,
          requirements, description, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        jobListingId,
        compId,
        jobTitle,
        'Umum',
        jobCity,
        jobType,
        jobReqs,
        jobDesc,
        jobStatus,
        now,
        now
      );
    } else {
      // SPAM
      entityType = 'spam_post';
      entityId = scrapedId;
    }

    // 3. Simpan ke Staging (Moderasi Web Perencanaan):
    // Tiket di tabel moderation_queue
    if (entityId) {
      db.prepare(`
        INSERT INTO moderation_queue (
          id, entity_type, entity_id, reason, ai_score, ai_flags, status,
          risk_score, flags, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        modQueueId,
        entityType,
        entityId,
        'Auto-scraped from FB Group via AI Agent',
        confidenceScore,
        JSON.stringify([category]),
        modStatus,
        category === 'SPAM' ? 95 : 0,
        JSON.stringify(['fb_scrape', category.toLowerCase()]),
        now
      );
    }

    db.exec('COMMIT;');

    console.log(`[fbIngestService] ✅ Ingest sukses: [${category}] ${entityType} ID: ${entityId}, Mod Ticket: ${modQueueId}`);
    return {
      success: true,
      scrapedId,
      entityType,
      entityId,
      modQueueId,
      modStatus,
      category,
      confidenceScore,
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('[fbIngestService] ❌ Ingest failed, transaction rolled back:', err.message);
    throw err;
  }
}
