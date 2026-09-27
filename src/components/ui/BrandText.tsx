import { useState } from 'react';

interface BrandTextProps {
  className?: string;
  imgClassName?: string;
  alt?: string;
  asImage?: boolean;
  lightBlueClassName?: string;
  whiteXClassName?: string;
}

export default function BrandText({
  className = '',
  imgClassName = '',
  alt = 'LOXER',
  asImage = true,
  lightBlueClassName = 'text-cyan-400',
  whiteXClassName = 'text-white',
}: BrandTextProps) {
  const [hasError, setHasError] = useState(false);

  if (!asImage || hasError) {
    return (
      <span className={`font-black tracking-tight ${className}`}>
        <span className={lightBlueClassName}>LO</span>
        <span className={whiteXClassName}>X</span>
        <span className={lightBlueClassName}>ER</span>
      </span>
    );
  }

  const hasHeightInClass = /\bh-(\d+|full|auto|\[[^\]]+\])/.test(className);

  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
      <img
        src="/branding/loxer-brand-text.png"
        alt={alt}
        className={`w-auto object-contain select-none pointer-events-none drop-shadow-sm ${
          imgClassName || (hasHeightInClass ? 'h-full max-h-full' : 'h-[1.15em]')
        }`}
        loading="eager"
        decoding="async"
        onError={() => setHasError(true)}
      />
    </span>
  );
}


