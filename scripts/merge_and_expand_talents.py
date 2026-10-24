import sqlite3
import uuid
import json
import random
from datetime import datetime, timedelta

def main(db_path='/home/vrintex/loxer/data/loxer.db', backup_path='/home/vrintex/loxer/data/backups/loxer_20261023_000909.db'):
    con_act = sqlite3.connect(db_path)
    cur_act = con_act.cursor()

    # 1. Restore all from backup
    con_bak = sqlite3.connect(backup_path)
    cur_bak = con_bak.cursor()

    cur_bak.execute('''
        SELECT tp.id, tp.seeker_id, tp.user_id, tp.headline, tp.category, tp.bio, tp.bio_summary, 
               tp.skills, tp.experience_years, tp.availability, tp.availability_status, tp.work_types, 
               tp.expected_salary, tp.rate_type, tp.domicile_city, tp.whatsapp_number, tp.portfolio_url, 
               tp.resume_url, tp.badge, tp.photo_url, tp.views_count, tp.is_published, tp.created_at, tp.updated_at
        FROM talent_marketplace_posts tp
    ''')
    bak_posts = cur_bak.fetchall()

    cur_bak.execute('''
        SELECT id, user_id, full_name, domicile_city, phone, about, photo_url, created_at, updated_at
        FROM seeker_profiles
        WHERE full_name IS NOT NULL AND full_name != ""
    ''')
    bak_profiles = cur_bak.fetchall()

    for p in bak_profiles:
        cur_act.execute('''
            INSERT INTO seeker_profiles (id, user_id, full_name, domicile_city, phone, about, photo_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                full_name = excluded.full_name,
                domicile_city = excluded.domicile_city,
                about = excluded.about,
                photo_url = excluded.photo_url
        ''', p)

    for tp in bak_posts:
        cur_act.execute('''
            INSERT INTO talent_marketplace_posts (
                id, seeker_id, user_id, headline, category, bio, bio_summary, 
                skills, experience_years, availability, availability_status, work_types, 
                expected_salary, rate_type, domicile_city, whatsapp_number, portfolio_url, 
                resume_url, badge, photo_url, views_count, is_published, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                headline = excluded.headline,
                category = excluded.category,
                bio = excluded.bio,
                bio_summary = excluded.bio_summary,
                skills = excluded.skills,
                experience_years = excluded.experience_years,
                expected_salary = excluded.expected_salary,
                domicile_city = excluded.domicile_city,
                whatsapp_number = excluded.whatsapp_number,
                badge = excluded.badge,
                photo_url = excluded.photo_url,
                is_published = excluded.is_published
        ''', tp)

    con_act.commit()
    con_bak.close()

    cur_act.execute('SELECT count(*) FROM talent_marketplace_posts')
    current_count = cur_act.fetchone()[0]
    print(f"Restored base count: {current_count} talents")

    candidates = [
        {
            "name": "Rizky Pratama",
            "city": "Kota Bandung",
            "headline": "Barista & Staff Service Cafe",
            "category": "Restoran & F&B",
            "salary": 3200000,
            "exp": 2,
            "skills": ["Espresso Machine", "Latte Art", "Point of Sales (POS)", "Hospitality", "Inventory Bar"],
            "about": "Berpengalaman selama 2 tahun sebagai barista di coffee shop Bandung. Terbiasa mengoperasikan mesin espresso komersial, kalibrasi biji kopi, hospitality ramah, serta pencatatan stok harian.",
            "gender": "m"
        },
        {
            "name": "Siti Nurhaliza",
            "city": "Cimahi",
            "headline": "Kasir & Pramuniaga Retail",
            "category": "Penjualan & Pemasaran",
            "salary": 3000000,
            "exp": 2,
            "skills": ["Mesin Kasir POS", "Customer Service", "Stock Opname", "Display Produk", "Transaksi Non-Tunai"],
            "about": "Lulusan SMK Pemasaran dengan pengalaman 2 tahun sebagai kasir di minimarket dan toko retail modern. Teliti dalam pembukuan kas, ramah melayani pelanggan, dan terbiasa bekerja shift.",
            "gender": "f"
        },
        {
            "name": "Fajar Nugraha",
            "city": "Kab. Bandung",
            "headline": "Staff Gudang & Inventory Control",
            "category": "Operasional & Logistik",
            "salary": 3500000,
            "exp": 3,
            "skills": ["WMS", "Stock Opname", "Bongkar Muat", "Packing", "FIFO / FEFO"],
            "about": "Memiliki pengalaman 3 tahun di bidang pergudangan distribusi consumer goods. Disiplin tinggi, terbiasa pencatatan masuk-keluar barang, audit stok berkala, serta fisik prima untuk operasional.",
            "gender": "m"
        },
        {
            "name": "Anisa Rahmawati",
            "city": "Kota Bandung",
            "headline": "Customer Service & Telemarketing",
            "category": "Umum & Jasa Lainnya",
            "salary": 3500000,
            "exp": 2,
            "skills": ["Komunikasi Persuasif", "Handling Complain", "CRM Tools", "Chat Commerce", "Microsoft Office"],
            "about": "Berpengalaman 2 tahun sebagai Customer Service online shop dan layanan purnajual. Terbiasa menangani ratusan pesan masuk per hari via WhatsApp & marketplace dengan respon cepat dan solutif.",
            "gender": "f"
        },
        {
            "name": "Bagus Setiawan",
            "city": "Cimahi",
            "headline": "Teknisi Listrik & Maintenance Gedung",
            "category": "Bengkel & Otomotif",
            "salary": 3800000,
            "exp": 4,
            "skills": ["Instalasi Listrik 1 & 3 Phase", "Perawatan AC", "Troubleshooting Panel", "K3 Listrik", "Preventive Maintenance"],
            "about": "Teknisi maintenance berpengalaman 4 tahun menangani sistem kelistrikan gedung perkantoran, perbaikan instalasi penerangan, AC split/cassette, serta genset cadangan.",
            "gender": "m"
        },
        {
            "name": "Dinda Ayu Lestari",
            "city": "Kab. Bandung Barat",
            "headline": "Graphic Designer & Media Sosial",
            "category": "Desain & Kreatif",
            "salary": 4000000,
            "exp": 3,
            "skills": ["Adobe Photoshop", "Adobe Illustrator", "Canva Pro", "Instagram Feed Layout", "Video CapCut"],
            "about": "Kreatif, adaptif dengan tren visual media sosial terkini. Berpengalaman 3 tahun merancang konten promosi Instagram, banner marketplace, dan materi cetak promosi brand lokal.",
            "gender": "f"
        },
        {
            "name": "Dimas Anggara",
            "city": "Kota Bandung",
            "headline": "Driver Operasional & Logistik (SIM B1)",
            "category": "Operasional & Logistik",
            "salary": 3600000,
            "exp": 5,
            "skills": ["SIM B1 Aktif", "Hafal Rute Jabar & Jabodetabek", "Perawatan Dasar Truk", "Pengiriman Tepat Waktu", "Defensive Driving"],
            "about": "Driver profesional pemegang SIM B1 berpengalaman 5 tahun membawa armada pick-up dan truk engkel. Paham rute logistik Jawa Barat, nihil riwayat insiden lalu lintas, dan menjaga kebersihan armada.",
            "gender": "m"
        },
        {
            "name": "Nabila Zahra",
            "city": "Kota Bandung",
            "headline": "Staff Administrasi Keuangan & Pajak",
            "category": "Administrasi & Keuangan",
            "salary": 4200000,
            "exp": 3,
            "skills": ["Laporan Keuangan", "e-Faktur", "PPh & PPN", "Accurate Accounting", "Rekonsiliasi Bank"],
            "about": "Lulusan D3 Akuntansi dengan pengalaman 3 tahun menyusun jurnal umum, rekonsiliasi kas/bank, pelaporan SPT masa PPh 21/23, serta monitoring piutang dan invoice pelanggan.",
            "gender": "f"
        },
        {
            "name": "Asep Saepuloh",
            "city": "Kab. Bandung",
            "headline": "Operator Mesin Jahit & Produksi Konveksi",
            "category": "Manufaktur & Pabrik",
            "salary": 3200000,
            "exp": 4,
            "skills": ["Mesin Jahit High-Speed", "Obras & Overdeck", "Pola Baju", "Quality Control Jahitan", "Target Oriented"],
            "about": "Penjahit profesional berpengalaman 4 tahun di industri garmen dan konveksi kaos/jaket di Bandung. Cepat, presisi, jahitan rapi, dan mampu memenuhi target produksi harian pabrik.",
            "gender": "m"
        },
        {
            "name": "Mega Puspitasari",
            "city": "Cimahi",
            "headline": "Admin Marketplace & E-Commerce Shopee/TikTok",
            "category": "Penjualan & Pemasaran",
            "salary": 3400000,
            "exp": 2,
            "skills": ["Shopee Seller Centre", "TikTok Shop Seller", "Optimasi Judul & Iklan", "Proses Pesanan Massal", "Balas Chat Cepat"],
            "about": "Spesialis admin toko online dengan rekam jejak mengelola akun Shopee dan TikTok Shop beromzet ratusan juta per bulan. Mahir optimasi upload produk, promosi flash sale, dan print label resi massal.",
            "gender": "f"
        },
        {
            "name": "Hendri Kurniawan",
            "city": "Kota Bandung",
            "headline": "Security Guard / Satpam Gedung (Gada Pratama)",
            "category": "Umum & Jasa Lainnya",
            "salary": 3500000,
            "exp": 3,
            "skills": ["Sertifikat Gada Pratama", "Pengaturan Parkir", "Patroli Keamanan", "Penerimaan Tamu", "Kesiapsiagaan Darurat"],
            "about": "Petugas keamanan bersertifikasi resmi Gada Pratama dan KTA aktif. Tegas, disiplin, berpostur ideal (175 cm), terbiasa melakukan patroli berkala, pemeriksaan akses, dan penanganan ketertiban area.",
            "gender": "m"
        },
        {
            "name": "Rina Fitriani",
            "city": "Kab. Bandung Barat",
            "headline": "Staff QC (Quality Control) Garment & Tekstil",
            "category": "Manufaktur & Pabrik",
            "salary": 3300000,
            "exp": 3,
            "skills": ["Inspeksi Bahan", "Pengukuran Size Spec", "Pengecekan Defect", "AQL Sampling", "Pencatatan Reject"],
            "about": "Memiliki ketelitian tinggi dalam memeriksa mutu produk garmen ekspor mulai dari kain mentah, proses jahit, hingga kemasan akhir. Berpengalaman 3 tahun di pabrik tekstil Padalarang.",
            "gender": "f"
        },
        {
            "name": "Galih Wicaksono",
            "city": "Kota Bandung",
            "headline": "Cook Helper & Crew Dapur Restoran",
            "category": "Restoran & F&B",
            "salary": 3100000,
            "exp": 2,
            "skills": ["Food Preparation", "Knife Skills", "Kebersihan Dapur (Hygiene)", "Goreng & Tumis", "Mise en Place"],
            "about": "Lulusan SMK Tata Boga berpengalaman 2 tahun sebagai cook helper di restoran keluarga Bandung. Sigap dalam persiapan bahan masakan (prep), menjaga higienitas area kerja, dan tahan tekanan saat peak hour.",
            "gender": "m"
        },
        {
            "name": "Wulan Indah Sari",
            "city": "Cimahi",
            "headline": "Front Office & Resepsionis Kantor",
            "category": "Administrasi & Keuangan",
            "salary": 3500000,
            "exp": 2,
            "skills": ["Penerimaan Tamu", "Korespondensi Email", "Manajemen Telepon Masuk", "Pengarsipan Surat", "Public Speaking"],
            "about": "Berpenampilan menarik, komunikatif, dan ramah. Berpengalaman 2 tahun sebagai garda terdepan kantor melayani tamu resmi, mengelola surat masuk/keluar, dan mendukung operasional harian kantor.",
            "gender": "f"
        },
        {
            "name": "Bayu Tri Nugroho",
            "city": "Kab. Bandung",
            "headline": "Teknisi Komputer, Jaringan & CCTV",
            "category": "Teknologi & IT",
            "salary": 4000000,
            "exp": 3,
            "skills": ["Hardware PC/Laptop", "Crimping LAN & Mikrotik", "Instalasi CCTV IP/Analog", "Troubleshooting Windows", "Printer Sharing"],
            "about": "Teknisi IT lapangan serba bisa. Menguasai perakitan dan perbaikan hardware komputer, setup jaringan kantor kecil (LAN/Wi-Fi), serta instalasi dan maintenance kamera CCTV sistem online.",
            "gender": "m"
        },
        {
            "name": "Tiara Melani",
            "city": "Kota Bandung",
            "headline": "Staff HRD & Recruitment Assistant",
            "category": "Administrasi & Keuangan",
            "salary": 4300000,
            "exp": 3,
            "skills": ["Screening CV", "Penjadwalan Interview", "Payroll & Absensi", "BPJS Ketenagakerjaan", "Psikotes Dasar"],
            "about": "Lulusan S1 Psikologi dengan pengalaman 3 tahun di biro rekrutmen dan perusahaan swasta. Mahir mengorganisir database kandidat, memanggil jadwal wawancara, dan mengelola rekap absensi karyawan.",
            "gender": "f"
        },
        {
            "name": "Aditya Maulana",
            "city": "Kota Bandung",
            "headline": "Staff Content Creator & Video Editor TikTok/Reels",
            "category": "Desain & Kreatif",
            "salary": 4200000,
            "exp": 2,
            "skills": ["CapCut Pro", "Adobe Premiere", "Storyboarding", "Shooting Smartphone", "Analisis FYP Algorithm"],
            "about": "Kreator konten muda yang aktif memahami algoritma video vertikal (TikTok/Instagram Reels). Mampu menyusun hook menarik, pengambilan video kreatif, dan editing cepat berirama dinamis.",
            "gender": "m"
        },
        {
            "name": "Melati Kusuma",
            "city": "Kab. Bandung Barat",
            "headline": "Staff Farmasi / Asisten Apoteker (SMK)",
            "category": "Kesehatan & Medis",
            "salary": 3400000,
            "exp": 2,
            "skills": ["Pembacaan Resep Dokter", "Peracikan Obat Dasar", "Pengelolaan Stok Obat", "Pelayanan Pasien", "Sistem POS Apotek"],
            "about": "Lulusan SMK Farmasi dengan STRTTK aktif. Memiliki pengalaman 2 tahun di apotek retail, teliti dalam membaca resep dokter, cek tanggal kadaluarsa obat, dan ramah mengedukasi pasien.",
            "gender": "f"
        },
        {
            "name": "Yoga Prasetyo",
            "city": "Cimahi",
            "headline": "Operator Forklift & Gudang Racking (SIO Aktif)",
            "category": "Operasional & Logistik",
            "salary": 3900000,
            "exp": 4,
            "skills": ["SIO Forklift Disnaker", "Forklift Electric & Diesel", "High Reach Truck", "K3 Pergudangan", "Loading-Unloading Kontainer"],
            "about": "Operator forklift berlisensi SIO resmi Kemnaker RI aktif. Berpengalaman 4 tahun di gudang racking modern hingga ketinggian 7 meter. Mengutamakan zero-accident dan efisiensi waktu muat.",
            "gender": "m"
        },
        {
            "name": "Neneng Maryati",
            "city": "Kota Bandung",
            "headline": "Staff Cleaning Service & Office Girl Profesional",
            "category": "Umum & Jasa Lainnya",
            "salary": 2800000,
            "exp": 3,
            "skills": ["Standar Kebersihan 5R", "Penggunaan Chemical Pembersih", "Mesin Polisher Lantai", "Penyajian Konsumsi Rapat", "Jujur & Rajin"],
            "about": "Tenaga kebersihan berpengalaman 3 tahun di gedung perkantoran dan perbankan di Bandung. Disiplin waktu pagi, teliti merawat kebersihan toilet, ruang kerja, dan siap membantu kebutuhan umum kantor.",
            "gender": "f"
        },
        {
            "name": "Rendi Hermawan",
            "city": "Kota Bandung",
            "headline": "Mekanik Sepeda Motor (AHASS / Umum)",
            "category": "Bengkel & Otomotif",
            "salary": 3600000,
            "exp": 3,
            "skills": ["Tune Up Injeksi", "Service CVT Matic", "Bongkar Pasang Mesin", "Diagnosis Kelistrikan Motor", "Penggantian Sparepart"],
            "about": "Mekanik muda lulusan SMK Otomotif berpengalaman 3 tahun menangani servis motor matic dan manual. Menguasai scanner injeksi, overhaul mesin ringan, dan penanganan masalah rem serta suspensi.",
            "gender": "m"
        },
        {
            "name": "Nurul Hidayah",
            "city": "Kab. Bandung",
            "headline": "Host Live Streaming TikTok & Shopee",
            "category": "Penjualan & Pemasaran",
            "salary": 4000000,
            "exp": 2,
            "skills": ["Public Speaking Energik", "Penjualan Interaktif", "Mempertahankan Retention Rate", "Closing Promo", "Review Produk Fashion & Kosmetik"],
            "about": "Host live commerce percaya diri dengan suara lantang dan ekspresif. Berpengalaman membawakan siaran langsung live shopping 3-4 jam tanpa henti dengan pencapaian GMV memuaskan.",
            "gender": "f"
        },
        {
            "name": "Irfan Hakim",
            "city": "Cimahi",
            "headline": "Sales Executive & Marketing Lapangan (B2B/B2C)",
            "category": "Penjualan & Pemasaran",
            "salary": 3800000,
            "exp": 3,
            "skills": ["Negosiasi Penjualan", "Kanvasing Area", "Pencapaian Target Bulanan", "Membangun Relasi Pelanggan", "Presentasi Produk"],
            "about": "Pribadi ulet, pantang menyerah, dan berorientasi pada target penjualan. Berpengalaman 3 tahun melakukan kanvasing produk FMCG dan bahan bangunan di wilayah Bandung Raya dan sekitarnya.",
            "gender": "m"
        },
        {
            "name": "Sisca Damayanti",
            "city": "Kota Bandung",
            "headline": "Staff Purchasing & Pengadaan Barang",
            "category": "Administrasi & Keuangan",
            "salary": 4100000,
            "exp": 3,
            "skills": ["Negosiasi Harga Supplier", "Pembuatan Purchase Order (PO)", "Monitoring Pengiriman", "Evaluasi Vendor", "Microsoft Excel Vlookup/Pivot"],
            "about": "Berpengalaman 3 tahun di bagian pengadaan barang dan material produksi. Mampu mencari supplier alternatif berkualitas tinggi dengan penawaran harga kompetitif serta pembayaran tempo teratur.",
            "gender": "f"
        },
        {
            "name": "Dani Ramdani",
            "city": "Kab. Bandung Barat",
            "headline": "Operator Bubut, Milling & Las Konvensional",
            "category": "Manufaktur & Pabrik",
            "salary": 3700000,
            "exp": 4,
            "skills": ["Mesin Bubut Logam", "Las Listrik (SMAW) & Argon (TIG)", "Membaca Gambar Teknik", "Penggunaan Jangka Sorong / Mikrometer", "Presisi Tinggi"],
            "about": "Operator bengkel permesinan logam berpengalaman 4 tahun membuat suku cadang presisi sesuai gambar kerja teknik. Teliti menggunakan alat ukur presisi dan terbiasa pengelasan konstruksi kuat.",
            "gender": "m"
        },
        {
            "name": "Intan Permatasari",
            "city": "Kota Bandung",
            "headline": "Staff Entry Data & Administrasi Operasional",
            "category": "Administrasi & Keuangan",
            "salary": 3100000,
            "exp": 2,
            "skills": ["Kecepatan Mengetik 60+ WPM", "Excel Data Cleansing", "Pengarsipan Digital", "Cek Akurasi Dokumen", "Pekerja Teliti"],
            "about": "Pekerja administrasi yang teliti dan terorganisir. Mampu mengetik cepat tanpa typo, mengolah ratusan lembar data form menjadi format spreadsheet terstruktur, serta menjaga kerahasiaan data kantor.",
            "gender": "f"
        },
        {
            "name": "Panji Gumilang",
            "city": "Kab. Bandung",
            "headline": "Staff Lapangan & Surveyor Pemetaan Lokasi",
            "category": "Umum & Jasa Lainnya",
            "salary": 3400000,
            "exp": 2,
            "skills": ["GPS & Google Maps Tagging", "Verifikasi Data Lapangan", "Wawancara Responden", "Dokumentasi Foto Lapangan", "Fisik Tangguh"],
            "about": "Terbiasa bekerja mobile di lapangan di berbagai medan cuaca. Berpengalaman melakukan survei verifikasi alamat kredit, titik lokasi jaringan, dan wawancara kuesioner dengan integritas tinggi.",
            "gender": "m"
        },
        {
            "name": "Dewi Anggraeni",
            "city": "Cimahi",
            "headline": "Admin Gudang & Pengiriman Ekspedisi",
            "category": "Operasional & Logistik",
            "salary": 3200000,
            "exp": 2,
            "skills": ["Cetak Resi Marketplace", "Manifest Ekspedisi (J&T, SiCepat, JNE)", "Rekap Retur Barang", "Koordinasi Kurir", "Input Resi Cepat"],
            "about": "Spesialis pengurusan dokumen pergudangan e-commerce. Memastikan seluruh paket harian terkirim dengan nomor resi valid, memantau kendala retur paket, serta membuat laporan pengiriman harian.",
            "gender": "f"
        },
        {
            "name": "Agung Setiadi",
            "city": "Kota Bandung",
            "headline": "Junior Web Developer (React / JavaScript)",
            "category": "Teknologi & IT",
            "salary": 4500000,
            "exp": 2,
            "skills": ["React.js & Vite", "Tailwind CSS", "REST API Integration", "Git / GitHub", "Responsive Web Design"],
            "about": "Programmer web junior lulusan Informatika yang antusias membangun antarmuka web modern. Menguasai komponen React, styling Tailwind CSS yang clean, serta pengujian integrasi API backend.",
            "gender": "m"
        },
        {
            "name": "Fitri Handayani",
            "city": "Kab. Bandung",
            "headline": "Staff Baker & Dekorasi Kue Pastry",
            "category": "Restoran & F&B",
            "salary": 3300000,
            "exp": 3,
            "skills": ["Adonan Roti & Donat", "Dekorasi Cake Ulang Tahun", "Oven & Suhu Panggang", "Food Costing", "Sanitasi Pastry"],
            "about": "Pembuat kue dan roti berpengalaman 3 tahun di bakery komersial. Menguasai teknik proofing adonan roti lembut, butter cake, dekorasi whipping cream rapi, serta penghitungan kebutuhan bahan baku.",
            "gender": "f"
        },
        {
            "name": "Teguh Santoso",
            "city": "Kota Bandung",
            "headline": "Staff Pengemasan (Packing) & Dispatching",
            "category": "Operasional & Logistik",
            "salary": 3000000,
            "exp": 2,
            "skills": ["Bubble Wrap & Lakban Cepat", "Packing Kayu Ringan", "Labeling Alamat", "Ketahanan Fisik Prima", "Disiplin Waktu"],
            "about": "Tenaga packing yang lincah dan berhati-hati menangani barang pecah belah maupun paket elektronik. Terbiasa menyelesaikan ratusan pesanan per hari agar siap di-pickup tepat waktu.",
            "gender": "m"
        },
        {
            "name": "Lia Marlina",
            "city": "Cimahi",
            "headline": "Staff SPG Counter / Beauty Advisor Kosmetik",
            "category": "Penjualan & Pemasaran",
            "salary": 3600000,
            "exp": 2,
            "skills": ["Beauty Consulting", "Make Up Demo", "Pencapaian Target Counter", "Product Knowledge Skincare", "Komunikasi Ramah"],
            "about": "Berpenampilan menarik, berkulit bersih, dan komunikatif. Berpengalaman 2 tahun sebagai Beauty Advisor di counter kosmetik ternama Bandung, piawai menawarkan produk dan merawat hubungan pelanggan.",
            "gender": "f"
        },
        {
            "name": "Ilham Maulana",
            "city": "Kab. Bandung Barat",
            "headline": "Staff Gudang Bahan Baku & Checker Produksi",
            "category": "Manufaktur & Pabrik",
            "salary": 3300000,
            "exp": 3,
            "skills": ["Pencatatan Material Masuk", "Sampling Kualitas Bahan", "Koordinasi Operator Produksi", "Pencegahan Shrinkage", "Administrasi Gudang"],
            "about": "Berpengalaman 3 tahun mengelola aliran bahan baku pada lini manufaktur. Teliti dalam menghitung jumlah material sesuai surat jalan dan memastikan ketersediaan bahan bakar/baku sebelum jam produksi.",
            "gender": "m"
        },
        {
            "name": "Ratna Sari Dewi",
            "city": "Kota Bandung",
            "headline": "Staff Billing, Penagihan & Account Receivable",
            "category": "Administrasi & Keuangan",
            "salary": 3900000,
            "exp": 3,
            "skills": ["Penagihan Invoice Sopan", "Rekap Aging Piutang", "Rekonsiliasi Pembayaran", "Email Reminder Tagihan", "Problem Solving Finansial"],
            "about": "Memiliki keahlian komunikasi persuasif dan diplomatis dalam menagih pembayaran klien yang jatuh tempo. Berpengalaman menurunkan persentase bad debt secara konsisten di perusahaan distribusi.",
            "gender": "f"
        }
    ]

    avatars_m = ["/avatars/pixar_male_1.jpg", "/avatars/pixar_male_2.jpg", "/avatars/pixar_male_3.jpg"]
    avatars_f = ["/avatars/pixar_female_1.jpg", "/avatars/pixar_female_2.jpg", "/avatars/pixar_female_3.jpg", "/avatars/pixar_female_red_1.jpg"]

    now = datetime.now()
    cur_act.execute("SELECT full_name FROM seeker_profiles")
    existing_names = set(r[0].strip().lower() for r in cur_act.fetchall() if r[0])

    added = 0
    for c in candidates:
        if c["name"].strip().lower() in existing_names:
            continue
        seeker_id = str(uuid.uuid4())
        talent_id = str(uuid.uuid4())
        photo = random.choice(avatars_m) if c["gender"] == "m" else random.choice(avatars_f)
        phone = "08" + "".join([str(random.randint(0, 9)) for _ in range(10)])
        created_at = (now - timedelta(hours=random.randint(1, 48), minutes=random.randint(0, 59))).isoformat() + "Z"

        cur_act.execute('''
            INSERT INTO seeker_profiles (id, user_id, full_name, domicile_city, phone, about, photo_url, created_at, updated_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
        ''', (seeker_id, c["name"], c["city"], phone, c["about"], photo, created_at, created_at))

        skills_json = json.dumps(c["skills"])
        work_types_json = json.dumps(["full-time"])

        cur_act.execute('''
            INSERT INTO talent_marketplace_posts (
                id, seeker_id, user_id, headline, category, bio, bio_summary,
                skills, experience_years, availability, availability_status, work_types,
                expected_salary, rate_type, domicile_city, whatsapp_number, portfolio_url,
                resume_url, badge, photo_url, views_count, is_published, created_at, updated_at
            ) VALUES (
                ?, ?, NULL, ?, ?, ?, ?,
                ?, ?, "fulltime", "available", ?,
                ?, "monthly", ?, ?, "",
                "", "SIAP KERJA", ?, ?, 1, ?, ?
            )
        ''', (
            talent_id, seeker_id, c["headline"], c["category"], c["about"], c["about"][:150],
            skills_json, c["exp"], work_types_json,
            c["salary"], c["city"], phone, photo, random.randint(10, 80), created_at, created_at
        ))
        added += 1

    con_act.commit()

    # WAL Checkpoint
    cur_act.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    cur_act.execute("SELECT count(*) FROM talent_marketplace_posts")
    final_talents = cur_act.fetchone()[0]
    cur_act.execute("SELECT count(*) FROM job_listings")
    final_jobs = cur_act.fetchone()[0]

    print(f"Added {added} new candidates.")
    print(f"Total Talents in DB: {final_talents}")
    print(f"Total Jobs in DB: {final_jobs}")

    con_act.close()

if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else '/home/vrintex/loxer/data/loxer.db'
    bak = sys.argv[2] if len(sys.argv) > 2 else '/home/vrintex/loxer/data/backups/loxer_20261023_000909.db'
    main(db, bak)
