import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';

const USER_DATA_DIR = path.resolve('./data/browser-fb-profile');

async function main() {
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  console.log('[LOGIN FACEBOOK] Mempersiapkan profil browser di:', USER_DATA_DIR);

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    locale: 'id-ID',
    args: [
      '--no-sandbox',
      '--disable-notifications',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  console.log('[LOGIN FACEBOOK] Mengarahkan ke https://www.facebook.com ...');
  try {
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (err) {
    console.warn('[LOGIN FACEBOOK] Peringatan navigasi:', err.message);
  }

  console.log('\n===============================================================');
  console.log('[LOGIN FACEBOOK] Jendela browser telah dibuka di layar.');
  console.log('Silakan login ke akun Facebook Anda.');
  console.log('Setelah berhasil login dan masuk ke Beranda / Feed,');
  console.log('tekan [ENTER] di terminal ini untuk menyimpan sesi & keluar.');
  console.log('===============================================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const cleanup = async () => {
    rl.close();
    console.log('\n[LOGIN FACEBOOK] Menyimpan sesi & menutup browser secara aman...');
    try {
      await context.close();
      console.log('✅ Sesi Facebook tersimpan di:', USER_DATA_DIR);
    } catch (err) {
      console.error('❌ Gagal menutup konteks browser:', err.message);
    }
  };

  process.on('SIGINT', async () => {
    console.log('\n[LOGIN FACEBOOK] Menerima interupsi (SIGINT)...');
    await cleanup();
    process.exit(0);
  });

  await new Promise((resolve) => {
    rl.question('', () => {
      resolve();
    });
  });

  await cleanup();
}

main().catch((err) => {
  console.error('❌ Fatal error pada login-fb:', err);
  process.exit(1);
});
