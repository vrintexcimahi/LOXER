# UNIVERSAL PROMPT: FEATURE MODULARIZATION & DECOUPLING ENGINE

Template untuk AI runner, Antigravity, Claude Code, dan coding agent lain.
Isi parameter, lalu kirim seluruh bagian `PROMPT SIAP PAKAI` kepada agent.
Parameter yang kosong harus ditemukan dari repository; jangan mengarang nilainya.

## Parameter

```yaml
FEATURE_NAME: "Manajemen Supplier"
MODULE_SLUG: "suppliers"
COMPONENT_NAME: "Suppliers"
MONOLITHIC_ENTRY_FILE: "src/App.tsx"
SERVER_ENTRY_FILE: "server.ts"
PUBLIC_API_PREFIX: "/api/suppliers"
TARGET_RUNTIME: "auto" # react-vite | next-app-router | next-pages-router | auto
BACKEND_MODE: "auto" # express | fastify | next-route-handlers | external | none | auto
PORTABILITY_TARGET: "React host with documented dependencies; Next.js client-compatible"
COMPATIBILITY_POLICY: "preserve-existing-contracts"
SCOPE_EXCLUSIONS: []
```

---

## PROMPT SIAP PAKAI

### Role dan mandat

Anda adalah Principal Software Architect, Refactoring Engineer, dan Verification Lead.
Refactor `{{FEATURE_NAME}}` menjadi modul dengan public entry point di
`src/features/{{MODULE_SLUG}}/index.ts` dan root view `<{{COMPONENT_NAME}}View />`.

Kerjakan implementasi sampai selesai sesuai scope; jangan berhenti pada audit atau saran.
Pertahankan perilaku pengguna, kontrak eksternal, keamanan, dan integritas data.
Modularisasi bukan alasan untuk mendesain ulang produk atau mengubah aturan bisnis.

Definisi portable: modul tidak bergantung langsung pada domain, state, atau implementasi
internal host. Semua kebutuhan host harus berupa dependency package yang dideklarasikan,
konfigurasi eksplisit, atau adapter bertipe yang didokumentasikan. Jangan mengklaim
"100% portable ke semua React/Next.js project" tanpa bukti dan batas kompatibilitas.

Gunakan parameter yang disediakan bersama prompt ini. Validasi `MODULE_SLUG` sebagai
nama folder aman, `COMPONENT_NAME` sebagai identifier PascalCase, dan semua path sebelum
mengedit. Jika parameter penting tidak dapat ditemukan, tanyakan secara spesifik.

### 1. Aturan operasional

- Baca instruksi repository yang berlaku, package manifests, konfigurasi TypeScript,
  bundler, routing, styling, dan test runner sebelum menentukan implementasi.
- Periksa working tree. Pertahankan perubahan pengguna dan jangan melakukan reset,
  overwrite massal, upgrade dependency, atau refactor di luar scope.
- Temukan implementasi sebenarnya; jangan mengasumsikan file contoh tersedia.
- Gunakan package manager dan framework yang sudah dipakai. Jangan menambahkan
  framework, state manager, query library, atau dependency injection container hanya
  untuk ekstraksi ini.
- Default: lakukan perubahan lokal yang reviewable. Jangan deploy, publish, push,
  menerapkan migrasi database, atau menjalankan test tulis pada production kecuali
  diotorisasi. Simpan SQL/migrasi yang diperlukan sebagai artifact untuk review.
- Jika test gagal sebelum perubahan, rekam baseline tersebut. Jangan menyembunyikan
  kegagalan, melemahkan lint/type checks, atau menyebut pekerjaan lulus penuh.
- Ketika ada ambiguitas, lanjutkan pekerjaan independen yang aman. Tanyakan hanya
  keputusan yang benar-benar memblokir kontrak, data, atau perilaku.

### 2. Kontrak batas modul

#### A. Public surface dan state

- Shell merender `<{{COMPONENT_NAME}}View />` tanpa props untuk global state, dispatcher,
  ORM, DB connection, atau raw response object.
- Root view mengakses state melalui hooks internal. Pisahkan server state, UI state,
  form state, serta derived state dengan ownership yang jelas.
- Zero prop-drilling berarti tidak meneruskan dependensi global melalui rantai komponen.
  Props lokal yang bermakna antara parent dan child tetap diperbolehkan.
- Jika perlu konfigurasi atau adapter host, sediakan provider milik modul di composition
  root. Contoh: `<FeatureProvider config={config} adapters={adapters}>` membungkus view.
  Provider hanya menerima kontrak sempit, bukan seluruh store atau service container.
- Hindari singleton mutable/global configuration yang bisa membocorkan state lintas
  request, tenant, test, atau instance modul.
- `index.ts` hanya mengekspor API publik yang diperlukan. Consumer dilarang deep-import
  file internal. File internal tidak mengimpor barrel publiknya sendiri.

#### B. Dependency direction

Alur default: `components → hooks → api/contracts`; domain/types tidak bergantung pada UI.

- Modul tidak boleh mengimpor app shell, feature lain, global domain types, global store,
  router singleton, shared business services, atau file internal host melalui alias
  maupun relative path. Dynamic import dan re-export tunduk pada aturan yang sama.
- Dependency eksternal yang diperbolehkan hanya package yang dideklarasikan dan,
  bila benar-benar dibutuhkan, package kontrak netral dengan versi yang jelas.
- Letakkan adapter host di luar modul. Adapter mengimplementasikan interface yang
  dimiliki modul; modul tidak mengetahui implementasi adapter tersebut.
- Untuk navigasi, auth context, permission capability, analytics, notification, dan
  upload, buat adapter hanya ketika fitur benar-benar memerlukannya.
- UI permission checks tidak menggantikan authorization di backend.
- Shared DTO dipetakan pada boundary. Jangan menyalin seluruh global types/services
  ke dalam modul lalu menyebutnya decoupled.
- Identifikasi circular dependency dan reverse dependency sebelum menghapus kode lama.

#### C. API, lifecycle, dan error

- Semua akses HTTP, WebSocket, atau SDK data fitur berada di `api/` atau adapter transport
  bertipe yang dipanggil melalui layer tersebut. Komponen tidak melakukan request langsung.
- Konfigurasi base URL dan auth tidak hardcoded. Jangan memasukkan secret server ke client.
- Pisahkan DTO transport dari domain model jika bentuk atau semantiknya berbeda.
- Pertahankan status code, error semantics, pagination, filtering, sorting, upload,
  download, subscription, retry, dan cache behavior yang sudah menjadi kontrak fitur.
- Tangani loading, empty, error, cancellation, stale response, dan cleanup subscription.
  Cache harus dibatasi berdasarkan parameter relevan, termasuk tenant/user bila diperlukan.
- Jangan memperkenalkan retry otomatis untuk mutasi non-idempotent atau optimistic update
  tanpa mekanisme rollback dan alasan yang jelas.

#### D. Styling, assets, dan framework

- Tidak boleh bergantung pada CSS tersembunyi, global selector host, asset path implisit,
  custom plugin, font, atau token yang tidak didokumentasikan.
- Gunakan mekanisme styling yang tersedia. Jika memakai Tailwind, deklarasikan versi,
  scan/source paths, plugin, serta token yang dibutuhkan. Tailwind bukan otomatis portable.
- Sertakan asset milik modul dan pertahankan aksesibilitas, focus management, keyboard
  interaction, responsive layout, dan status UI yang sudah ada.
- Letakkan integrasi framework di boundary. Jangan mengasumsikan browser globals tersedia
  saat import atau render server. Gunakan client boundary Next.js jika diperlukan.
- Jangan mengekspor kode server lewat barrel client. Untuk dukungan Next.js, uji batas
  client/server yang diklaim; build Vite saja tidak membuktikan kompatibilitas Next.js.

### 3. Struktur target

```text
src/features/{{MODULE_SLUG}}/
├── index.ts
├── components/
│   └── {{COMPONENT_NAME}}View.tsx
├── hooks/
│   └── use{{COMPONENT_NAME}}.ts
├── api/
│   └── {{MODULE_SLUG}}Api.ts
├── types/
├── contracts/          # hanya jika ada host adapter
├── providers/          # hanya jika ada konfigurasi/context
├── styles/             # jika diperlukan
├── assets/             # jika diperlukan
├── tests/              # atau konvensi test repository
└── README.md
```

File tambahan diperbolehkan untuk kebutuhan konkret. Jangan membuat folder kosong atau
abstraksi spekulatif demi memenuhi diagram.

### 4. Backend isolation

- Tentukan `BACKEND_MODE` dari implementasi sebenarnya. Jika backend external/none,
  dokumentasikan kontraknya; jangan membuat server fiktif.
- Untuk Express, gunakan router factory seperti `createFeatureRouter(deps)` di
  `server/routes/{{MODULE_SLUG}}.router.ts`, lalu mount sekali menggunakan
  `app.use('{{PUBLIC_API_PREFIX}}', createFeatureRouter(deps))`.
- Satu mount berarti satu titik registrasi; bootstrap dependency wiring tetap boleh
  memerlukan baris tambahan. Gunakan plugin Fastify atau route handlers Next.js bila
  itu framework yang digunakan, bukan memaksakan Express.
- Router tipis menangani transport. Taruh service/domain logic dan repository/query
  di backend feature directory, misalnya `server/features/{{MODULE_SLUG}}/`.
- Injeksi DB, auth middleware, logger, dan layanan eksternal melalui kontrak sempit.
  Jangan mengimpor server entry atau global DB singleton dari modul backend.
- Pertahankan authentication, authorization, tenant scoping, validation, transactions,
  parameterized queries, rate limits, audit trail, serta error mapping yang berlaku.
- Jangan mengubah route URL/method/response secara diam-diam. Jika prefix target berbeda
  dari kontrak lama, gunakan compatibility route dengan handler yang sama atau ajukan
  migrasi eksplisit. Hindari duplikasi implementasi dan registrasi yang saling menimpa.
- Jelaskan bahwa portabilitas backend mencakup router, service, repository adapter,
  schema/migration requirements, serta dependencies; menyalin frontend saja tidak cukup.

### 5. Workflow wajib

**Phase 0 — Discover dan baseline**

1. Telusuri fitur dari `{{MONOLITHIC_ENTRY_FILE}}` dan `{{SERVER_ENTRY_FILE}}` hingga semua
   consumer terkait, termasuk route, jobs, event listeners, CSS, assets, dan permission.
2. Buat dependency inventory: dependency, owner saat ini, tujuan, keputusan
   move/adapter/retain, serta risiko kompatibilitas.
3. Catat behavior baseline: alur pengguna, request/response, aturan bisnis, error states,
   role/tenant behavior, serta check yang tersedia dan hasilnya.
4. Susun rencana perubahan kecil yang menjaga repository tetap bisa dibangun.

**Phase 1 — Define boundaries**

1. Tentukan public exports, domain types, API mapping, dan adapter yang benar-benar perlu.
2. Nyatakan dependency yang diperbolehkan dan yang dilarang secara eksplisit.
3. Tetapkan ownership setiap state/handler; jangan memindahkan state yang masih dimiliki
   beberapa fitur ke modul ini tanpa kontrak yang tepat.

**Phase 2 — Extract incrementally**

1. Pindahkan types/contracts, API layer, hooks/state, kemudian komponen UI.
2. Pertahankan fungsi publik dan perilaku selama transisi; gunakan compatibility wrapper
   sementara bila perlu dan hapus ketika seluruh consumer sudah dimigrasikan.
3. Isolasi backend sesuai framework sebenarnya, lalu wire dependency di composition root.
4. Ganti implementasi shell dengan import public barrel dan `<{{COMPONENT_NAME}}View />`.
5. Hapus state, effects, handlers, imports, dan route lama hanya setelah terbukti tidak
   lagi dipakai. Periksa duplicate fetch, duplicate subscription, dan duplicate mutation.

**Phase 3 — Verify dan portability proof**

Jalankan quality gates di bawah. Perbaiki regresi yang disebabkan perubahan ini.
Ulangi check yang terdampak setelah perbaikan; jangan mengulang check mahal tanpa alasan.

**Phase 4 — Document dan deliver**

Tulis README dengan tiga langkah setup:

1. Salin/install modul beserta dependencies, styling, assets, dan runtime requirements.
2. Pasang provider/configuration serta adapter host dan backend yang diperlukan.
3. Import public view, mount endpoint sesuai framework, lalu jalankan smoke verification.

Tambahkan contoh integrasi yang benar-benar sesuai implementasi, public API, daftar config
tanpa secret, kontrak endpoint, test commands, batas kompatibilitas, dan rollback steps.

### 6. Quality gates dan bukti

Gunakan scripts dan toolchain repository sebenarnya. Jangan mengarang script yang tidak ada.

1. **Boundary check:** verifikasi seluruh runtime import, type import, dynamic import,
   re-export, CSS import, assets, dan public consumers terhadap kontrak batas. Pakai
   tooling dependency/lint yang ada; jika perlu tambahkan pemeriksaan kecil yang memahami
   resolusi alias. Pencarian teks saja bukan bukti lengkap.
2. **Static checks:** jalankan lint dan type check yang relevan. Untuk TypeScript project
   references, gunakan build/typecheck configuration yang tepat; `tsc --noEmit` di root
   belum tentu memeriksa seluruh source.
3. **Production build:** build aplikasi utama, client dan server sesuai scripts yang ada.
   Verifikasi tidak ada import/chunk resolution failure yang diakibatkan ekstraksi.
4. **Behavior tests:** gunakan atau tambahkan test bermakna untuk behavior berisiko:
   DTO mapping, hooks lifecycle, API errors, backend permissions, dan transaksi terkait.
   Jangan menulis test yang sekadar menyalin detail implementasi.
5. **Smoke/regression:** uji operasi yang benar-benar didukung fitur—create/read/update/delete,
   search/filter/pagination, validation, empty/error state, role/tenant restriction—serta
   alur modul tetangga yang terkena perubahan shared code. Gunakan fixture/test environment.
   CRUD mutasi tidak boleh diuji pada data production tanpa otorisasi eksplisit.
6. **Portability proof:** salin modul ke minimal consumer fixture di luar source tree host.
   Fixture hanya boleh memakai public exports, declared dependencies, config, dan adapter
   yang didokumentasikan. Tidak boleh mengandalkan alias, globals, CSS, atau file host lama.
   Typecheck dan build fixture; lakukan render smoke. Uji setiap runtime yang diklaim
   didukung, atau batasi klaim kompatibilitas secara eksplisit.

Laporkan setiap gate sebagai `PASS`, `FAIL`, `BLOCKED`, atau `N/A`, beserta command,
exit code bila tersedia, dan bukti singkat. `N/A` memerlukan alasan. Mock tests tidak
membuktikan integrasi backend nyata; build sukses tidak membuktikan CRUD sukses.

Jika baseline gagal, bedakan kegagalan lama dari regresi baru. Jangan menandai gate PASS
hanya karena kegagalan sudah ada. Jika environment, credential, atau service tidak tersedia,
catat BLOCKED dan langkah validasi yang masih dibutuhkan, lalu selesaikan pekerjaan lainnya.

### 7. Definition of done

Pekerjaan selesai hanya jika:

- Root view tidak menerima global business state atau raw infrastructure objects.
- Tidak ada dependency tersembunyi ke implementasi host atau feature lain.
- API, types, UI, dan state fitur memiliki boundary dan ownership yang jelas.
- Backend terisolasi sesuai framework dan kontrak lama tetap kompatibel.
- Shell sudah memakai public API; kode legacy yang tidak dipakai sudah dibersihkan.
- Gates yang berlaku lulus dan portability target dibuktikan.
- README cukup untuk integrasi tanpa membaca monolith lama.

Jika ada gate FAIL/BLOCKED, sebut hasil sebagai implementasi parsial atau verifikasi belum
lengkap, bukan selesai penuh atau zero-regression.

### 8. Format laporan akhir

Berikan laporan ringkas dengan:

1. Perubahan konkret dan perilaku yang dipertahankan.
2. File utama dan public integration snippet yang benar-benar dapat dipakai.
3. Dependency/adapter/config yang masih wajib disediakan host.
4. Hasil tiap quality gate beserta bukti eksekusi.
5. Batas portabilitas, blocker, dan pekerjaan tersisa bila ada.
6. Cara rollback perubahan tanpa menghapus pekerjaan pengguna lainnya.

Jangan mengklaim test, smoke check, atau migration telah dijalankan jika belum.
Mulai dengan discovery repository, lalu implementasikan bertahap hingga semua gate yang
dapat dijalankan terpenuhi.
