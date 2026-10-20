# MODUL TERISOLASI — LOXER MARKETPLACE & JASA MANDIRI

Dokumen ini mencatat pemisahan kode dan modul **Marketplace Produk** serta **Penyedia Jasa Mandiri (Freelancer/On-Demand Services)** dari aplikasi web utama LOXER.

## Alasan Isolasi Penuh
Fokus roadmap utama LOXER saat ini adalah penyempurnaan menyeluruh 2 pilar inti:
1. **Pusat Iklan Loker**: Lowongan pekerjaan, integrasi kurasi Facebook, lamar 1-klik, ATS pelamar, dan dashboard HRD perusahaan.
2. **Bursa Pekerja / Pelamar Kerja**: Profil talenta terverifikasi, biodata CV, portofolio keahlian, dan *direct hiring* dari perusahaan ke pelamar.

## Berkas yang Diisolasi
* `marketplace/ProductMarketplace.tsx`: Halaman jual-beli perlengkapan kerja & produk digital member.
* `jasa/SeekerMarketplace.tsx`: Form & halaman penawaran jasa panggilan teknisi/tukang/freelance mandiri.

Semua berkas ini disimpan dalam kondisi utuh dan siap diintegrasikan kembali sebagai microservice atau modul terpisah bila telah mencapai fase rilis yang sesuai.
