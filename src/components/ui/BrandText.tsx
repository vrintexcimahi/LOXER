import { useState } from 'react';
import { useTheme } from '../../contexts/useTheme';
import { useSystemSettings } from '../../lib/systemSettingsService';

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
  alt,
  asImage = true,
  lightBlueClassName = 'text-cyan-400',
  whiteXClassName = 'text-slate-950 dark:text-white',
}: BrandTextProps) {
  const [hasError, setHasError] = useState(false);
  const { theme } = useTheme();
  const { settings } = useSystemSettings();

  const brandName = settings?.assets?.appLogoText || settings?.general?.appName || 'LOXER';
  const displayAlt = alt || brandName;

  if (brandName.toUpperCase() !== 'LOXER') {
    return (
      <span className={`font-black tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-white bg-clip-text text-transparent ${className}`}>
        {brandName}
      </span>
    );
  }

  if (!asImage || hasError || theme === 'light') {
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
        alt={displayAlt}
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


