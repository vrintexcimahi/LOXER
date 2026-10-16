/**
 * LOXER Master System Settings & Level-Max Customization Service
 * Controls manual theme colors, media assets (image/logo/favicon/audio/video),
 * branding identity, and global system toggles with real-time DOM injection.
 */

import { useState, useEffect, useCallback } from 'react';

export interface ColorThemeSettings {
  preset: string;
  primaryColor: string;
  primaryHover: string;
  accentCyan: string;
  bgLightStart: string;
  bgLightEnd: string;
  bgDarkStart: string;
  bgDarkEnd: string;
  surfaceLight: string;
  surfaceDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
  glowColor: string;
  headerGradientStart: string;
  headerGradientEnd: string;
}

export interface MediaAssetSettings {
  // Primary Logo (Navbar, Header, General)
  appLogoUrl: string;
  appLogoFooterUrl: string;
  appLogoAuthUrl: string;
  appLogoDisplayMode: 'both' | 'image_only' | 'text_only';
  appLogoHeight: number; // 20 - 72, default 32
  appLogoSvgCode: string; // custom raw inline SVG
  appLogoText: string; // override brand text (default: 'LOXER')

  // Browser & Meta
  appFaviconUrl: string;
  ogImageUrl: string;

  // Banners & Backgrounds
  heroBannerUrl: string;
  heroBannerOverlayOpacity: number; // 0 - 100, default 40
  talentBannerUrl: string;
  authBgUrl: string;
  authBgBlur: number; // 0 - 20
  watermarkUrl: string;

  // Avatars & Placeholders
  defaultMaleAvatarUrl: string;
  defaultFemaleAvatarUrl: string;
  defaultCompanyLogoUrl: string;
}

export interface AudioAssetSettings {
  enabled: boolean;
  masterVolume: number; // 0 - 100
  chatSoundUrl: string;
  appliedSoundUrl: string;
  alertSoundUrl: string;
  successSoundUrl: string;
}

export interface VideoAssetSettings {
  onboardingVideoUrl: string;
  showOnboardingVideo: boolean;
  heroBackgroundVideoUrl: string;
  enableHeroVideo: boolean;
}

export interface GeneralSystemSettings {
  appName: string;
  appTagline: string;
  companyName: string;
  supportWhatsapp: string;
  supportEmail: string;
  officeAddress: string;
  announcementText: string;
  announcementEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  uiAnimationSpeed: 'normal' | 'fast' | 'off';
}

export interface SystemSettings {
  theme: ColorThemeSettings;
  assets: MediaAssetSettings;
  audio: AudioAssetSettings;
  video: VideoAssetSettings;
  general: GeneralSystemSettings;
  updatedAt: string;
}

export const THEME_COLOR_PRESETS: Record<string, { label: string; desc: string; badgeColor: string; theme: Partial<ColorThemeSettings> }> = {
  default_cyan: {
    label: 'LOXER Cyan Electric',
    desc: 'Warna standar resmi LOXER, energik & berteknologi tinggi',
    badgeColor: '#0EA5E9',
    theme: {
      preset: 'default_cyan',
      primaryColor: '#0EA5E9',
      primaryHover: '#0284C7',
      accentCyan: '#06B6D4',
      bgLightStart: '#b8d7f4',
      bgLightEnd: '#dbeafe',
      bgDarkStart: '#020617',
      bgDarkEnd: '#071220',
      surfaceLight: '#ffffff',
      surfaceDark: '#0f172a',
      textLight: '#0f172a',
      textDark: '#e2e8f0',
      borderLight: '#dbeafe',
      borderDark: 'rgba(148, 163, 184, 0.22)',
      glowColor: 'rgba(6, 182, 212, 0.40)',
      headerGradientStart: '#0F172A',
      headerGradientEnd: '#0369A1',
    },
  },
  deep_ocean: {
    label: 'Deep Ocean Executive',
    desc: 'Biru laut safir yang dalam, berkelas & terpercaya',
    badgeColor: '#2563EB',
    theme: {
      preset: 'deep_ocean',
      primaryColor: '#2563EB',
      primaryHover: '#1D4ED8',
      accentCyan: '#38BDF8',
      bgLightStart: '#dbeafe',
      bgLightEnd: '#bfdbfe',
      bgDarkStart: '#050D1A',
      bgDarkEnd: '#0B1D3A',
      surfaceLight: '#ffffff',
      surfaceDark: '#0B192C',
      textLight: '#0f172a',
      textDark: '#e2e8f0',
      borderLight: '#bfdbfe',
      borderDark: 'rgba(56, 189, 248, 0.25)',
      glowColor: 'rgba(37, 99, 235, 0.45)',
      headerGradientStart: '#050D1A',
      headerGradientEnd: '#1E3A8A',
    },
  },
  emerald_pro: {
    label: 'Emerald Forest Pro',
    desc: 'Nuansa hijau zamrud segar, modern & penuh vitalitas',
    badgeColor: '#10B981',
    theme: {
      preset: 'emerald_pro',
      primaryColor: '#10B981',
      primaryHover: '#059669',
      accentCyan: '#14B8A6',
      bgLightStart: '#d1fae5',
      bgLightEnd: '#a7f3d0',
      bgDarkStart: '#021811',
      bgDarkEnd: '#062B20',
      surfaceLight: '#ffffff',
      surfaceDark: '#062E23',
      textLight: '#064e3b',
      textDark: '#ecfdf5',
      borderLight: '#a7f3d0',
      borderDark: 'rgba(16, 185, 129, 0.25)',
      glowColor: 'rgba(16, 185, 129, 0.40)',
      headerGradientStart: '#021811',
      headerGradientEnd: '#064E3B',
    },
  },
  cyber_purple: {
    label: 'Cyber Royal Purple',
    desc: 'Ungu futuristik bernuansa cyberpunk studio premium',
    badgeColor: '#8B5CF6',
    theme: {
      preset: 'cyber_purple',
      primaryColor: '#8B5CF6',
      primaryHover: '#7C3AED',
      accentCyan: '#C084FC',
      bgLightStart: '#ede9fe',
      bgLightEnd: '#ddd6fe',
      bgDarkStart: '#0f0728',
      bgDarkEnd: '#190a3e',
      surfaceLight: '#ffffff',
      surfaceDark: '#170c36',
      textLight: '#2e1065',
      textDark: '#f5f3ff',
      borderLight: '#ddd6fe',
      borderDark: 'rgba(139, 92, 246, 0.28)',
      glowColor: 'rgba(139, 92, 246, 0.45)',
      headerGradientStart: '#0f0728',
      headerGradientEnd: '#4c1d95',
    },
  },
  sunset_amber: {
    label: 'Sunset Amber & Rose',
    desc: 'Hangat, energetik, dan mewah dengan paduan emas senja',
    badgeColor: '#F59E0B',
    theme: {
      preset: 'sunset_amber',
      primaryColor: '#F59E0B',
      primaryHover: '#D97706',
      accentCyan: '#FB923C',
      bgLightStart: '#fef3c7',
      bgLightEnd: '#fed7aa',
      bgDarkStart: '#1a0d00',
      bgDarkEnd: '#2d1400',
      surfaceLight: '#ffffff',
      surfaceDark: '#261204',
      textLight: '#451a03',
      textDark: '#fffbeb',
      borderLight: '#fde68a',
      borderDark: 'rgba(245, 158, 11, 0.25)',
      glowColor: 'rgba(245, 158, 11, 0.45)',
      headerGradientStart: '#1a0d00',
      headerGradientEnd: '#9a3412',
    },
  },
  oled_dark: {
    label: 'Pure OLED Midnight',
    desc: 'Hitam pekat murni untuk penghematan daya layar & kontras tinggi',
    badgeColor: '#38BDF8',
    theme: {
      preset: 'oled_dark',
      primaryColor: '#38BDF8',
      primaryHover: '#0EA5E9',
      accentCyan: '#22D3EE',
      bgLightStart: '#f1f5f9',
      bgLightEnd: '#e2e8f0',
      bgDarkStart: '#000000',
      bgDarkEnd: '#050505',
      surfaceLight: '#ffffff',
      surfaceDark: '#080808',
      textLight: '#020617',
      textDark: '#f8fafc',
      borderLight: '#cbd5e1',
      borderDark: 'rgba(255, 255, 255, 0.15)',
      glowColor: 'rgba(56, 189, 248, 0.35)',
      headerGradientStart: '#000000',
      headerGradientEnd: '#0f172a',
    },
  },
  corporate_slate: {
    label: 'Clean Corporate Slate',
    desc: 'Gaya korporat bersih, rapi, dan profesional untuk institusi bisnis',
    badgeColor: '#64748B',
    theme: {
      preset: 'corporate_slate',
      primaryColor: '#475569',
      primaryHover: '#334155',
      accentCyan: '#0284C7',
      bgLightStart: '#f8fafc',
      bgLightEnd: '#f1f5f9',
      bgDarkStart: '#090d16',
      bgDarkEnd: '#0f172a',
      surfaceLight: '#ffffff',
      surfaceDark: '#111827',
      textLight: '#0f172a',
      textDark: '#e2e8f0',
      borderLight: '#e2e8f0',
      borderDark: 'rgba(100, 116, 139, 0.25)',
      glowColor: 'rgba(100, 116, 139, 0.35)',
      headerGradientStart: '#090d16',
      headerGradientEnd: '#334155',
    },
  },
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  theme: {
    preset: 'default_cyan',
    primaryColor: '#0EA5E9',
    primaryHover: '#0284C7',
    accentCyan: '#06B6D4',
    bgLightStart: '#b8d7f4',
    bgLightEnd: '#dbeafe',
    bgDarkStart: '#020617',
    bgDarkEnd: '#071220',
    surfaceLight: '#ffffff',
    surfaceDark: '#0f172a',
    textLight: '#0f172a',
    textDark: '#e2e8f0',
    borderLight: '#dbeafe',
    borderDark: 'rgba(148, 163, 184, 0.22)',
    glowColor: 'rgba(6, 182, 212, 0.40)',
    headerGradientStart: '#0F172A',
    headerGradientEnd: '#0369A1',
  },
  assets: {
    appLogoUrl: '',
    appLogoFooterUrl: '',
    appLogoAuthUrl: '',
    appLogoDisplayMode: 'both',
    appLogoHeight: 32,
    appLogoSvgCode: '',
    appLogoText: 'LOXER',
    appFaviconUrl: '/branding/icon32.png',
    ogImageUrl: '/branding/icon64.png',
    heroBannerUrl: '',
    heroBannerOverlayOpacity: 40,
    talentBannerUrl: '',
    authBgUrl: '',
    authBgBlur: 0,
    watermarkUrl: '',
    defaultMaleAvatarUrl: '/avatars/pixar_male_1.jpg',
    defaultFemaleAvatarUrl: '/avatars/pixar_female_1.jpg',
    defaultCompanyLogoUrl: '',
  },
  audio: {
    enabled: true,
    masterVolume: 80,
    chatSoundUrl: '',
    appliedSoundUrl: '',
    alertSoundUrl: '',
    successSoundUrl: '',
  },
  video: {
    onboardingVideoUrl: '',
    showOnboardingVideo: false,
    heroBackgroundVideoUrl: '',
    enableHeroVideo: false,
  },
  general: {
    appName: 'LOXER',
    appTagline: 'Bursa Kerja & Layanan Jasa Terpadu Indonesia',
    companyName: 'VRINTEX',
    supportWhatsapp: '6281234567890',
    supportEmail: 'support@loxer.web.id',
    officeAddress: 'Cimahi & Bandung, Jawa Barat',
    announcementText: '🔥 Fitur Baru: Bursa Pelamar Resmi LOXER dengan Pas Foto Studio 3D Pixar kini telah aktif!',
    announcementEnabled: false,
    maintenanceMode: false,
    maintenanceMessage: 'Sistem sedang dalam proses pemeliharaan berkala untuk peningkatan performa. Kami akan segera kembali!',
    uiAnimationSpeed: 'normal',
  },
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = 'loxer_system_settings_v1';

/**
 * Injeksi CSS variables ke DOM secara real-time
 */
export function applySystemSettingsToDom(settings: SystemSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const { theme, assets, general } = settings;

  // 1. Theme Color CSS Variables
  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-primary-dark', theme.primaryHover);
  root.style.setProperty('--color-cyan', theme.accentCyan);

  // Gradient definitions
  root.style.setProperty(
    '--gradient-hero',
    `linear-gradient(135deg, ${theme.headerGradientStart} 0%, ${theme.primaryHover} 50%, ${theme.accentCyan} 100%)`
  );
  root.style.setProperty(
    '--gradient-cta',
    `linear-gradient(90deg, ${theme.primaryColor}, ${theme.accentCyan})`
  );
  root.style.setProperty(
    '--gradient-card',
    `linear-gradient(145deg, ${theme.primaryColor} 0%, ${theme.primaryHover} 100%)`
  );
  root.style.setProperty(
    '--gradient-sidebar',
    `linear-gradient(180deg, ${theme.headerGradientStart} 0%, ${theme.bgDarkEnd} 60%, ${theme.headerGradientEnd} 100%)`
  );
  root.style.setProperty(
    '--gradient-badge',
    `linear-gradient(90deg, ${theme.accentCyan}, ${theme.primaryColor})`
  );
  root.style.setProperty(
    '--gradient-subtle',
    `linear-gradient(135deg, ${theme.bgLightStart} 0%, ${theme.bgLightEnd} 100%)`
  );

  // Dynamic light/dark backgrounds & surfaces
  const isDark = root.classList.contains('dark');

  if (isDark) {
    root.style.setProperty('--app-bg', theme.bgDarkStart);
    root.style.setProperty('--app-surface', theme.surfaceDark);
    root.style.setProperty('--app-border', theme.borderDark);
    root.style.setProperty('--app-text', theme.textDark);
    root.style.setProperty(
      '--glass-page',
      `radial-gradient(ellipse at top left, ${theme.bgDarkEnd} 0%, ${theme.bgDarkStart} 100%)`
    );
  } else {
    root.style.setProperty('--app-bg', theme.bgLightStart);
    root.style.setProperty('--app-surface', theme.surfaceLight);
    root.style.setProperty('--app-border', theme.borderLight);
    root.style.setProperty('--app-text', theme.textLight);
    root.style.setProperty(
      '--glass-page',
      `radial-gradient(ellipse at top left, ${theme.bgLightStart} 0%, ${theme.bgLightEnd} 100%)`
    );
  }

  // 2. Favicon update
  if (assets.appFaviconUrl) {
    let existingFavicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!existingFavicon) {
      existingFavicon = document.createElement('link');
      existingFavicon.rel = 'shortcut icon';
      document.head.appendChild(existingFavicon);
    }
    existingFavicon.href = assets.appFaviconUrl;
  }

  // 3. OpenGraph Image
  if (assets.ogImageUrl) {
    let ogImage = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.content = assets.ogImageUrl;
  }

  // 4. Asset CSS Variables & Overlay
  root.style.setProperty('--app-logo-height', `${assets.appLogoHeight || 32}px`);
  root.style.setProperty('--app-hero-overlay', `${(assets.heroBannerOverlayOpacity ?? 40) / 100}`);
  if (assets.heroBannerUrl) {
    root.style.setProperty('--app-hero-bg', `url("${assets.heroBannerUrl}")`);
  } else {
    root.style.removeProperty('--app-hero-bg');
  }
  if (assets.authBgUrl) {
    root.style.setProperty('--app-auth-bg', `url("${assets.authBgUrl}")`);
  } else {
    root.style.removeProperty('--app-auth-bg');
  }

  // 5. Document Title Brand Prefix
  if (general.appName) {
    const currentTitle = document.title;
    if (!currentTitle.includes(general.appName)) {
      document.title = `${general.appName} — ${general.appTagline || 'Bursa Kerja & Jasa'}`;
    }
  }

  // 6. UI Animation speed
  if (general.uiAnimationSpeed === 'off') {
    root.style.setProperty('--animation-duration', '0s');
    root.classList.add('reduce-motion');
  } else if (general.uiAnimationSpeed === 'fast') {
    root.style.setProperty('--animation-duration', '100ms');
    root.classList.remove('reduce-motion');
  } else {
    root.style.removeProperty('--animation-duration');
    root.classList.remove('reduce-motion');
  }

  // 7. Dispatch Reactive System Settings Change Event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYSTEM_SETTINGS_CHANGE_EVENT, { detail: settings }));
  }
}

export const SYSTEM_SETTINGS_CHANGE_EVENT = 'loxer:system-settings-changed';

export function getCachedSystemSettings(): SystemSettings {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_SETTINGS;
  try {
    const local = window.localStorage.getItem(STORAGE_KEY);
    if (local) {
      return mergeSettingsWithDefaults(JSON.parse(local));
    }
  } catch {
    /* ignore storage error */
  }
  return DEFAULT_SYSTEM_SETTINGS;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(() => getCachedSystemSettings());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SystemSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };

    window.addEventListener(SYSTEM_SETTINGS_CHANGE_EVENT, handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSettings(mergeSettingsWithDefaults(JSON.parse(e.newValue)));
        } catch {
          /* ignore storage parse error */
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    fetchSystemSettings().then((s) => setSettings(s)).catch(() => {});

    return () => {
      window.removeEventListener(SYSTEM_SETTINGS_CHANGE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const update = useCallback(
    async (newSettings: Partial<SystemSettings> | ((prev: SystemSettings) => SystemSettings)) => {
      setLoading(true);
      try {
        let resolved: SystemSettings;
        if (typeof newSettings === 'function') {
          resolved = newSettings(settings);
        } else {
          resolved = mergeSettingsWithDefaults({ ...settings, ...newSettings });
        }
        setSettings(resolved);
        await saveSystemSettings(resolved);
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

  return { settings, updateSettings: update, loading };
}

/**
 * Load system settings from localStorage or remote API
 */
export async function fetchSystemSettings(): Promise<SystemSettings> {
  let settings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };

  // 1. Try local storage first (instant)
  if (typeof window !== 'undefined') {
    try {
      const local = window.localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        settings = mergeSettingsWithDefaults(parsed);
      }
    } catch {
      // fallback
    }
  }

  // 2. Fetch from backend server in background
  try {
    const res = await fetch('/api/system/settings');
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data.settings) {
        settings = mergeSettingsWithDefaults(data.settings);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
      }
    }
  } catch {
    // offline or static fallback
  }

  applySystemSettingsToDom(settings);
  return settings;
}

/**
 * Save and apply system settings globally
 */
export async function saveSystemSettings(settings: SystemSettings): Promise<boolean> {
  const updated = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save local
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // 2. Apply to DOM immediately
  applySystemSettingsToDom(updated);

  // 3. Persist to server backend
  try {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('loxer_local_auth_token') ||
          window.localStorage.getItem('loxer_local_auth_token_admin')
        : '';

    const res = await fetch('/api/system/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updated),
    });

    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.ok);
    }
    return false;
  } catch (err) {
    console.warn('[saveSystemSettings] Remote sync warning:', err);
    return true; // Local applied successfully
  }
}

/**
 * Reset to factory defaults
 */
export async function resetSystemSettings(): Promise<SystemSettings> {
  const defaults = { ...DEFAULT_SYSTEM_SETTINGS, updatedAt: new Date().toISOString() };
  await saveSystemSettings(defaults);
  return defaults;
}

function mergeSettingsWithDefaults(data: Partial<SystemSettings> | Record<string, unknown> | null | undefined): SystemSettings {
  const d = data as Record<string, Record<string, unknown>> | null | undefined;
  return {
    theme: { ...DEFAULT_SYSTEM_SETTINGS.theme, ...(d?.theme || {}) },
    assets: { ...DEFAULT_SYSTEM_SETTINGS.assets, ...(d?.assets || {}) },
    audio: { ...DEFAULT_SYSTEM_SETTINGS.audio, ...(d?.audio || {}) },
    video: { ...DEFAULT_SYSTEM_SETTINGS.video, ...(d?.video || {}) },
    general: { ...DEFAULT_SYSTEM_SETTINGS.general, ...(d?.general || {}) },
    updatedAt: (typeof d?.updatedAt === 'string' ? d.updatedAt : null) || new Date().toISOString(),
  };
}

/**
 * Web Audio API Sound Generator / Player
 * Plays crisp studio sound effects without needing external files,
 * or plays custom audio URLs if provided.
 */
export function playSystemSound(
  type: 'chat' | 'applied' | 'alert' | 'success',
  customUrl?: string,
  volumePercent: number = 80
): void {
  if (typeof window === 'undefined') return;

  const vol = Math.max(0, Math.min(1, volumePercent / 100));

  // 1. If custom audio URL is set, play it
  if (customUrl && customUrl.trim().length > 0) {
    try {
      const audio = new Audio(customUrl);
      audio.volume = vol;
      audio.play().catch(() => {});
      return;
    } catch {
      // fallback to synthesizer
    }
  }

  // 2. High-Fidelity Web Audio API Synthesizer
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.35, now);
    masterGain.connect(ctx.destination);

    if (type === 'chat') {
      // Sweet Two-Tone Notification Chime (659Hz -> 880Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(1, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(masterGain);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.09); // A5
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(1, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.2);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.35);
    } else if (type === 'applied' || type === 'success') {
      // Ascending Major Triad Fanfare (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.07;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } else {
      // Soft Alert (Sawtooth low chime)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    console.debug('[playSystemSound] Audio context error:', err);
  }
}

/**
 * Global App Bootstrapper
 */
export function initSystemSettings(): void {
  if (typeof window === 'undefined') return;

  // Apply immediately from storage
  try {
    const local = window.localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      applySystemSettingsToDom(mergeSettingsWithDefaults(parsed));
    } else {
      applySystemSettingsToDom(DEFAULT_SYSTEM_SETTINGS);
    }
  } catch {
    applySystemSettingsToDom(DEFAULT_SYSTEM_SETTINGS);
  }

  // Then sync with backend asynchronously
  fetchSystemSettings().catch(() => {});
}
