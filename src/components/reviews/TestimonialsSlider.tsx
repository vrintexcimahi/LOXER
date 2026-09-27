import { useEffect, useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { allReviews, arrangeReviewsForSlider, type ReviewItem } from '../../lib/reviews';

function getCardsPerView(width: number) {
  // Mobile & Tablet: Tampilan 1 baris 2 grid ulasan
  if (width < 1024) return 2;
  return 3;
}

function ReviewCard({ item }: { item: ReviewItem }) {
  return (
    <article
      data-review-card="true"
      className="h-[205px] sm:h-[240px] md:h-[280px] rounded-xl sm:rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-sky-700/85 to-cyan-500/85 p-2.5 sm:p-4 md:p-6 shadow-md shadow-sky-900/25 backdrop-blur-sm flex flex-col justify-between"
    >
      <div>
        <div className="mb-1.5 sm:mb-2 md:mb-3 flex items-center gap-0.5 sm:gap-1">
          {Array.from({ length: item.rating }).map((_, index) => (
            <Star
              key={`${item.id}-star-${index}`}
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-amber-300 fill-amber-400 drop-shadow-[0_1px_0_#fef3c7]"
            />
          ))}
        </div>

        <p className="text-[11px] sm:text-xs md:text-sm lg:text-[0.92rem] leading-snug sm:leading-relaxed text-white/95 line-clamp-3 sm:line-clamp-4">
          "{item.text}"
        </p>
      </div>

      <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-3 pt-1.5 sm:pt-2 border-t border-white/15">
        <img
          src={item.avatarPath}
          alt={item.name}
          loading="lazy"
          decoding="async"
          width="40"
          height="40"
          className="h-6 w-6 sm:h-8 sm:w-8 md:h-11 md:w-11 flex-shrink-0 rounded-full ring-1.5 ring-white/70 shadow-sm object-cover object-center"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] sm:text-xs md:text-sm font-semibold text-white leading-tight">
            {item.name}
          </p>
          <p className="truncate text-[9px] sm:text-[11px] md:text-xs text-cyan-100/90 leading-tight">
            {item.company}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function TestimonialsSlider() {
  const reviews = useMemo(() => arrangeReviewsForSlider(allReviews), []);
  const [cardsPerView, setCardsPerView] = useState(() => getCardsPerView(typeof window !== 'undefined' ? window.innerWidth : 1200));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepWidth, setStepWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const maxIndex = Math.max(0, reviews.length - cardsPerView);
  const visibleStart = reviews.length === 0 ? 0 : currentIndex + 1;
  const visibleEnd = reviews.length === 0 ? 0 : Math.min(currentIndex + cardsPerView, reviews.length);
  const gapPx = cardsPerView === 2 ? 8 : 16;

  useEffect(() => {
    const handleResize = () => {
      setCardsPerView(getCardsPerView(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!trackRef.current) return;

    const measure = () => {
      if (!trackRef.current) return;
      const card = trackRef.current.querySelector<HTMLElement>('[data-review-card="true"]');
      if (!card) return;

      const styles = window.getComputedStyle(trackRef.current);
      const gap = Number.parseFloat(styles.gap || '0') || gapPx;
      setStepWidth(card.getBoundingClientRect().width + gap);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cardsPerView, gapPx, reviews.length]);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (isPaused || reviews.length <= cardsPerView) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 2400);

    return () => window.clearInterval(timer);
  }, [cardsPerView, isPaused, maxIndex, reviews.length]);

  return (
    <section className="py-8 sm:py-14 px-2 sm:px-4 gradient-hero">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-8 text-center">
          <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-white">Dipercaya Jutaan Orang</h2>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-slate-300">
            Cerita nyata pencari kerja di area Bandung, Cimahi, dan sekitarnya yang telah sukses diterima kerja
          </p>
        </div>

        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            ref={trackRef}
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              gap: `${gapPx}px`,
              transform: `translateX(-${currentIndex * stepWidth}px)`,
            }}
          >
            {reviews.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0"
                style={{ flex: `0 0 calc((100% - ${(cardsPerView - 1) * gapPx}px) / ${cardsPerView})` }}
              >
                <ReviewCard item={item} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3.5 sm:mt-5 flex items-center justify-center gap-2 text-xs text-cyan-100">
          <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-0.5 text-[10px] sm:text-xs">
            Menampilkan {visibleStart.toLocaleString('id-ID')} - {visibleEnd.toLocaleString('id-ID')} dari 785.980 ulasan
          </span>
        </div>
      </div>
    </section>
  );
}
