export interface PartnerSlide {
  id: string;
  image: string;
  badge: string;
  badgeColor?: 'cyan' | 'amber' | 'emerald' | 'violet';
  title: string;
  highlightText?: string;
  subtitle: string;
  primaryCta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryCta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  metrics?: { label: string; value: string }[];
}

export const DEFAULT_PUBLIC_PARTNER_SLIDES: PartnerSlide[] = [
  {
    id: 'partner-ecosystem',
    image: '/banners/partner-banner-1.jpg',
    badge: 'Program Kemitraan Digital 2026',
    badgeColor: 'cyan',
    title: 'Bangun Cabang Bursa Kerja Digital',
    highlightText: 'Atas Nama Brand Anda Sendiri',
    subtitle: 'Satu core teknologi LOXER, identitas dan pengguna milik cabang Anda. Akses ribuan lowongan kerja dan talenta terverifikasi tanpa biaya infrastruktur server.',
    primaryCta: {
      label: 'Pelajari Cara Bergabung',
      href: '#cara-bergabung',
    },
    secondaryCta: {
      label: 'Buka Portal Mitra',
      href: '/portal-mitra',
    },
    metrics: [
      { label: 'Multi-Tenant', value: '100% Terisolasi' },
      { label: 'Kategori Keahlian', value: '16+ Bidang' },
      { label: 'Biaya Server', value: 'Rp 0 / Gratis' },
    ],
  },
  {
    id: 'partner-revenue',
    image: '/banners/partner-banner-2.jpg',
    badge: 'Bagi Hasil & Revenue Stream Mandiri',
    badgeColor: 'emerald',
    title: 'Monetisasi Ekosistem Kerja Lokal',
    highlightText: 'Penghasilan Berkelanjutan',
    subtitle: 'Raih bagi hasil kompetitif dari setiap postingan lowongan berbayar, promosi talenta, dan transaksi rekrutmen yang terjadi di portal cabang digital Anda.',
    primaryCta: {
      label: 'Hitung Simulasi Profit',
      href: '#kalkulator-profit',
    },
    secondaryCta: {
      label: 'Daftar Mitra Sekarang',
      href: '#formulir-pengajuan',
    },
    metrics: [
      { label: 'Bagi Hasil', value: 'Hingga 70%' },
      { label: 'Pencairan', value: 'Realtime / Mingguan' },
      { label: 'Modal Awal', value: 'Rp 0' },
    ],
  },
  {
    id: 'partner-cloud-panel',
    image: '/banners/banner-4.jpg',
    badge: 'Child Panel Eksklusif & Mandiri',
    badgeColor: 'amber',
    title: 'Panel Operasional Khusus Pemilik Cabang',
    highlightText: 'Data Aman & Terpisah',
    subtitle: 'Kelola anggota, pantau metrik cabang, atur identitas logo, WhatsApp CS, dan sesuaikan tampilan beranda cabang langsung dari ruang kerja khusus.',
    primaryCta: {
      label: 'Masuk Portal Mitra',
      href: '/portal-mitra',
    },
    secondaryCta: {
      label: 'Syarat & Alur',
      href: '#cara-bergabung',
    },
    metrics: [
      { label: 'Privasi Data', value: 'Terenkripsi' },
      { label: 'Dukungan CS', value: '24/7 Siaga' },
      { label: 'Custom Slug', value: 'loxer.id/p/anda' },
    ],
  },
  {
    id: 'partner-mobile-app',
    image: '/banners/partner-banner-1.jpg',
    badge: 'Aplikasi Android Resmi Mitra',
    badgeColor: 'emerald',
    title: 'Kelola Cabang Praktis Dari Smartphone',
    highlightText: 'Aplikasi Standalone Ringan & Cepat',
    subtitle: 'Pasang aplikasi Android LOXER Mitra di ponsel Anda. Pantau pendaftar baru, verifikasi talenta, dan perbarui profil cabang tanpa hambatan browser.',
    primaryCta: {
      label: 'Unduh APK Mitra (1.6 MB)',
      href: '/downloads/loxer-mitra.apk',
    },
    secondaryCta: {
      label: 'Masuk Portal Mitra',
      href: '/portal-mitra',
    },
    metrics: [
      { label: 'Ukuran Aplikasi', value: '1.6 MB' },
      { label: 'Tipe File', value: 'Android .APK' },
      { label: 'Kompatibilitas', value: 'Android 5.0+' },
    ],
  },
];

export const DEFAULT_DASHBOARD_PARTNER_SLIDES: PartnerSlide[] = [
  {
    id: 'dash-welcome',
    image: '/banners/partner-banner-1.jpg',
    badge: 'Ruang Kerja Mitra LOXER',
    badgeColor: 'cyan',
    title: 'Selamat Datang di Portal Cabang Anda',
    highlightText: 'Pusat Kendali Bisnis Digital',
    subtitle: 'Gunakan tautan resmi cabang untuk mengundang pencari kerja dan perusahaan lokal. Semua pengguna yang mendaftar melalui tautan ini otomatis terhubung ke cabang Anda.',
    primaryCta: {
      label: 'Lihat Pengguna Cabang',
      onClick: () => {
        const el = document.getElementById('tab-members');
        if (el) el.click();
      },
    },
    secondaryCta: {
      label: 'Atur Branding',
      onClick: () => {
        const el = document.getElementById('tab-branding');
        if (el) el.click();
      },
    },
    metrics: [
      { label: 'Core Version', value: 'LOXER 2026.1' },
      { label: 'Status Server', value: 'Operasional 100%' },
      { label: 'Data Pengguna', value: 'Terisolasi Aman' },
    ],
  },
  {
    id: 'dash-growth',
    image: '/banners/partner-banner-2.jpg',
    badge: 'Tips Pertumbuhan & Optimasi',
    badgeColor: 'emerald',
    title: 'Percepat Akuisisi Pengguna Cabang',
    highlightText: 'Distribusi Link Komunitas',
    subtitle: 'Lengkapi identitas WhatsApp CS resmi, perbarui headline beranda cabang, dan bagikan lowongan kerja ke grup alumni kampus atau komunitas lokal untuk menjaring pelamar.',
    primaryCta: {
      label: 'Perbarui Tampilan Cabang',
      onClick: () => {
        const el = document.getElementById('tab-branding');
        if (el) el.click();
      },
    },
    secondaryCta: {
      label: 'Buka Dokumen Panduan',
      href: '/docs/panduan-mitra.html',
    },
    metrics: [
      { label: 'Channel Distribusi', value: 'Grup WA / Telegram' },
      { label: 'Estimasi Konversi', value: 'Tinggi (Lokal)' },
      { label: 'Retensi Pengguna', value: 'Otomatis' },
    ],
  },
  {
    id: 'dash-apk',
    image: '/banners/partner-banner-1.jpg',
    badge: 'Aplikasi Android Mitra (APK)',
    badgeColor: 'emerald',
    title: 'Akses Portal Praktis Dari Ponsel',
    highlightText: 'Install Aplikasi Mitra Resmi',
    subtitle: 'Pasang aplikasi LOXER Mitra di ponsel Android Anda untuk mengelola lowongan dan pendaftar cabang kapan saja di mana saja.',
    primaryCta: {
      label: 'Unduh APK Mitra (.APK)',
      href: '/downloads/loxer-mitra.apk',
    },
    metrics: [
      { label: 'File APK', value: '1.6 MB' },
      { label: 'Versi', value: 'v1.0.0' },
      { label: 'Akses', value: 'Mobile Instan' },
    ],
  },
];
