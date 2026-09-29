import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { extractPostWithAI } from '../services/fbAiExtractor.js';
import { ingestToLoxer, ensureScrapedPostsTable } from '../services/fbIngestService.js';
import { getLocalDb } from '../server/localDb.js';

// Configuration
const DEFAULT_GROUP_URL = process.env.FB_GROUP_URL || 'https://www.facebook.com/groups/719722324747243?locale=id_ID';
const USER_DATA_DIR = path.resolve('./data/browser-fb-profile');
const UPLOADS_DIR = path.resolve('./public/uploads/fb_scraped');

// Parse CLI flags
const args = process.argv.slice(2);
const IS_ONCE = args.includes('--once');
const IS_HEADLESS = !args.includes('--head') && !args.includes('--no-headless');
const INTERVAL_MINUTES = (() => {
  const idx = args.indexOf('--interval');
  return idx !== -1 && args[idx + 1] ? Number(args[idx + 1]) : 15;
})();
const GROUP_URL = (() => {
  const idx = args.indexOf('--url');
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : DEFAULT_GROUP_URL;
})();
const POST_LIMIT = (() => {
  const idx = args.indexOf('--limit');
  return idx !== -1 && args[idx + 1] ? Number(args[idx + 1]) : 7;
})();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs = 3000, maxMs = 7000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(delay);
}

/**
 * Download image from URL via Playwright context and save to disk
 */
async function downloadImage(page, srcUrl, filename) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const destPath = path.join(UPLOADS_DIR, filename);

  try {
    const response = await page.request.get(srcUrl, { timeout: 30000 });
    if (response.ok()) {
      const buffer = await response.body();
      fs.writeFileSync(destPath, buffer);
      return destPath;
    }
  } catch (err) {
    console.warn(`[fb-worker] Gagal mengunduh gambar ${srcUrl.slice(0, 50)}...:`, err.message);
  }
  return null;
}

/**
 * Main scraping routine for target Facebook group
 */
async function runScrapeCycle() {
  console.log('\n===============================================================');
  console.log(`🤖 [FB WORKER] Memulai siklus pemantauan grup Facebook...`);
  console.log(`   - Target: ${GROUP_URL}`);
  console.log(`   - Mode: ${IS_ONCE ? 'Single Run (--once)' : `Daemon (Polling setiap ${INTERVAL_MINUTES} menit)`}`);
  console.log(`   - Headless: ${IS_HEADLESS}`);
  console.log(`   - Limit: Maksimal ${POST_LIMIT} postingan teratas`);
  console.log('===============================================================');

  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  ensureScrapedPostsTable();
  const db = getLocalDb();

  let context = null;
  try {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: IS_HEADLESS,
      viewport: { width: 1280, height: 800 },
      locale: 'id-ID',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-notifications',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('[fb-worker] Membuka URL grup...');
    await page.goto(GROUP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Tunggu sebentar untuk render
    await sleep(4000);

    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
      console.warn('⚠️ [fb-worker] PERINGATAN: Sesi Facebook belum login atau terkena checkpoint.');
      console.warn('   Silakan jalankan script interaktif: "node scripts/login-fb.mjs" sekali untuk login.');
      await context.close();
      return { success: false, reason: 'NOT_LOGGED_IN' };
    }

    // Scroll perlahan (300-600px) untuk memicu lazy loading postingan
    console.log('[fb-worker] Menggulir feed perlahan untuk memuat postingan terkini...');
    for (let i = 0; i < 5; i++) {
      const scrollStep = Math.floor(Math.random() * 300) + 350;
      await page.evaluate((step) => window.scrollBy(0, step), scrollStep);
      await sleep(1500);
    }

    // Ekstrak elemen-elemen postingan dari feed
    console.log('[fb-worker] Mengumpulkan postingan teratas dari DOM...');
    const rawPosts = await page.evaluate((maxLimit) => {
      // Find candidate feed containers or role="article" or main cards
      const feed = document.querySelector('div[role="feed"]') || document.querySelector('div[role="main"]') || document.body;
      const elements = Array.from(feed.querySelectorAll('div[role="article"], div[data-ad-preview="message"], div[class*="x1yztbdb"]'))
        .filter((el) => {
          // Must have substantial text or images
          const text = el.innerText || '';
          return text.trim().length > 15 || el.querySelectorAll('img').length > 0;
        });

      const uniquePosts = [];
      const seenSignatures = new Set();

      for (let idx = 0; idx < elements.length; idx++) {
        if (uniquePosts.length >= maxLimit) break;
        const el = elements[idx];

        // Extract caption text
        const textElements = Array.from(el.querySelectorAll('div[dir="auto"], [data-ad-preview="message"]'));
        const textParts = textElements
          .map((t) => t.innerText.trim())
          .filter((t) => t.length > 5 && !t.includes('Suka') && !t.includes('Komentari') && !t.includes('Bagikan'));
        const caption = textParts.join('\n');

        // Extract author name
        const authorEl = el.querySelector('h2 a, h3 a, strong a, a[role="link"] strong, a[role="link"] span');
        const author = authorEl ? authorEl.innerText.trim() : '';

        // Extract permalink if available
        let permalink = '';
        const specificPostLink = el.querySelector('a[href*="/posts/"], a[href*="/permalink/"], a[href*="multi_permalinks"]');
        if (specificPostLink && specificPostLink.href) {
          permalink = specificPostLink.href.split('?')[0];
        }

        // Deduplication signature based on author and text
        const signature = (author + '::' + (caption || `item_${idx}`).slice(0, 120)).trim();
        if (!caption && el.querySelectorAll('img').length === 0) continue;
        if (seenSignatures.has(signature)) continue;
        seenSignatures.add(signature);

        if (!permalink) {
          // Stable fallback ID based on content
          let hashNum = 0;
          for (let i = 0; i < signature.length; i++) {
            hashNum = ((hashNum << 5) - hashNum) + signature.charCodeAt(i);
            hashNum |= 0;
          }
          permalink = `https://www.facebook.com/groups/719722324747243/posts/post_${Math.abs(hashNum).toString(36)}`;
        }

        // Extract image URLs (filter out emojis, icons, and avatars)
        const imgElements = Array.from(el.querySelectorAll('img'));
        const validImages = [];
        for (const img of imgElements) {
          const src = img.src || '';
          const w = img.naturalWidth || img.width || 0;
          const h = img.naturalHeight || img.height || 0;
          const isFbCdn = src.includes('fbcdn.net') || src.includes('scontent');
          const notEmoji = !src.includes('emoji.php') && !src.includes('/images/emoji/');
          const notAvatar = !img.closest('[aria-label*="Profil"], [aria-label*="Profile"]');

          if (isFbCdn && notEmoji && notAvatar && (w === 0 || w >= 100) && (h === 0 || h >= 100)) {
            if (!validImages.includes(src)) {
              validImages.push(src);
            }
          }
        }

        uniquePosts.push({
          permalink,
          author,
          caption,
          imageUrls: validImages,
        });
      }

      return uniquePosts;
    }, POST_LIMIT);

    console.log(`[fb-worker] Berhasil mengidentifikasi ${rawPosts.length} postingan kandidat.`);

    let processedCount = 0;
    let skippedCount = 0;

    for (let idx = 0; idx < rawPosts.length; idx++) {
      const item = rawPosts[idx];
      const postUrl = item.permalink;
      console.log(`\n---------------------------------------------------------------`);
      console.log(`[fb-worker] [${idx + 1}/${rawPosts.length}] Memproses Post: ${postUrl}`);

      // Cek duplikasi di DB
      const existing = db.prepare('SELECT id FROM fb_scraped_posts WHERE post_url = ?').get(postUrl);
      if (existing) {
        console.log(`[fb-worker] ⏩ Postingan sudah ada di DB (ID: ${existing.id}). Melewati.`);
        skippedCount++;
        continue;
      }

      try {
        // Unduh gambar-gambar postingan
        const localImagePaths = [];
        for (let imgIdx = 0; imgIdx < item.imageUrls.length; imgIdx++) {
          const imgSrc = item.imageUrls[imgIdx];
          const filename = `fb_img_${Date.now()}_${idx}_${imgIdx}.jpg`;
          const savedPath = await downloadImage(page, imgSrc, filename);
          if (savedPath) {
            localImagePaths.push(savedPath);
          }
        }

        console.log(`[fb-worker] Menjalankan AI Vision Multimodal (9Router)...`);
        console.log(`   - Caption: ${item.caption ? item.caption.slice(0, 100) + '...' : '(Teks kosong)'}`);
        console.log(`   - Gambar Tersimpan: ${localImagePaths.length} file`);

        const aiResult = await extractPostWithAI({
          postText: item.caption,
          imageBuffers: localImagePaths,
          postUrl,
        });

        console.log(`[fb-worker] Klasifikasi AI: [${aiResult.category}] Confidence: ${aiResult.confidence_score}%`);

        // Simpan ke SQLite database
        const ingestRes = await ingestToLoxer({
          postUrl,
          authorName: item.author,
          rawCaption: item.caption,
          imagePaths: localImagePaths,
          aiResult,
        });

        if (ingestRes.success) {
          processedCount++;
          console.log(`[fb-worker] ✅ Postingan berhasil di-ingest (Entity: ${ingestRes.entityType} ID: ${ingestRes.entityId})`);
        }
      } catch (postError) {
        // Penanganan error terisolasi: log error dan lanjutkan loop
        console.error(`❌ [fb-worker] Gagal memproses postingan ${postUrl}:`, postError.message);
      }

      // Jeda acak antar postingan (3 - 7 detik) untuk keamanan sesi
      console.log('[fb-worker] Menunggu jeda aman sebelum postingan berikutnya...');
      await randomDelay(3000, 7000);
    }

    console.log('\n===============================================================');
    console.log(`🎉 [FB WORKER] Siklus Selesai:`);
    console.log(`   - Total Postingan Ditemukan: ${rawPosts.length}`);
    console.log(`   - Berhasil Diproses & Ingest: ${processedCount}`);
    console.log(`   - Dilewati (Sudah Ada / Skip): ${skippedCount}`);
    console.log('===============================================================\n');

    await context.close();
    return { success: true, processedCount, skippedCount, totalFound: rawPosts.length };
  } catch (cycleError) {
    if (context) {
      try {
        await context.close();
      } catch {}
    }
    console.error('❌ [FB WORKER] Terjadi kesalahan dalam siklus worker:', cycleError.message);
    return { success: false, error: cycleError.message };
  }
}

/**
 * Main process loop
 */
async function main() {
  if (IS_ONCE) {
    await runScrapeCycle();
    process.exit(0);
  } else {
    console.log(`[FB WORKER] Berjalan dalam mode daemon (polling setiap ${INTERVAL_MINUTES} menit). Tekan Ctrl+C untuk berhenti.`);
    await runScrapeCycle();

    const intervalMs = INTERVAL_MINUTES * 60 * 1000;
    setInterval(async () => {
      await runScrapeCycle();
    }, intervalMs);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error di worker:', err);
  process.exit(1);
});
