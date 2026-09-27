import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UserRole } from '../../lib/types';

interface HeroBannerSlideshowProps {
  onRegister: (role?: UserRole) => void;
}

interface BannerSlide {
  id: string;
  image: string;
  alt: string;
  targetRole?: UserRole;
  actionUrl?: string;
  badge: string;
}

const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'seeker-promo',
    image: '/banners/banner-1.jpg',
    alt: 'LOXER - Cari Kerja Jadi Lebih Mudah',
    targetRole: 'seeker',
    actionUrl: '/seeker/browse',
    badge: 'Pencari Kerja',
  },
  {
    id: 'employer-promo',
    image: '/banners/banner-2.jpg',
    alt: 'LOXER - Solusi Rekrutmen Digital untuk Tim Modern',
    targetRole: 'employer',
    badge: 'Untuk Perusahaan',
  },
  {
    id: 'general-promo',
    image: '/banners/banner-3.jpg',
    alt: 'LOXER - Platform Rekrutmen Terpercaya Indonesia',
    targetRole: 'seeker',
    actionUrl: '/seeker/browse',
    badge: 'Platform Resmi',
  },
];

const AUTOPLAY_INTERVAL = 5000;

export default function HeroBannerSlideshow({ onRegister }: HeroBannerSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
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
    if (slide.targetRole === 'employer') {
      onRegister('employer');
    } else if (slide.actionUrl) {
      window.location.href = slide.actionUrl;
    } else {
      onRegister('seeker');
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

  return (
    <div
      className="relative w-full max-w-5xl mx-auto mb-3 sm:mb-5 px-1 sm:px-4 select-none animate-fade-up"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Outer Glow container */}
      <div className="relative group overflow-hidden rounded-2xl sm:rounded-3xl border border-sky-400/25 bg-slate-900 shadow-2xl shadow-cyan-500/20 ring-1 ring-white/10 aspect-[16/9] w-full">
        {/* Slides Track */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {BANNER_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => handleSlideClick(slide)}
              className="relative min-w-full h-full cursor-pointer overflow-hidden flex-shrink-0"
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
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
              />
              {/* Subtle top-left badge */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1 text-[10px] sm:text-xs font-semibold text-cyan-300 border border-cyan-400/30 shadow-lg">
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
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md border border-white/20 shadow-lg hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all opacity-80 group-hover:opacity-100"
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
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md border border-white/20 shadow-lg hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all opacity-80 group-hover:opacity-100"
          aria-label="Slide selanjutnya"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Indicators / Pagination Dots */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-slate-950/60 backdrop-blur-md px-3 py-1.5 border border-white/10 shadow-lg">
          {BANNER_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(idx);
              }}
              className={`transition-all duration-300 rounded-full ${
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
