# PROMPT & SPEC IMPLEMENTATION: REAL-TIME FB GROUP SCRAPER & AI EXTRACTION PIPELINE
**Target Directory:** `C:\Users\SERVER PC\Pictures\LOXER-main`
**Execution Agent:** Antigravity Autonomous Agent (Autonomous Mode: Active)
**Target Group Example:** LOKER CIMAHI BANDUNG 2026 X LOXER.web.id (`https://www.facebook.com/groups/719722324747243`)
**Target Database:** SQLite `data/loxer.db` (Schema: `data/schema.sql`)
**AI Vision API:** 9Router Local Endpoint (`http://192.168.1.14:20128/v1`, Model: `ag/gemini-3.8-flash-high`)

---

## 📌 1. ROLE & MISSION
Bertindaklah sebagai Senior Full-Stack & Automation Engineer. Tugasmu adalah membangun pipeline scraping grup Facebook secara real-time dan full otomatis di dalam proyek **LOXER-main**. 

Pipeline ini harus:
1. Membuka dan membaca feed grup Facebook secara berkala menggunakan browser session yang persisten (anti-logout & anti-checkpoint).
2. Mengekstrak teks postingan beserta aset gambar (poster lowongan kerja atau gambar CV pelamar).
3. Melakukan OCR & Parsing cerdas berbasis **AI Multimodal Vision** via endpoint 9Router.
4. Mengklasifikasikan konten menjadi:
   - `PELAMAR_KERJA` (Pencari kerja, poster CV, permohonan kerja).
   - `IKLAN_LOKER` (Lowongan kerja, flyer perusahaan, loker harian/borongan).
   - `SPAM` (Judi, pinjol, konten tidak relevan).
5. Memasukkan data terstruktur ke database `data/loxer.db` (tabel `moderation_queue` untuk web perencanaan, serta tabel `seeker_profiles` / `talent_marketplace_posts` / `job_listings`).

---

## 🏗️ 2. DIRECTORY STRUCTURE & FILES TO CREATE

Buat dan sesuaikan file-file berikut di dalam `C:\Users\SERVER PC\Pictures\LOXER-main`:

```text
LOXER-main/
├── data/
│   └── browser-fb-profile/          # Folder persistent cookies/session Playwright
├── public/
│   └── uploads/
│       └── fb_scraped/              # Folder penyimpanan sementara gambar poster CV/loker
├── services/
│   ├── fbAiExtractor.js             # Modul integrasi AI Vision 9Router
│   └── fbIngestService.js           # Ingestion ke SQLite loxer.db & moderation_queue
├── scripts/
│   ├── login-fb.mjs                 # Script interaktif untuk login pertama kali
│   ├── fb-group-worker.mjs          # Background daemon/worker monitoring grup real-time
│   └── test-fb-pipeline.mjs         # Skrip unit test pengujian pipeline tanpa browser
└── PROMPT.md                        # Dokumen panduan ini
```

---

## ⚙️ 3. STEP-BY-STEP IMPLEMENTATION TASKS

### TUGAS 1: Modul Persistent Login (`scripts/login-fb.mjs`)
1. Gunakan library `playwright` (sudah tersedia di sistem atau install via npm jika belum).
2. Buat skrip ES Module yang meluncurkan browser Chromium dengan `launchPersistentContext`:
   - `userDataDir`: `path.resolve('./data/browser-fb-profile')`
   - `headless`: `false` (tampilkan jendela browser di layar Windows)
   - `args`: `['--no-sandbox', '--disable-notifications']`
3. Navigasikan ke `https://www.facebook.com`.
4. Cetak petunjuk di console:
   ```text
   ===============================================================
   [LOGIN FACEBOOK] Jendela browser telah dibuka di layar.
   Silakan login ke akun Facebook Anda.
   Setelah berhasil login dan masuk ke Beranda / Feed, 
   tekan [ENTER] di terminal ini untuk menyimpan sesi & keluar.
   ===============================================================
   ```
5. Tunggu input tombol Enter dari user via `readline`, kemudian tutup browser secara aman (`context.close()`).

---

### TUGAS 2: Modul Ekstraksi AI Vision Multimodal (`services/fbAiExtractor.js`)
1. Buat fungsi `extractPostWithAI({ postText, imageBuffers, postUrl })`.
2. Konfigurasi endpoint OpenAI-compatible:
   - `baseURL`: `http://192.168.1.14:20128/v1`
   - `apiKey`: `sk-8a5519a24dcaa639-lak6mu-729b8007` (atau baca dari `process.env.VITE_9ROUTER_KEY`)
   - `model`: `ag/gemini-3.8-flash-high`
3. Susun prompt sistem ketat dengan output **JSON murni (tanpa markdown backtick)**:
   ```json
   {
     "category": "PELAMAR_KERJA" | "IKLAN_LOKER" | "SPAM",
     "confidence_score": 90,
     "candidate": {
       "full_name": "Nama lengkap pelamar (baca dari poster CV)",
       "phone": "Nomor WhatsApp/HP",
       "email": "Email pelamar",
       "domicile_city": "Kota domisili (contoh: Cimahi, Bandung)",
       "headline": "Posisi/bidang yang diminati",
       "education": [{"school_name": "Nama Sekolah/Kampus", "degree": "SMP/SMA/S1"}],
       "experience": [{"position": "Nama Pekerjaan", "period": "Tahun/Durasi"}],
       "skills": ["Skill 1", "Skill 2"]
     },
     "job_posting": {
       "title": "Judul Posisi Lowongan",
       "company_name": "Nama Usaha/Perusahaan",
       "contact_phone": "Nomor WhatsApp pelamar/admin loker",
       "location_city": "Kota penempatan kerja",
       "requirements": "Kualifikasi dan syarat",
       "job_type": "full-time" | "part-time" | "freelance" | "harian"
     },
     "ai_summary": "Ringkasan analisis AI mengenai isi postingan"
   }
   ```
4. Encode setiap image buffer ke format base64 `data:image/jpeg;base64,{base64Data}` agar AI Vision dapat membaca seluruh teks di dalam poster CV/flyer loker (nama, nomor kontak, riwayat kerja).

---

### TUGAS 3: Service Ingest Database (`services/fbIngestService.js`)
1. Import helper database `getLocalDb` dari `../server/localDb.js`.
2. Pastikan tabel histori scraping tersedia:
   ```sql
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
   ```
3. Logic Ingestion:
   - **Cek Duplikasi**: Query `SELECT id FROM fb_scraped_posts WHERE post_url = ?`. Jika sudah ada, lewati.
   - **Simpan ke Staging (Moderasi Web Perencanaan)**:
     Setiap data yang masuk dibuatkan tiket di tabel `moderation_queue`:
     - `id`: `mod_fb_${crypto.randomUUID().slice(0, 8)}`
     - `entity_type`: `category === 'PELAMAR_KERJA' ? 'talent_post' : 'job_listing'`
     - `entity_id`: ID record data yang baru dibuat.
     - `reason`: `'Auto-scraped from FB Group via AI Agent'`
     - `ai_score`: `confidence_score`
     - `status`: `confidence_score >= 85 ? 'approved' : 'pending'`
   - **Jika `PELAMAR_KERJA`**:
     - Insert user ke `users` (id: `usr_fb_${hash}`, email dummy: `hash@loxer.local`).
     - Insert ke `users_meta` (role: `'seeker'`).
     - Insert ke `seeker_profiles` (`full_name`, `phone`, `domicile_city`, `about`).
     - Insert riwayat ke `seeker_education` dan `seeker_experience`.
     - Insert ke `talent_marketplace_posts` (`headline`, `bio`, `skills`, status: `'available'`).
   - **Jika `IKLAN_LOKER`**:
     - Cari atau buatkan placeholder di `companies` (nama perusahaan/pemilik loker).
     - Insert ke `job_listings` (`title`, `location_city`, `requirements`, `job_type`, status: `confidence_score >= 85 ? 'active' : 'draft'`).

---

### TUGAS 4: Real-Time FB Group Watcher Worker (`scripts/fb-group-worker.mjs`)
1. Buka browser Playwright dengan `launchPersistentContext` menggunakan folder `data/browser-fb-profile`:
   - `headless`: `true` (dapat dijalankan di background).
   - Simulasikan interaksi manusiawi (User-Agent wajar, viewport 1280x800).
2. Navigasikan ke URL target (misal: `https://www.facebook.com/groups/719722324747243?locale=id_ID`).
3. Alur Kerja Monitoring:
   - Tunggu container feed utama (`div[role="feed"]` atau `div[role="main"]`).
   - Lakukan scroll perlahan (300-600px) untuk memicu lazy load postingan terkini.
   - Ambil elemen postingan teratas (5-10 postingan terbaru).
   - Ekstrak:
     - Permalink / Timestamp URL.
     - Teks caption (`div[dir="auto"]`).
     - Tag gambar (`img` dengan `src` CDN Facebook yang bukan icon antarmuka).
   - Unduh gambar beresolusi penuh dan simpan ke `public/uploads/fb_scraped/`.
   - Jalankan `extractPostWithAI(...)` -> `ingestToLoxer(...)`.
4. Berikan jeda acak (delay 3 - 7 detik antar postingan) agar akun aman dari limit Facebook.
5. Jalankan polling berkala setiap 15 menit atau sediakan flag `--once` untuk single-run test.

---

### TUGAS 5: Verifikasi & Test Runner (`scripts/test-fb-pipeline.mjs`)
1. Buat skrip simulasi yang menguji pipeline tanpa harus membuka browser:
   - Gunakan sample payload caption: *"Manawian sugan Aya loker na modal KTP sareng ijazah SMP"* dan gambar CV Azqy Ahmad Saputra.
   - Panggil `extractPostWithAI`.
   - Panggil `ingestToLoxer`.
2. Validasi hasil di SQLite:
   - Pastikan record baru muncul di tabel `moderation_queue`.
   - Pastikan record baru muncul di `talent_marketplace_posts` / `seeker_profiles`.
   - Cetak log: *"Test Pipeline Passed 100%!"*

---

## 🛡️ CRITICAL RULES & CONSTRAINTS
1. **Keamanan Akun Facebook**:
   - Jangan gunakan scraping agresif berkecepatan tinggi. Selalu beri jeda random antar aksi (2-6 detik).
   - Selalu gunakan `browser-fb-profile` yang sama agar Facebook mendeteksi sesi login resmi.
2. **Penanganan Error Terisolasi**:
   - Jika satu postingan gagal di-parse oleh AI atau gambar rusak, tangkap dalam `try-catch`, log error-nya, dan lanjutkan ke postingan berikutnya (jangan biarkan loop worker mati).
3. **Integritas SQLite WAL**:
   - Database `data/loxer.db` sudah mengaktifkan `PRAGMA journal_mode = WAL;`. Gunakan transaksi (`BEGIN TRANSACTION` / prepared statement) saat menyimpan multi-tabel pelamar.

---

## 🚀 DEFINITION OF DONE (DOD)
1. Perintah `node scripts/login-fb.mjs` berhasil membuka browser, login FB, dan menyimpan sesi ke `data/browser-fb-profile`.
2. Perintah `node scripts/test-fb-pipeline.mjs` berhasil mengekstrak data contoh dan menyimpannya ke `data/loxer.db`.
3. Perintah `node scripts/fb-group-worker.mjs --once` sukses mengambil 5 postingan teratas dari grup FB, mengidentifikasi pelamar/loker melalui AI Vision, dan meneruskannya ke antrean web perencanaan Loxer (`moderation_queue`).
