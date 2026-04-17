import { CtaBannerProps, FeatureGridProps, HeroSectionProps } from './homepageData';

const editorSectionClass = 'mx-auto w-full max-w-6xl px-4';

export function HeroSection({
  badge,
  title,
  subtitle,
  primaryButtonText,
  primaryButtonHref,
  secondaryButtonText,
  secondaryButtonHref,
  backgroundColor,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden py-24" style={{ background: backgroundColor || '#0f172a' }}>
      <div className={editorSectionClass}>
        <div className="mx-auto max-w-4xl text-center">
          {badge ? (
            <span className="mb-5 inline-flex rounded-full bg-white/15 px-4 py-1 text-xs font-semibold text-cyan-200">
              {badge}
            </span>
          ) : null}

          <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-200 md:text-lg">{subtitle}</p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {primaryButtonText ? (
              <a
                href={primaryButtonHref || '/register'}
                className="rounded-full bg-cyan-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40 transition hover:brightness-110"
              >
                {primaryButtonText}
              </a>
            ) : null}
            {secondaryButtonText ? (
              <a
                href={secondaryButtonHref || '/login'}
                className="rounded-full border border-white/35 bg-white/10 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {secondaryButtonText}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeatureGrid({
  sectionTitle,
  sectionSubtitle,
  cardOneTitle,
  cardOneDescription,
  cardTwoTitle,
  cardTwoDescription,
  cardThreeTitle,
  cardThreeDescription,
}: FeatureGridProps) {
  const cards = [
    { title: cardOneTitle, description: cardOneDescription },
    { title: cardTwoTitle, description: cardTwoDescription },
    { title: cardThreeTitle, description: cardThreeDescription },
  ];

  return (
    <section className="bg-sky-50 py-20">
      <div className={editorSectionClass}>
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-black text-slate-900 md:text-4xl">{sectionTitle}</h2>
          <p className="mt-4 text-slate-600">{sectionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBanner({
  title,
  subtitle,
  primaryButtonText,
  primaryButtonHref,
  secondaryButtonText,
  secondaryButtonHref,
  backgroundColor,
}: CtaBannerProps) {
  return (
    <section className="py-20" style={{ background: backgroundColor || '#082f49' }}>
      <div className={editorSectionClass}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-white md:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">{subtitle}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {primaryButtonText ? (
              <a
                href={primaryButtonHref || '/register'}
                className="rounded-full bg-cyan-500 px-8 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                {primaryButtonText}
              </a>
            ) : null}
            {secondaryButtonText ? (
              <a
                href={secondaryButtonHref || '/login'}
                className="rounded-full border border-white/35 bg-white/10 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {secondaryButtonText}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
