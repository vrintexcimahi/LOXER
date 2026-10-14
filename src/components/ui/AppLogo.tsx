import React, { useState } from 'react';
import { useSystemSettings } from '../../lib/systemSettingsService';

export interface AppLogoProps {
  variant?: 'navbar' | 'footer' | 'sidebar' | 'auth' | 'compact' | 'hero' | 'guide';
  showText?: boolean;
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  height?: number;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export default function AppLogo({
  variant = 'navbar',
  showText,
  className = '',
  imgClassName = '',
  textClassName = '',
  height,
  onClick,
  title,
}: AppLogoProps) {
  const { settings } = useSystemSettings();
  const [imgError, setImgError] = useState(false);

  const { assets, general } = settings;
  const displayMode = assets?.appLogoDisplayMode || 'both';

  // Determine whether to display text
  const shouldShowText =
    showText !== undefined
      ? showText
      : displayMode === 'both' || displayMode === 'text_only';

  const shouldShowImage = displayMode !== 'text_only';

  // Determine appropriate logo source
  let logoSrc = assets?.appLogoUrl || '/branding/icon64.png';
  if (variant === 'footer' && assets?.appLogoFooterUrl) {
    logoSrc = assets.appLogoFooterUrl;
  } else if (variant === 'auth' && assets?.appLogoAuthUrl) {
    logoSrc = assets.appLogoAuthUrl;
  }

  if (imgError || !logoSrc) {
    logoSrc = '/branding/icon64.png';
  }

  const logoHeight = height || assets?.appLogoHeight || 32;
  const brandName = assets?.appLogoText || general?.appName || 'LOXER';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      title={title}
    >
      {shouldShowImage && (
        assets?.appLogoSvgCode && assets.appLogoSvgCode.trim().startsWith('<svg') ? (
          <div
            className={`inline-flex items-center justify-center shrink-0 ${imgClassName}`}
            style={{ height: `${logoHeight}px`, width: 'auto' }}
            dangerouslySetInnerHTML={{ __html: assets.appLogoSvgCode }}
          />
        ) : (
          <img
            src={logoSrc}
            alt={brandName}
            onError={() => setImgError(true)}
            style={{ height: `${logoHeight}px`, width: 'auto' }}
            className={`object-contain shrink-0 rounded-lg drop-shadow transition-transform ${imgClassName}`}
            loading="eager"
          />
        )
      )}

      {shouldShowText && (
        <span className={`font-black tracking-tight text-white ${textClassName}`}>
          {brandName.toUpperCase() === 'LOXER' ? (
            <>
              <span className="text-cyan-400">LO</span>
              <span className="text-slate-950 dark:text-white">X</span>
              <span className="text-cyan-400">ER</span>
            </>
          ) : (
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-white bg-clip-text text-transparent">
              {brandName}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
