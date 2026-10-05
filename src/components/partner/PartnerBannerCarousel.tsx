import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';

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

interface PartnerBannerCarouselProps {
  slides?: PartnerSlide[];
  autoPlayInterval?: number;
  className?: string;
  variant?: 'public' | 'dashboard';
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
    highlightText: 'Dengan Bagi Hasil Transparan',
    subtitle: 'Dapatkan komisi terstruktur dari posting loker perusahaan, verifikasi kandidat, subscription, dan transaksi jasa mandiri di wilayah operasional Anda.',
    primaryCta: {
      label: 'Hitung Potensi Profit',
      href: '#kalkulator-profit',
    },
    secondaryCta: {
      label: 'Konsultasi WhatsApp',
      href: '#cara-bergabung',
    },
    metrics: [
      { label: 'Model Bagi Hasil', value: 'Hingga 70%' },
      { label: 'Pencairan', value: 'Realtime / Mingguan' },
      { label: 'Dashboard Analitik', value: 'Lengkap' },
    ],
  },
  {
    id: 'partner-ai-features',
    image: '/banners/banner-2.jpg',
    badge: 'Didukung AI Smart Multimodal Gemini 3.8',
    badgeColor: 'violet',
    title: 'Dilengkapi Fitur Cerdas Tercanggih',
    highlightText: 'Otomatis untuk Pelamar Anda',
    subtitle: 'Ekstraksi CV instan, crop pas foto 1:1 simetris, penajaman foto buram otomatis, dan sensor privasi kontak Shopee-grade aktif otomatis di cabang Anda.',
    primaryCta: {
      label: 'Ajukan Kemitraan',
      href: '#cara-bergabung',
    },
    secondaryCta: {
      label: 'Keuntungan Mitra',
      href: '#keuntungan',
    },
    metrics: [
      { label: 'Sensor Privasi', value: 'Shopee-Grade' },
      { label: 'Auto Crop', value: '1:1 Presisi' },
      { label: 'AI Engine', value: 'Gemini 3.8' },
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
    metrics: [
      { label: 'Target Konversi', value: 'Tinggi' },
      { label: 'Jaringan Cabang', value: 'Aktif' },
    ],
  },
  {
    id: 'dash-updates',
    image: '/banners/banner-2.jpg',
    badge: 'Pembaruan Fitur Core',
    badgeColor: 'violet',
    title: 'Fitur Ekstraksi AI Gemini 3.8 Aktif',
    highlightText: 'Kualitas Portofolio Otomatis',
    subtitle: 'Semua pelamar kerja di cabang Anda kini mendapatkan pas foto 1:1 presisi, fitur penajaman otomatis gambar scan, dan sensor privasi kontak ketat.',
    primaryCta: {
      label: 'Baca Panduan Mitra',
      onClick: () => {
        const el = document.getElementById('tab-guide');
        if (el) el.click();
      },
    },
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

export default function PartnerBannerCarousel({
  slides,
  autoPlayInterval = 5000,
  className = '',
  variant = 'public',
}: PartnerBannerCarouselProps) {
  const activeSlides = slides && slides.length > 0
    ? slides
    : variant === 'dashboard'
    ? DEFAULT_DASHBOARD_PARTNER_SLIDES
    : DEFAULT_PUBLIC_PARTNER_SLIDES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Autoplay
  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, autoPlayInterval, activeSlides.length]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // min swipe distance in px
    if (diff > threshold) {
      nextSlide();
    } else if (diff < -threshold) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentSlide = activeSlides[currentIndex];

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300';
      case 'amber':
        return 'bg-amber-500/15 border-amber-400/40 text-amber-300';
      case 'violet':
        return 'bg-violet-500/15 border-violet-400/40 text-violet-300';
      case 'cyan':
      default:
        return 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300';
    }
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Images Layer */}
      <div className="relative h-[440px] sm:h-[460px] md:h-[480px] lg:h-[500px] w-full overflow-hidden">
        {activeSlides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover object-center scale-[1.02] transform transition-transform duration-1000 ease-out"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/banners/banner-1.jpg';
                }}
              />
              {/* Cinematic multi-stop gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
              <div className="absolute inset-0 bg-radial-at-tl from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
            </div>
          );
        })}

        {/* Content Overlay */}
        <div className="relative z-20 flex h-full flex-col justify-between p-6 sm:p-8 md:p-12 max-w-4xl">
          {/* Top Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md shadow-sm transition-all duration-300 ${getBadgeStyle(
                currentSlide.badgeColor
              )}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentSlide.badge}</span>
            </span>
          </div>

          {/* Center Text & Heading */}
          <div className="space-y-3.5 my-auto max-w-2xl animate-fade-in">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              {currentSlide.title}{' '}
              {currentSlide.highlightText && (
                <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300 bg-clip-text text-transparent">
                  {currentSlide.highlightText}
                </span>
              )}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl font-normal drop-shadow">
              {currentSlide.subtitle}
            </p>

            {/* Metrics Pills if available */}
            {currentSlide.metrics && currentSlide.metrics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {currentSlide.metrics.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/70 backdrop-blur-md px-3 py-1.5 text-xs"
                  >
                    <span className="text-slate-400 font-medium">{m.label}:</span>
                    <span className="font-bold text-cyan-300">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {currentSlide.primaryCta && (
              currentSlide.primaryCta.href ? (
                <a
                  href={currentSlide.primaryCta.href}
                  download={currentSlide.primaryCta.href.endsWith('.apk') ? 'loxer-mitra.apk' : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 px-5 py-3 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>{currentSlide.primaryCta.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={currentSlide.primaryCta.onClick}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 px-5 py-3 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>{currentSlide.primaryCta.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )
            )}

            {currentSlide.secondaryCta && (
              currentSlide.secondaryCta.href ? (
                <a
                  href={currentSlide.secondaryCta.href}
                  download={currentSlide.secondaryCta.href.endsWith('.apk') ? 'loxer-mitra.apk' : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-md text-white px-5 py-3 text-xs sm:text-sm font-semibold transition hover:border-white/40"
                >
                  <span>{currentSlide.secondaryCta.label}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={currentSlide.secondaryCta.onClick}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-md text-white px-5 py-3 text-xs sm:text-sm font-semibold transition hover:border-white/40"
                >
                  <span>{currentSlide.secondaryCta.label}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Carousel Prev/Next Buttons */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Slide sebelumnya"
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 backdrop-blur-md text-white transition hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Slide berikutnya"
          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 backdrop-blur-md text-white transition hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Indicators Dots */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 backdrop-blur-md px-3 py-1.5">
          {activeSlides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => goToSlide(idx)}
              aria-label={`Pindah ke slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-6 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
