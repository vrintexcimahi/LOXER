import { useEffect, useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { allReviews, arrangeReviewsForSlider, type ReviewItem } from '../../lib/reviews';

function getCardsPerView(width: number) {
  if (width < 768) return 1;
  if (width < 1100) return 2;
  return 3;
}

function ReviewCard({ item }: { item: ReviewItem }) {
  return (
    <article
      data-review-card="true"
      className="h-[310px] rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-sky-700/85 to-cyan-500/85 p-6 shadow-lg shadow-sky-900/25 backdrop-blur-sm flex flex-col"
    >
      <div className="mb-3 flex items-center gap-1">
        {Array.from({ length: item.rating }).map((_, index) => (
          <Star
            key={`${item.id}-star-${index}`}
            className="h-4 w-4 text-amber-300 fill-amber-400 drop-shadow-[0_1px_0_#fef3c7] [filter:drop-shadow(0_2px_2px_rgba(161,98,7,0.45))]"
          />
        ))}
      </div>

      <p className="h-[140px] overflow-hidden text-[1.05rem] leading-relaxed text-white/90">"{item.text}"</p>

      <div className="mt-auto flex items-center gap-3">
        <img
          src={item.avatarPath}
          alt={item.name}
          loading="lazy"
          className="h-12 w-12 flex-shrink-0 rounded-full ring-2 ring-white/65 shadow-lg shadow-slate-900/20 object-cover object-center"
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{item.name}</p>
          <p className="truncate text-sm text-cyan-100">
            {item.company} - {item.role}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function TestimonialsSlider() {
  const reviews = useMemo(() => arrangeReviewsForSlider(allReviews), []);
  const [cardsPerView, setCardsPerView] = useState(() => getCardsPerView(window.innerWidth));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepWidth, setStepWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const maxIndex = Math.max(0, reviews.length - cardsPerView);
  const visibleStart = reviews.length === 0 ? 0 : currentIndex + 1;
  const visibleEnd = reviews.length === 0 ? 0 : Math.min(currentIndex + cardsPerView, reviews.length);

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
      const gap = Number.parseFloat(styles.gap || '0') || 0;
      setStepWidth(card.getBoundingClientRect().width + gap);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cardsPerView, reviews.length]);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (isPaused || reviews.length <= cardsPerView) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 2200);

    return () => window.clearInterval(timer);
  }, [cardsPerView, isPaused, maxIndex, reviews.length]);

  return (
    <section className="py-20 px-4 gradient-hero">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-black text-white md:text-5xl">Dipercaya Jutaan Orang</h2>
          <p className="mt-2 text-base text-slate-300 md:text-lg">
            150 ulasan pengguna LOXER dari berbagai latar belakang kerja
          </p>
        </div>

        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            ref={trackRef}
            className="flex gap-4 transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * stepWidth}px)` }}
          >
            {reviews.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0"
                style={{ flex: `0 0 calc((100% - ${(cardsPerView - 1) * 16}px) / ${cardsPerView})` }}
              >
                <ReviewCard item={item} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-cyan-100">
          <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1">
            Menampilkan {visibleStart.toLocaleString('id-ID')} - {visibleEnd.toLocaleString('id-ID')} dari 785.980 ulasan
          </span>
        </div>
      </div>
    </section>
  );
}
