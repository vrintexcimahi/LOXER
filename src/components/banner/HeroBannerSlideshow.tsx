import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UserRole } from '../../lib/types';
import UserOnlinePresence from './UserOnlinePresence';

export interface BannerSlide {
  id: string;
  image: string;
  alt: string;
  title: string;
  subtitle: string;
  targetRole?: UserRole;
  actionUrl: string;
  badge: string;
}

export const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'loker-promo',
    image: '/banners/banner-1.jpg',
    alt: 'LOXER - Cari Kerja Jadi Lebih Mudah',
    title: 'Pusat Iklan Loker',
    subtitle: 'Lamar 1-Klik Tanpa Ribet',
    targetRole: 'seeker',
    actionUrl: '/browse',
    badge: 'Iklan Loker',
  },
  {
    id: 'employer-promo',
    image: '/banners/banner-2.jpg',
    alt: 'LOXER - Solusi Rekrutmen Digital untuk Tim Modern',
    title: 'Pelamar Kerja Siap Rekrut',
    subtitle: 'Talenta Terverifikasi Indonesia',
    targetRole: 'employer',
    actionUrl: '/talents?availability=fulltime',
    badge: 'Pelamar Kerja',
  },
  {
    id: 'jasa-promo',
    image: '/banners/banner-3.jpg',
    alt: 'LOXER - Platform Rekrutmen Terpercaya Indonesia',
    title: 'Penyedia Jasa Mandiri',
    subtitle: 'Layanan Panggilan & Di Tempat',
    targetRole: 'seeker',
    actionUrl: '/talents?availability=freelance',
    badge: 'Jasa Mandiri',
  },
  {
    id: 'marketplace-promo',
    image: '/banners/banner-4.jpg',
    alt: 'LOXER - Marketplace Produk & Alat Kerja',
    title: 'Marketplace Member LOXER',
    subtitle: 'Produk Digital & Peralatan Kerja',
    targetRole: 'seeker',
    actionUrl: '/marketplace',
    badge: 'Marketplace',
  },
];

const AUTOPLAY_INTERVAL = 4500;

export interface HeroBannerSlideshowProps {
  onRegister?: (role?: UserRole) => void;
  initialSlide?: number;
  variant?: 'embedded' | 'standalone';
  className?: string;
  showOnlinePresence?: boolean;
}

export default function HeroBannerSlideshow({
  onRegister,
  initialSlide = 0,
  variant = 'embedded',
  className = '',
  showOnlinePresence = true,
}: HeroBannerSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(
    initialSlide >= 0 && initialSlide < BANNER_SLIDES.length ? initialSlide : 0
  );
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Autoplay timer
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const handleSlideClick = (slide: BannerSlide) => {
    if (slide.actionUrl && window.location.pathname + window.location.search !== slide.actionUrl) {
      window.location.href = slide.actionUrl;
    } else if (onRegister && slide.targetRole) {
      onRegister(slide.targetRole);
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      nextSlide();
    } else if (distance < -50) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (variant === 'embedded') {
    return (
      <div
        className={`w-full select-none ${className}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* User Online Presence Indicator Bar above Carousel */}
        {showOnlinePresence && (
          <UserOnlinePresence className="mb-3 sm:mb-4 animate-fade-up" />
        )}

        {/* Carousel Frame Container */}
        <div className="relative w-full">
          {/* Glow ambient background behind the card */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-teal-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 -z-10" />

          {/* Outer Frame with glassy border - Large hero display */}
          <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-400/30 bg-slate-950 shadow-2xl shadow-cyan-950/60 ring-1 ring-white/10 w-full aspect-[16/9]">
          {/* Slides Track */}
          <div
            className="flex h-full w-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {BANNER_SLIDES.map((slide, idx) => (
              <div
                key={slide.id}
                onClick={() => handleSlideClick(slide)}
                className="relative min-w-full w-full h-full cursor-pointer overflow-hidden flex-shrink-0 bg-slate-950 flex items-center justify-center"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSlideClick(slide);
                  }
                }}
                aria-label={`Slide ${idx + 1}: ${slide.alt}`}
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  className="w-full h-full object-contain bg-slate-950 object-center block"
                />

                {/* Subtle dark gradient overlay at bottom for pagination dots contrast */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/70 to-transparent pointer-events-none" />

                {/* Top Badge */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1 text-[10px] sm:text-xs font-semibold text-cyan-300 border border-cyan-400/40 shadow-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {slide.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-md border border-white/20 shadow-xl hover:bg-cyan-500 hover:text-slate-950 hover:scale-105 active:scale-95 transition-all opacity-70 group-hover:opacity-100 cursor-pointer"
            aria-label="Slide sebelumnya"
          >
            <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-md border border-white/20 shadow-xl hover:bg-cyan-500 hover:text-slate-950 hover:scale-105 active:scale-95 transition-all opacity-70 group-hover:opacity-100 cursor-pointer"
            aria-label="Slide selanjutnya"
          >
            <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>

          {/* Indicators / Pagination Dots (Centered at bottom) */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 border border-white/15 shadow-xl">
            {BANNER_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(idx);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-6 sm:w-8 h-2 sm:h-2.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]'
                    : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ke slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

  // Standalone Variant (Full Width)
  return (
    <div
      className={`w-full max-w-5xl mx-auto mb-3 sm:mb-5 px-1 sm:px-4 select-none animate-fade-up ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showOnlinePresence && (
        <UserOnlinePresence className="mb-3 sm:mb-4 animate-fade-up" />
      )}
      <div className="relative group overflow-hidden rounded-2xl sm:rounded-3xl border border-sky-400/25 bg-slate-900 shadow-2xl shadow-cyan-500/20 ring-1 ring-white/10 aspect-[16/9] w-full">
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {BANNER_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => handleSlideClick(slide)}
              className="relative min-w-full w-full h-full cursor-pointer overflow-hidden flex-shrink-0 bg-slate-950 flex items-center justify-center"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSlideClick(slide);
                }
              }}
              aria-label={`Slide ${idx + 1}: ${slide.alt}`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                loading={idx === 0 ? 'eager' : 'lazy'}
                className="w-full h-full object-contain bg-slate-950 object-center block"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/70 to-transparent pointer-events-none" />
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1 text-[10px] sm:text-xs font-semibold text-cyan-300 border border-cyan-400/30 shadow-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {slide.badge}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md border border-white/20 shadow-lg hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
          aria-label="Slide sebelumnya"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md border border-white/20 shadow-lg hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
          aria-label="Slide selanjutnya"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-slate-950/60 backdrop-blur-md px-3 py-1.5 border border-white/10 shadow-lg">
          {BANNER_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(idx);
              }}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                currentIndex === idx
                  ? 'w-6 sm:w-8 h-2 sm:h-2.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]'
                  : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Ke slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
