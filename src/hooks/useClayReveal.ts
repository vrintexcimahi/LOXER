import { useEffect, useRef } from 'react';

/** Reveal presentation cards once, without hiding content in unsupported browsers. */
export default function useClayReveal() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = root.current.querySelectorAll<HTMLElement>('.clay-role-card, #features .group, #employer-section .group, #how-it-works .grid > div');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.clayReveal = 'visible';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });

    cards.forEach((card, index) => {
      card.dataset.clayReveal = 'pending';
      card.style.setProperty('--reveal-delay', `${(index % 4) * 70}ms`);
      observer.observe(card);
    });
    return () => {
      observer.disconnect();
      cards.forEach(card => {
        delete card.dataset.clayReveal;
        card.style.removeProperty('--reveal-delay');
      });
    };
  }, []);

  return root;
}
