import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import {
  type PartnerSlide,
  DEFAULT_PUBLIC_PARTNER_SLIDES,
  DEFAULT_DASHBOARD_PARTNER_SLIDES,
} from './partnerSlidesData';

export type { PartnerSlide };

interface PartnerBannerCarouselProps {
  slides?: PartnerSlide[];
  autoPlayInterval?: number;
  className?: string;
  variant?: 'public' | 'dashboard';
}

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
