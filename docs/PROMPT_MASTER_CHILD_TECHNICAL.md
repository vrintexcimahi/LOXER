# PROMPT IMPLEMENTASI TEKNIS — LOXER MASTER–CHILD

Versi 1.0 · 4 Oktober 2026 · Disesuaikan dengan repository LOXER-main.

Dokumen ini adalah prompt kerja untuk implementasi berikutnya, bukan pernyataan bahwa fitur sudah dibangun. Gunakan seluruh isi dokumen sebagai instruksi. Pertahankan tujuan bisnis prompt sumber: Mitra memperoleh cabang digital LOXER dengan URL, branding, pengguna, operasional, dan profit sendiri melalui satu core aplikasi.

## 1. Mandat dan batas pekerjaan

Anda bertindak sebagai engineer yang mengembangkan repository ini secara bertahap. Jangan membuat project baru, menduplikasi source per mitra, atau mengganti framework tanpa alasan teknis yang terukur. Pertahankan seeker, employer, freelancer/jasa, lowongan, lamaran, marketplace, admin, CMS, dan PWA yang sudah bekerja.

Mulai dengan audit kode terkini dan baseline. Dokumen ini memuat hasil inspeksi statis awal; validasi kembali sebelum coding karena repository dapat berubah. Bedakan fakta kode, perilaku yang telah diuji, dan desain yang baru diusulkan. Jangan menganggap catatan audit lama sebagai bukti test terbaru.

Kerjakan satu fase sampai acceptance criteria fase tersebut terpenuhi. Jangan menyatakan seluruh platform selesai apabila hanya P0 yang berhasil. Jangan mengubah database produksi, melakukan deploy, atau melakukan pembayaran nyata hanya untuk menguji fitur. Gunakan database test terpisah dan payment sandbox.

## 2. Fakta repository dan titik integrasi

- `package.json`: React 18, TypeScript, Vite 5, Tailwind, Supabase JS, Puck, Recharts. Tidak ada React Router dalam dependency yang dibaca.
- `src/App.tsx`: navigasi menggunakan pathname, state, History API, dan popstate. Audit seluruh navigasi sebelum menambahkan prefix tenant; jangan mengasumsikan routing Next.js.
- `src/lib/supabase.ts`: memilih Supabase atau adapter lokal. `VITE_USE_LOCAL_DB=true` memaksa mode lokal; konfigurasi cloud yang tidak valid juga menghasilkan mode lokal.
- `src/lib/localClient.ts`: adapter menyerupai Supabase; query dikirim ke `/api/local/db/query`, autentikasi ke `/api/local/auth/*`.
- `server/localApiHandler.js`: handler lokal, query generik, validasi role/ownership, dan modul operasional. Filter yang dikirim browser bukan batas keamanan tenant.
- `server/localDb.js`: SQLite melalui `node:sqlite`, database `data/loxer.db`, inisialisasi schema dan perubahan tambahan saat runtime. Terdapat fallback JWT secret; mode produksi harus menolak konfigurasi secret yang tidak aman sebelum fitur partner diaktifkan.
- `data/schema.sql` dan `supabase/migrations/`: dua jalur schema berbeda. Inventaris juga perubahan runtime di `server/localDb.js`, bukan hanya file SQL.
- `src/contexts/AuthContext.tsx`: login, metadata, provisioning OAuth, dan perbaikan default admin. Alur ini harus ditinjau agar signup/invite partner tidak dapat mengangkat role global.
- `src/lib/types.ts`: role existing adalah `seeker`, `employer`, `admin`, `superadmin`, `freelancer`. Jangan mengganti seluruh nilai existing menjadi uppercase.
- `api/admin/users.js` dan `api/admin/*`: endpoint cloud memakai validasi bearer token serta Supabase service role. Service role menuntut pengecekan akses eksplisit pada setiap operasi.
- `vite.config.ts`: memasang middleware lokal untuk dev/preview. `vercel.json`: rewrite non-API ke SPA. Middleware Vite bukan otomatis backend produksi di Vercel.
- `src/lib/productMarketplaceService.ts`: terdapat fallback produk/transaksi ke localStorage dan data contoh. Status transaksi marketplace bukan bukti pembayaran terverifikasi.
- Migration marketplace `20260420000000_create_marketplace_products_and_transactions.sql` memuat policy permisif `USING (true)`, `WITH CHECK (true)`, serta pengecualian `user_id LIKE 'usr-%'`. Ini temuan pada source migration, belum bukti keadaan database live. Audit dan ganti policy efektif sebelum tenant dipublikasikan.
- CMS: `src/components/puck/*`, `pages`; sinkronisasi/offline: `src/lib/realtimeSync.ts`, `src/lib/offlineSyncService.ts`, `src/registerSW.ts`. Semua berpotensi membawa state antartenant bila tidak diberi namespace.

Jangan membaca atau mencetak isi `.env`, token, hash password, dan credential dalam laporan. Cukup laporkan nama konfigurasi serta ada/tidaknya konfigurasi yang dibutuhkan.

## 3. Keputusan arsitektur awal

Gunakan satu aplikasi, shared database, logical tenant isolation, dan satu tenant master eksplisit. Gunakan `tenants.id` sebagai namespace data; gunakan `partners` untuk profil bisnis mitra dengan relasi unik `partners.tenant_id`. Jangan membuat dua identitas tenant yang harus ditebak atau dicocokkan berdasarkan slug.

Identity tetap global: cloud memakai `auth.users` dengan `users_meta`; lokal memakai `users` dengan `users_meta`. Jangan membuat tabel password baru untuk cloud. Membership dan profil operasional dipisahkan per tenant. Pertahankan uniqueness email dari autentikasi existing. Jangan mengubah email menjadi unique per tenant tanpa desain login baru.

`users_meta.home_tenant_id` hanya menentukan tujuan awal setelah login, bukan otorisasi dan bukan sumber atribusi order. Partner role ditempatkan di membership. Role global `admin`/`superadmin` tetap terpisah dari role tenant.

Default MVP: satu home tenant; beberapa membership hanya melalui invite/accept terverifikasi. Membuka Child lain tidak otomatis membuat membership atau memindahkan home tenant. Registrasi baru pada Child membuat membership pada tenant yang sudah diverifikasi server.

Arsitektur alur:

```text
Host/path -> trusted resolver -> authentication -> tenant membership/policy
                                                -> scoped application service
                                                -> repository -> SQLite/Postgres
                       |
                       +-> public tenant config -> React core + tenant branding

Payment webhook -> verified provider event -> persisted payment/order mapping
                -> transactional state transition -> outbox -> fulfillment/ledger
```

UI context hanya membawa konfigurasi dan state tampilan. Otorisasi selalu diputuskan server. Context server harus immutable per request; jangan menggunakan global mutable `TenantContext.set()` yang dapat bocor ketika request berjalan bersamaan.

## 4. Resolver dan URL

Konfigurasi usulan: `APP_BASE_DOMAIN`, `APP_PUBLIC_ORIGIN`, `PARTNER_CHILD_PANEL_ENABLED`, konfigurasi trusted proxy, serta allowlist origin development. Domain `loxer.id` di contoh bukan bukti bahwa DNS tersebut sudah tersedia.

Urutan resolusi:

1. Normalisasi host menjadi lowercase, hapus port/trailing dot dengan parser aman, validasi format. Percayai forwarded host hanya dari proxy yang terkonfigurasi.
2. Host master yang diizinkan dapat memakai `/p/{slug}` sebagai fallback. Tanpa prefix berarti tenant master.
3. Subdomain tunggal di bawah base domain dicocokkan dengan slug aktif. Reserved slug minimal `www`, `api`, `admin`, `auth`, `partner`, `static`, `assets`, `mail`, `support`.
4. Custom domain hanya boleh melalui mapping exact yang ownership-nya terverifikasi dan disetujui. Implementasi aktivasi domain ditunda P2.
5. Unknown host/slug menghasilkan 404; jangan diam-diam memakai master. Host tenant A dengan prefix tenant B harus ditolak.
6. Status suspended/terminated menghasilkan halaman status tanpa kebocoran data dan menolak operasi bisnis. Master control plane serta webhook settlement tetap berjalan melalui jalur khusus.
7. Untuk resource privat, cocokkan identity dengan membership aktif dan permission pada tenant hasil resolver. Return 401 untuk tanpa autentikasi, 403 untuk permission tidak cukup, 404 untuk resource di luar scope.

Path API fallback yang diusulkan adalah `/api/p/{slug}/...`; subdomain memakai `/api/...`. Slug pada path tetap input tidak terpercaya: server melakukan lookup, validasi status, membership, dan ownership. Jangan menentukan tenant dari body, query `tenant_id`, Referer, atau `X-Tenant-ID` mentah.

Buat helper navigasi pusat untuk mempertahankan prefix `/p/{slug}` pada link, redirect, auth, dan refresh. Audit link absolut existing termasuk `/browse`. Tambahkan route alias bila dibutuhkan tanpa memutus URL existing. Deep link `/p/andi/browse` harus berfungsi setelah refresh maupun back/forward.

## 5. Autentikasi dan otorisasi

Pertahankan provider autentikasi existing. Auth storage browser per origin bukan cookie lintas subdomain; jangan mengklaim session Supabase otomatis terbagi ke seluruh Child. MVP dapat login pada origin Child masing-masing. Jangan menaruh access/refresh token pada URL redirect.

Jika dibutuhkan perpindahan login lintas origin, rancang handoff code sekali pakai, berumur pendek, tersimpan hashed, terikat identity dan destination allowlist; redeem melalui backend. Jangan mengimplementasikan wildcard redirect. OAuth callback harus mengembalikan signup intent dari state server yang tervalidasi, bukan mempercayai localStorage untuk membership atau role.

Jika memilih BFF cookie, dokumentasikan perubahan alur, gunakan Secure/HttpOnly, SameSite yang sesuai, host-only cookie bila memungkinkan, CSRF token serta validasi Origin pada mutation. Jangan mengganti autentikasi existing setengah jalan. Pada fallback path, cookie path bukan batas keamanan: setiap request tetap wajib memvalidasi tenant.

Permission minimum:

- Global `superadmin`: tenant provisioning, global policies, cross-tenant support dengan reason dan audit; impersonation hanya bila fase tersendiri siap.
- Global `admin`: operasi master yang diberikan eksplisit; jangan otomatis memberi semua kewenangan superadmin.
- `partner_owner`: branding, katalog yang diizinkan, pengguna operasional, undang staff, order, laporan, withdrawal milik tenant sendiri.
- `partner_admin`: operasi Child sesuai grant, tanpa transfer ownership, ubah biaya master, atau menyetujui payout sendiri.
- `partner_staff`: deny by default, lalu grant permission tertentu; assignment menjadi syarat tambahan jika modul membutuhkannya.
- `seeker`, `employer`, `freelancer`, customer: akses resource milik sendiri sesuai modul dan membership. Customer dapat menjadi capability transaksi, tidak harus mengganti role identity.

Sediakan permission registry seperti `user.view`, `user.manage`, `order.create`, `order.view`, `catalog.manage`, `content.manage`, `staff.manage`, `wallet.view`, `withdrawal.request`, `analytics.view`. Grant dari client tidak pernah dipercaya. Perubahan role/status harus membatalkan permission cache dan berlaku pada request berikutnya.

Partner hanya menerima DTO operasional yang diizinkan. Dilarang menampilkan hash, OTP, token, secret, credential pembayaran, seluruh data perangkat, atau profil privat tenant lain. Partner tidak dapat membekukan identity global seorang user; suspend hanya membership/akses lokal sesuai policy.

## 6. Kontrak database yang harus dibuat

Nama berikut adalah rancangan baru. Tentukan tipe FK berdasarkan schema existing, terutama perbedaan UUID cloud dan text ID lokal. Semua waktu UTC, nominal integer rupiah untuk IDR, rate integer basis points; jangan menghitung uang dengan float. Validasi batas integer pada JSON/JavaScript.

- `tenants`: id, kind(master/child), slug unique case-insensitive, status(pending/active/suspended/terminated), config_version, created_at, updated_at, deleted_at. Satu master melalui constraint/migration yang idempotent.
- `partners`: id, tenant_id unique FK, partner_code unique, business_name, display_name, contact fields, level/plan_id, branding_json, settings_json. Owner ditentukan membership; bila memakai owner_user_id, jaga konsistensinya dalam transaksi yang sama.
- `tenant_memberships`: tenant_id, user_id, role, status, joined_at, timestamps; unique(tenant_id,user_id). Permission tambahan melalui role/permission tables, bukan JSON bebas dari frontend.
- `users_meta.home_tenant_id`: nullable selama migrasi, diarahkan ke master untuk user lama setelah verifikasi. Tidak memindahkan user lama ke Child.
- `tenant_user_profiles`: tenant_id, user_id, field operasional yang diizinkan, status; FK komposit ke membership. Profile global tidak dibuka seluruhnya kepada semua partner.
- `tenant_domains`: tenant_id, normalized_domain unique, verification_token_hash, verification_status, ssl_status, verified_at. P2; secret verifikasi tidak dikirim sebagai config publik.
- `tenant_features`, `partner_plans`: feature/limit yang dikendalikan master. Effective feature = global gate AND plan entitlement AND tenant enablement; tenant tidak bisa menghidupkan fitur yang dimatikan master.
- `master_products`: produk layanan resmi LOXER, SKU unique, fulfillment_type, status, currency, cost/partner_price, retail/min/max price, pricing_version. Jangan menyamakan barang member existing dengan katalog produk master.
- `partner_products`: tenant_id, master_product_id, enabled, selling_price, featured, display_order; unique(tenant_id,master_product_id). Cost master tidak writable oleh partner.
- `orders`, `order_items`: tenant_id, customer_user_id, status, currency, amount, idempotency_key, item snapshots SKU/title/price/cost/commission rule version. Snapshot tidak berubah ketika harga master berubah.
- `payments`, `payment_events`: order_id, tenant_id, provider, provider_reference, amount, currency, status; event unique(provider,event_id). Kunci referensi provider harus unik sesuai scope provider.
- `commissions`: tenant_id, order_item_id, rule snapshot, amount, status, available_at, reversal_of; unique business event untuk mencegah komisi ganda.
- `partner_wallets`, `wallet_ledger`, `withdrawals`: tenant_id, currency, account buckets, immutable journal references, payout/reference/idempotency keys. Saldo adalah proyeksi ledger, bukan angka yang dapat diedit UI.
- `outbox_events`: tenant_id, type, aggregate_id, deduplication_key, payload terbatas, attempts, next_retry_at, processed_at. Dibuat atomik bersama business mutation.
- P2: `leads`, `crm_notes`, `customer_tags`, `quotations`, `staff_invitations`, konten/banner tenant dan event analytics. Tetap gunakan ownership dan scope yang sama.

Klasifikasikan tabel existing sebelum menambah kolom:

- Tenant-owned: companies, company_members, job_listings, applications, interview_invitations, jasa_ads, talent_marketplace_posts, direct_job_offers, marketplace_products, marketplace_transactions, notifications dan konten yang diubah Child. Validasi relasi induk dan FK antartabel agar tidak menunjuk tenant lain.
- Identity/global: auth identity, users_meta, konfigurasi security master. Jangan mengubah seluruhnya menjadi data bebas baca oleh partner.
- Profile seeker beserta education/experience/skills: putuskan field global milik user versus projection tenant. Membership saja bukan persetujuan membuka seluruh riwayat privat.
- Audit, perangkat, traffic, snapshots, broadcast, moderation: tentukan scope tiap operasi; data keamanan global tetap master-only.
- Shared public catalog: konten resmi master yang sengaja didistribusikan. Lowongan/feed eksternal harus memiliki provenance dan visibility eksplisit. `tenant_id IS NULL` tidak boleh berarti semua orang boleh melihat.

Default listing Child bersifat tenant-private kecuali field `visibility` dan aturan publikasi secara eksplisit mengizinkan share. Publikasi lowongan tidak mempublikasikan pelamar, CV, kontak privat, order, atau CRM.

Tambah index sesuai query: membership(user_id,status), resource(tenant_id,created_at,id), order(tenant_id,status,created_at), serta unique/FK komposit untuk relasi tenant. Gunakan pagination bounded; hindari N+1. Uji query plan sebelum menambah index lain.

## 7. Batas data cloud dan lokal

Untuk modul tenant baru, gunakan application service server yang sama secara konsep dan repository adapter cloud/lokal. Endpoint cloud di `api/` dan middleware lokal memanggil validasi/policy bersama; hindari dua implementasi aturan bisnis yang berbeda.

Supabase: browser masih dapat memanggil database langsung melalui anon key. RLS wajib melindungi data meskipun API sudah aman. Cabut policy permisif lama dalam migration yang sama sebelum menggantinya; menambahkan policy ketat saja tidak cukup. Client tidak boleh mengubah tenant_id, membership, payment, commission, ledger, atau global roles secara langsung.

Pilihan MVP untuk tabel sensitif baru: revoke akses browser langsung dan izinkan hanya service server yang tervalidasi. Untuk tabel yang tetap diakses browser, buat RLS membership + ownership dan larang mutation field keamanan. Authenticated DB user bukan otomatis member semua tenant. Request host SPA tidak otomatis diketahui PostgREST; jangan mengandalkan header tenant client sebagai bukti otorisasi. Uji akses langsung Supabase untuk memastikan endpoint aplikasi bukan satu-satunya pertahanan.

SQLite: tidak ada RLS. Terapkan table/action allowlist dan server-enforced tenant predicate pada query generik maupun SQL khusus. Cover select/count/join/nested select, insert/upsert, update/delete, export, aggregate, RPC, dan upload. Reject tenant_id dari payload mutation. Filter server harus AND dengan filter user, tidak boleh hilang karena OR/filter kosong. Tentukan tenant row baru dari context server.

Untuk fitur partner yang gagal database atau ditolak policy, tampilkan error; jangan fallback ke localStorage lalu melaporkan sukses. Mode lokal hanya untuk development/test atau deployment yang memang mendukung storage persisten. Cloud production harus fail closed jika konfigurasi cloud wajib hilang, bukan berubah ke database lokal tanpa sengaja.

## 8. API dan modul usulan

API berikut belum ada; implementasikan per fase dengan validation schema, error code stabil, bounded pagination, request_id, serta audit untuk mutation sensitif. Gunakan metode non-GET untuk perubahan state.

```text
GET    /api/tenant/context                 public branding + flags terfilter
POST   /api/tenant/registration-intent     intent server terikat tenant/OAuth flow
POST   /api/tenant/memberships/accept       accept invite terverifikasi
GET    /api/partner/dashboard
GET    /api/partner/users
GET    /api/partner/users/:id
PATCH  /api/partner/users/:id               hanya field operasional tenant
PATCH  /api/partner/branding
GET    /api/partner/products
PATCH  /api/partner/products/:id
POST   /api/orders                         Idempotency-Key wajib
GET    /api/orders/:id
POST   /api/orders/:id/checkout            server menghitung ulang total
POST   /api/payments/:provider/webhook     signature + persisted attribution
GET    /api/partner/wallet
POST   /api/partner/withdrawals             Idempotency-Key wajib
POST   /api/master/partners
POST   /api/master/partners/:id/approve
POST   /api/master/partners/:id/suspend
GET    /api/master/tenants/:id/users        explicit scope + master audit
```

Pada fallback path, prefix tenant business API menjadi `/api/p/{slug}/...`. Master dan provider webhook tetap endpoint pusat. Tambahkan dispatch/rewrite yang nyata untuk dev, preview, dan target deployment; file route contoh bukan bukti endpoint sudah reachable.

Usulan struktur baru: `server/tenancy/`, `server/policies/`, `server/repositories/`, `server/commerce/`, `src/contexts/TenantContext.tsx`, `src/lib/tenantNavigation.ts`, `src/lib/tenantApi.ts`, `src/pages/partner/`, dan test tenant dalam `scripts/` atau test runner yang disepakati. Nama ini usulan, bukan file existing.

Format error: `{ error: { code, message }, request_id }`; jangan mengirim SQL, stack trace, atau identitas resource tenant lain. Idempotency key terikat tenant + actor + operation + hash payload; penggunaan ulang dengan payload berbeda return 409.

## 9. Pembayaran, profit, dan wallet

Provider belum ditetapkan oleh prompt. Audit integrasi nyata; bila belum ada, bangun adapter dan sandbox/test double dengan status jelas. Jangan menyatakan payment produksi siap tanpa konfigurasi dan pengujian webhook provider sebenarnya.

- Harga, eligibility, currency, kuantitas, diskon, dan profit dihitung backend serta disnapshot saat order dibuat. Contoh margin sederhana: 110000 - 80000 = 30000 rupiah, sebelum fee/refund yang memang ditentukan policy.
- MVP pilih satu model profit eksplisit per item: margin ATAU commission. Hindari membayar keduanya tanpa konfigurasi master. Revenue share/recurring disiapkan melalui versioned rule dan business event unik.
- Pisahkan order status, payment status, fulfillment status, dan commission status. UI `completed` pada transaksi legacy tidak boleh membuat payment menjadi paid.
- Verifikasi signature atas raw webhook body, timestamp/replay rule provider, merchant/account, amount dan currency. Cari tenant melalui payment/order tersimpan; jangan mempercayai tenant dari callback body.
- Simpan event unik lalu lakukan transisi atomik. Duplicate/out-of-order callback tidak boleh menggandakan fulfillment, komisi, atau saldo; event lama tidak boleh menurunkan paid menjadi pending.
- Flow komisi: pending -> validated -> approved -> available -> paid; reversed melalui jurnal kompensasi. Tentukan syarat fulfillment, hold period, dan refund sebelum available.
- Ledger append-only dan balanced per journal/currency. Pending, available, reserved, paid adalah buckets/proyeksi yang dapat direkonsiliasi; perubahan bucket harus atomic. Nilai saldo tidak boleh ditulis langsung oleh partner.
- Withdrawal melakukan reservasi saldo atomik untuk mencegah dua request menghabiskan saldo sama. Flow pending -> approved -> processing -> paid, dengan rejected/failed dan pelepasan reserve tepat sekali.
- Payout timeout berstatus unknown harus direkonsiliasi berdasarkan provider reference sebelum retry; jangan membayar dua kali.
- Partial refund/chargeback membalik komisi proporsional menurut snapshot dan aturan rounding deterministik; akumulasi reversal tidak melebihi hak terkait. Jika dana sudah ditarik, catat liability/negative balance policy, jangan menghapus ledger.
- Manual payment confirmation master memerlukan permission terpisah, evidence/reference, reason, audit, dan jalur transisi yang sama. Partner tidak dapat memakai endpoint ini.
- Fulfillment menggunakan outbox + retry idempotent. Kegagalan fulfillment setelah paid tidak boleh dianggap order belum dibayar.

## 10. UI, storage, cache, dan operasional

Gunakan ulang homepage, navbar, footer, kartu, layout, dan CMS existing. Tambahkan co-branding “Mitra Resmi LOXER” / “Powered by LOXER”, navy/cyan/white; gold untuk partner/profit. Tidak ada arbitrary CSS/JS/HTML dari tenant. Validasi URL, upload MIME/size, dan component/field allowlist Puck.

Tambahkan `/mitra`, onboarding partner (informasi, slug, logo/kontak, katalog, preview, submit), status approval, serta `/partner` dashboard. Menu yang belum berfungsi tidak boleh terlihat seolah sudah aktif. Target responsive minimal 360px, tablet 768px, desktop 1440px.

Namespace cache dengan tenant + actor/permission scope + config version bila relevan. Cover localStorage, IndexedDB, query cache, jobSearchCache, BroadcastChannel, realtime subscriptions, offline queue, dan service worker. Jangan cache API privat di shared CDN atau service worker. Kosongkan state privat saat logout/switch tenant. Saat offline queue diputar ulang, server memvalidasi kembali tenant, actor, permission, dan idempotency.

File privat memakai key `tenants/{tenantId}/...`, ownership check dan signed URL berumur pendek; prefix saja bukan kontrol akses. Logo/banner publik dipisahkan dari CV/dokumen privat. Storage policy cloud dan route file lokal harus setara.

Background job membawa tenant_id dari record server, bukan input client; worker memvalidasi scope. Notification memakai template master + branding tenant. Search index/filter, export CSV, aggregate analytics, pagination counts, dan subscription realtime harus diuji terhadap kebocoran.

Audit actor, tenant, action, resource, reason untuk master override, request_id, result, timestamp; redact data sensitif. Mutation kritis dan audit/outbox harus konsisten transaksional. Export dan sensitive user views dicatat. Partner tidak boleh menghapus audit/ledger atau hard-delete identity global.

Suspension menolak bisnis baru tetapi tetap memproses callback settlement/refund dan menyediakan penanganan master. Termination tidak menghapus user. Transfer user adalah workflow master yang mengubah membership/home tenant secara terkontrol; histori order, pembayaran, profit, dan CRM lama tidak dipindah otomatis.

Impersonation ditunda hingga ada reason, timeout, banner, exit, audit actor asli, dan larangan operasi finansial sensitif. Custom domain memerlukan DNS ownership verification, TLS, revalidation, dan pelepasan mapping aman agar tidak terjadi takeover.

## 11. Migration dan rollout

1. Catat baseline git dan checks. Backup menggunakan mekanisme konsisten database masing-masing, lalu buktikan restore pada database test. Jangan menyalin hanya main SQLite file saat WAL aktif tanpa strategi konsistensi.
2. Buat migration versi baru; jangan mengedit migration lama yang sudah mungkin diaplikasikan. Siapkan schema version lokal dan hindari relying pada `CREATE TABLE IF NOT EXISTS` untuk menambah kolom existing.
3. Expand: tabel tenancy, nullable tenant FK, membership, index awal, flags default OFF. Jangan reset DB, drop user, atau mengubah ID existing.
4. Backfill bertahap dan idempotent: existing identity menjadi home master, membership master, resource mendapat tenant sesuai ownership induk. Quarantine orphan/ambiguity dengan laporan; jangan menebak ke Child.
5. Verifikasi counts sebelum/sesudah, FK, orphan, null yang tersisa, dan konsistensi relasi tenant. Semua existing direct users tetap dapat login dan bekerja.
6. Deploy backend yang memahami tenant, perketat policy serta tutup jalur bypass browser/local query. Pilih maintenance window terukur bila perubahan policy tidak dapat aman dilakukan live.
7. Aktifkan constraint NOT NULL/FK sesuai klasifikasi sesudah backfill sukses, lalu UI dan pilot allowlist tenant. Flags keamanan harus dievaluasi backend; flag UI saja tidak cukup.
8. Rollout internal -> pilot -> bertahap. Ukur tenant-denied events, error rate, latency p95, query plan, dan reconciliation mismatch dengan threshold tertulis sebelum pilot.
9. Rollback utama: matikan fitur bisnis Child dan kembalikan traffic secara aman sambil mempertahankan schema, ledger, serta policy isolasi. Jangan kembali ke binary lama yang membaca semua tenant tanpa filter setelah data Child ada. Jangan drop kolom/data tenant untuk rollback cepat.

Dokumentasikan perbedaan sintaks/constraint Postgres dan SQLite, runtime Node yang mendukung `node:sqlite`, serta hosting yang benar-benar digunakan. Target 10.000 tenant bukan klaim kapasitas SQLite atau hosting saat ini; buktikan melalui load test representatif sebelum menyatakan siap skala tersebut.

## 12. Fase dan definition of done

### P0 — Tenant core dan keamanan

Audit terbaru; ADR identity/routing/data access; migration master + dua Child test; resolver host/path; auth provisioning; membership/RBAC; scoped access kedua backend; RLS; baseline child rendering; flag OFF default.

Selesai jika register Child A membuat membership A, user A tidak bisa membaca/menulis data privat B melalui API maupun database browser langsung, host invalid ditolak, prefix navigasi terjaga, suspension efektif, dan direct user existing tidak rusak. Cloud tanpa environment test harus dilaporkan belum terverifikasi, bukan dianggap pass dari test lokal.

### P1 — Operasional dan bisnis

Approval/onboarding, partner dashboard, branding, user management DTO, katalog master, order, payment sandbox/provider adapter, profit, immutable wallet, withdrawal, audit. Dua order tenant berbeda tidak bercampur; callback ulang tidak menggandakan uang; withdrawal concurrent tidak overspend; tidak ada fallback sukses palsu.

### P2 — Lanjutan

Staff invite dan permission, CRM/tag/assignment, quotations, analytics/funnel, konten/banner, QR/share URL, custom domain, notification branding, controlled transfer. Tiap fitur memiliki isolation test termasuk export, storage, cache, dan realtime.

### P3 — Skala

Plan/quota server-side, API access, recurring commission, automation, reporting, load test, observability, dan desain paket white-label bila benar-benar diperlukan bisnis. Jangan mengaktifkan white-label penuh pada MVP.

## 13. Pengujian wajib

Siapkan fixture master, Child A/B, owner/admin/staff, user direct, user A/B, dan user dengan dua membership. Gunakan DB disposable; jangan jalankan `db:reset` pada database kerja. Audit script existing sebelum menjalankannya karena mungkin memodifikasi data.

Acceptance cases minimum:

1. A read/update/delete/export resource B -> 404/403 tanpa metadata bocor; count, search, aggregate, nested relation sama aman.
2. Body/query/header tenant palsu, membership palsu, role admin pada signup, bulk upsert, filter kosong dan OR -> tidak dapat melewati scope.
3. Host spoof/forwarded-host spoof, reserved slug, duplicate slug race, malformed prefix, konflik subdomain/path, unknown host -> ditolak.
4. Login direct tetap berjalan; signup/OAuth Child teratribusi benar; wrong Child tidak memindahkan identity; redirect eksternal ditolak; revoked membership segera efektif.
5. Tenant disabled, feature disabled, suspended, expired session, staff disabled -> mutation gagal sesuai policy.
6. URL host dan fallback path setara, refresh deep link serta back/forward bekerja, API mencapai handler pada deployment target.
7. Public catalog hanya field publik; lowongan publik tidak membuka applicants/CV; signed file URL tenant lain ditolak.
8. Cache/offline/realtime switch A->B tidak menampilkan data A; unauthenticated response tidak memuat data privat.
9. Price tampering, partner mengubah paid amount/status, duplicate webhook, wrong signature/amount/currency, out-of-order event -> tidak menghasilkan kredit ilegal.
10. Harga master berubah sesudah checkout tidak mengubah snapshot; produk disabled sebelum checkout ditolak; paid fulfillment tetap mengikuti snapshot/policy.
11. Concurrent checkout idempotency, commission retry, partial/full refund, chargeback setelah payout, payout timeout, dua withdrawal concurrent -> ledger konsisten tanpa double spend.
12. Cloud RLS dengan anon/authenticated/service context dan SQLite handler menghasilkan aturan akses setara; gunakan credential test saja.
13. Migration ulang aman; restore test berhasil; rollback flag tidak menghapus data atau membuka scope; regression seeker/employer/jasa/marketplace/admin/PWA lolos.

Quality gates existing: `npm run typecheck`, `npm run lint`, `npm run build`, lalu `npm run test:local` hanya setelah memastikan DB test terisolasi dan server prerequisite sesuai. Tambahkan command test tenant/commerce yang benar-benar tersedia, jangan melaporkan command usulan sebagai sudah dijalankan. Test cloud/hosting/DNS terpisah dari build frontend.

## 14. Output implementasi

Sebelum perubahan besar, simpan audit berbukti path kode, arsitektur existing/target, konflik, perubahan DB, flow resolver/auth, permission matrix, risk register, migration/rollback, fase, dan test plan di dokumentasi proyek.

Setiap fase laporkan: file berubah, migration baru, route/API aktif, perilaku yang berubah, test benar-benar dijalankan beserta hasil, test yang belum dapat dijalankan, risiko tersisa, dan langkah berikutnya. Tandai seluruh placeholder/provider sandbox. Jangan mengklaim “IDOR tidak mungkin”; laporkan batas proteksi dan bukti test.

Setelah semua fase selesai, berikan rekomendasi performa berbukti dan 20 rekomendasi lanjutan yang diprioritaskan. Rekomendasi bukan pengganti requirement yang belum selesai.

## 15. Instruksi mulai untuk pelaksana

Mulai dari P0. Periksa ulang kondisi repository dan instruksi lokal, inventaris kedua backend dan jalur akses data langsung, lalu buat audit serta migration plan konkret. Implementasikan irisan pertama tenant master + Child A/B + resolver + membership + isolation test dalam database test. Jangan membuka Child ke pengguna nyata sebelum seluruh gate keamanan P0 lulus. Lanjutkan fase berikutnya sesuai ruang lingkup yang diberikan pengguna, dengan catatan progres yang dapat diteruskan.
