# 10 — Risk Register & Open Items: LOXER Universal Super Admin OS

## 1. Risk Register

| Risk ID | Deskripsi Risiko | Dampak | Mitigasi yang Terpasang |
|---|---|---|---|
| **RSK-01** | Database SQLite Lock saat concurrent write tinggi | Sedang | Mode WAL (`PRAGMA journal_mode = WAL;`) dan `busy_timeout = 5000ms` diaktifkan di `server/localDb.js`. |
| **RSK-02** | Stale Cache pada PWA klien setelah rilis baru | Rendah | Versioning Service Worker otomatis di `public/sw.js` dengan strategi Network-First. |
| **RSK-03** | Pembajakan Sesi Admin / Brute-force | Tinggi | Rate limiting IP, JWT expiry, dan monitoring aktivitas di `SecurityCenter.tsx`. |
| **RSK-04** | Kebocoran Kredensial / API Key eksternal | Kritis | Secret disimpan dalam `.env` server, tidak pernah terekspos di API publik runtime. |

---

## 2. Open Items & Pemantauan Lanjutan

- [ ] Evaluasi berkala ukuran database `data/loxer.db` (auto vacuum jika mendekati 100MB).
- [ ] Penambahan notifikasi webhook Telegram otomatis saat terjadi insiden level `ERROR` di `LogMonitoring.tsx`.
