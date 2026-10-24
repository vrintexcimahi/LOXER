import { CvData } from '../lib/cvTypes';

export interface RolePreset {
  roleName: string;
  category: string;
  headline: string;
  summary: string;
  skills: string[];
  sampleCompany: string;
  sampleExpDesc: string;
  sampleSchool: string;
  sampleMajor: string;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    roleName: 'Staff Administrasi & Keuangan',
    category: 'Administrasi & Kantor',
    headline: 'Staff Administrasi Perkantoran & Akuntansi',
    summary:
      'Pribadi yang teliti, terorganisir, dan berorientasi pada detail dengan pengalaman mengelola pembukuan kas kecil, rekonsiliasi bank, korespondensi surat menyurat, pengarsipan berkas legalitas, serta penguasaan mahir Microsoft Office.',
    skills: ['Microsoft Excel (VLOOKUP/Pivot)', 'Pengarsipan Digital', 'Jurnal Kas Masuk & Keluar', 'Rekonsiliasi Bank', 'Surat Menyurat Resmi', 'SAP / Accurate Dasar'],
    sampleCompany: 'CV Indo Pratama Sejahtera',
    sampleExpDesc: 'Mengelola pencatatan arus kas operasional harian, membuat faktur penagihan (invoice) klien, dan menyusun laporan pertanggungjawaban kas kecil bulanan dengan akurasi 100%.',
    sampleSchool: 'SMK Negeri 1 Kota Bandung',
    sampleMajor: 'Akuntansi & Keuangan Lembaga',
  },
  {
    roleName: 'Kasir & Pramuniaga Retail',
    category: 'Kasir & Retail',
    headline: 'Kasir Retail & Staff Pelayanan Toko',
    summary:
      'Lulusan muda yang ramah, jujur, dan berenergi tinggi dengan rekam jejak melayani ratusan transaksi kasir per hari via mesin POS, pencatatan stock opname barang toko, display rak produk menarik, dan ketelitian selisih kas nol (zero variance).',
    skills: ['Mesin Kasir POS / Moka', 'Transaksi Tunai & QRIS/EDC', 'Stock Opname Toko', 'Display Merchandising', 'Customer Service Prima', 'Up-Selling Ramah'],
    sampleCompany: 'PT Retail Nusantara Modern',
    sampleExpDesc: 'Melayani pembayaran pelanggan dengan cepat dan teliti, menjaga kebersihan area kasir, melakukan penghitungan uang modal dan omzet di akhir shift tanpa selisih.',
    sampleSchool: 'SMK Negeri 3 Cimahi',
    sampleMajor: 'Bisnis Daring & Pemasaran',
  },
  {
    roleName: 'Barista & F&B Service',
    category: 'Modern & Profesional',
    headline: 'Barista Profesional & Layanan Restoran / Cafe',
    summary:
      'Barista berpengalaman yang memiliki passion mendalam terhadap seni seduh kopi manual dan espresso machine. Mahir kalibrasi biji kopi, hospitality hangat kepada pelanggan, menjaga higienitas bar (HACCP), serta pengelolaan inventaris bahan baku.',
    skills: ['Espresso Calibration', 'Latte Art', 'Manual Brew V60/Aeropress', 'Point of Sales (POS)', 'Hospitality & Greeting', 'Sanitasi Area Bar'],
    sampleCompany: 'Kopi Sejiwa Coffee & Eatery',
    sampleExpDesc: 'Mengoperasikan mesin espresso komersial 2-group, menyajikan rata-rata 150+ cup minuman kopi berkualitas konsisten per shift, dan merawat mesin secara berkala.',
    sampleSchool: 'SMK Pariwisata Bandung',
    sampleMajor: 'Tata Boga & Perhotelan',
  },
  {
    roleName: 'Staff Gudang & Logistik',
    category: 'Modern & Profesional',
    headline: 'Staff Pergudangan, Inventory & Packing',
    summary:
      'Tenaga operasional gudang dengan fisik prima, kedisiplinan tinggi, dan pemahaman tata kelola barang masuk/keluar (FIFO/FEFO). Terbiasa bongkar muat kontainer, labeling resi ekspedisi, dan audit inventaris harian.',
    skills: ['Warehouse Management System (WMS)', 'Stock Opname Berkala', 'Bongkar Muat Barang', 'Packing & Bubble Wrap Cepat', 'Metode FIFO/FEFO', 'K3 Pergudangan'],
    sampleCompany: 'PT Logistik Distribusi Cepat',
    sampleExpDesc: 'Melakukan picking dan packing barang pesanan e-commerce hingga 300+ paket per hari dengan tingkat akurasi 99.8% sesuai standard operating procedure.',
    sampleSchool: 'SMK Negeri 2 Baleendah',
    sampleMajor: 'Teknik Logistik & Distribusi',
  },
  {
    roleName: 'Graphic Designer & Social Media',
    category: 'Kreatif & Desain',
    headline: 'Junior Graphic Designer & Content Creator',
    summary:
      'Kreator visual yang adaptif terhadap tren desain dan media sosial. Mahir merancang banner promosi digital, feed/reels Instagram, katalog produk marketplace, serta materi branding cetak menggunakan Adobe Creative Suite.',
    skills: ['Adobe Photoshop', 'Adobe Illustrator', 'Canva Pro Master', 'Layout & Tipografi', 'Editing Video CapCut', 'Branding Identity'],
    sampleCompany: 'Studio Media Kreatif Asia',
    sampleExpDesc: 'Merancang 20+ aset visual per minggu untuk kampanye digital marketing, meningkatkan engagement akun media sosial klien hingga 45% dalam 6 bulan.',
    sampleSchool: 'SMK Negeri 14 Bandung',
    sampleMajor: 'Desain Komunikasi Visual (DKV)',
  },
  {
    roleName: 'Customer Service & Telemarketing',
    category: 'Administrasi & Kantor',
    headline: 'Customer Service & Chat Support Specialist',
    summary:
      'Spesialis layanan pelanggan dengan tutur kata sopan, empati tinggi, dan ketangkasan mengetik cepat. Berpengalaman menangani keluhan konsumen, konsultasi produk, serta konversi chat menjadi penjualan dengan rating kepuasan 4.9/5.',
    skills: ['Chat Commerce (Shopee/Tokopedia/WA)', 'Penanganan Komplain Konsumen', 'Kecepatan Mengetik 70 WPM', 'CRM & Zendesk', 'Komunikasi Empatik', 'Pencatatan Tiket Masalah'],
    sampleCompany: 'PT E-Commerce Niaga Sukses',
    sampleExpDesc: 'Merespon rata-rata 250+ chat pelanggan per hari dengan response time di bawah 2 menit, serta menyelesaikan kendala pengiriman dan retur secara solutif.',
    sampleSchool: 'SMA Negeri 2 Cimahi',
    sampleMajor: 'Ilmu Pengetahuan Sosial (IPS)',
  },
  {
    roleName: 'Teknisi Listrik & Maintenance',
    category: 'Modern & Profesional',
    headline: 'Teknisi Listrik Gedung & Maintenance AC',
    summary:
      'Teknisi lapangan berpengalaman dalam perbaikan instalasi kelistrikan 1 fasa dan 3 fasa, perawatan rutin AC split/central, troubleshooting panel distribusi, genset cadangan, dan penerapan standar K3 kelistrikan.',
    skills: ['Instalasi Listrik 1 & 3 Phase', 'Perawatan & Cuci AC', 'Troubleshooting Panel Listrik', 'Penggunaan Multitester & Tang Ampere', 'Standar Keselamatan K3', 'Preventive Maintenance'],
    sampleCompany: 'CV Mitra Teknik Perkasa',
    sampleExpDesc: 'Melakukan inspeksi berkala pada panel daya dan instalasi penerangan gedung perkantoran 4 lantai, serta perbaikan darurat gangguan kelistrikan tepat waktu.',
    sampleSchool: 'SMK Negeri 4 Bandung',
    sampleMajor: 'Teknik Instalasi Tenaga Listrik',
  },
  {
    roleName: 'Operator Jahit & Konveksi Garment',
    category: 'Modern & Profesional',
    headline: 'Operator Mesin Jahit High-Speed & Quality Control',
    summary:
      'Penjahit terampil berpengalaman mengoperasikan mesin jahit jarum satu (single needle), obras, dan overdeck. Cepat memahami pola pakaian, jahitan rapi sesuai standar ekspor, dan mampu memenuhi target lini produksi.',
    skills: ['Mesin Jahit High-Speed Juki', 'Obras & Overdeck', 'Paham Pola Baju & Kerah', 'Quality Control Jahitan', 'Kecepatan Jahit Konsisten', 'Perawatan Ringan Mesin'],
    sampleCompany: 'PT Sandang Busana Lestari',
    sampleExpDesc: 'Menyelesaikan perakitan komponen baju garmen dengan target 400 potong per hari dengan angka cacat (defect rate) di bawah 1%.',
    sampleSchool: 'SMK Negeri 9 Bandung',
    sampleMajor: 'Tata Busana',
  },
];

export async function generateCvDataAutomatically(targetRole: string, baseData?: Partial<CvData>): Promise<CvData> {
  const preset = ROLE_PRESETS.find((p) => p.roleName.toLowerCase().includes(targetRole.toLowerCase())) || ROLE_PRESETS[0];

  const nowYear = new Date().getFullYear();

  const generated: CvData = {
    fullName: baseData?.fullName || 'Budi Santoso',
    headline: preset.headline,
    email: baseData?.email || 'budi.santoso@gmail.com',
    phone: baseData?.phone || '0812-9876-5432',
    city: baseData?.city || 'Kota Bandung, Jawa Barat',
    photoUrl: baseData?.photoUrl || '/avatars/pixar_male_1.jpg',
    summary: preset.summary,
    experiences: [
      {
        id: `exp-${Date.now()}-1`,
        position: preset.roleName,
        company: preset.sampleCompany,
        period: `${nowYear - 2} - Sekarang`,
        description: preset.sampleExpDesc,
      },
      {
        id: `exp-${Date.now()}-2`,
        position: `Junior ${preset.roleName.split('&')[0].trim()}`,
        company: 'CV Multi Niaga Mandiri',
        period: `${nowYear - 4} - ${nowYear - 2}`,
        description: `Membantu operasional harian, berkoordinasi dengan tim kerja, dan menyelesaikan tugas-tugas pendukung sesuai arahan supervisor dengan tepat waktu.`,
      },
    ],
    educations: [
      {
        id: `edu-${Date.now()}-1`,
        school: preset.sampleSchool,
        major: preset.sampleMajor,
        period: `${nowYear - 7} - ${nowYear - 4}`,
        gpa: 'Lulus dengan Nilai Baik',
      },
    ],
    skills: preset.skills,
    languages: [
      { name: 'Bahasa Indonesia', level: 'Fasih (Bahasa Asli)' },
      { name: 'Bahasa Inggris', level: 'Menengah / Pasif' },
    ],
  };

  return generated;
}
