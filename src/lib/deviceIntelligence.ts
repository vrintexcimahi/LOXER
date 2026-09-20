/**
 * LOXER Device Intelligence & Adaptive UI Engine
 * Lightweight, privacy-first, non-invasive device detection and capability resolution.
 * Adheres to zero-invasive tracking guidelines (no canvas/audio fingerprinting, no IMEI, no GPS).
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'desktop-touch' | 'unknown';

export type UIProfile =
  | 'mobile-compact'
  | 'mobile-standard'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'desktop-standard'
  | 'desktop-wide'
  | 'desktop-touch';

export interface DeviceScreen {
  width: number;
  height: number;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
}

export interface DeviceViewport {
  width: number;
  height: number;
}

export interface DeviceInput {
  touch: boolean;
  maxTouchPoints: number;
  pointer: 'coarse' | 'fine' | 'none';
  hover: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: DeviceType;
  uiProfile: UIProfile;
  osName: string;
  osVersion: string | null;
  browserName: string;
  browserVersion: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  platform: string | null;
  architecture: string | null;
  screen: DeviceScreen;
  viewport: DeviceViewport;
  input: DeviceInput;
  orientation: 'portrait' | 'landscape';
  pwa: boolean;
  language: string;
  timezone: string;
  isOnline: boolean;
}

const DEVICE_ID_KEY = 'loxer_device_id';

/**
 * Generate or retrieve a persistent cryptographically secure pseudonymous device ID
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-rendered-device-id';

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 16) {
      return existing;
    }

    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    window.localStorage.setItem(DEVICE_ID_KEY, newId);

    // Optional first-party cookie for cross-request recognition
    try {
      document.cookie = `${DEVICE_ID_KEY}=${newId}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore cookie restrictions
    }

    return newId;
  } catch {
    return 'temp_' + Date.now().toString(36);
  }
}

/**
 * Detect Operating System safely using userAgent and platform hints
 */
export function detectOS(ua: string): { osName: string; osVersion: string | null } {
  const lower = ua.toLowerCase();

  if (/android/i.test(lower)) {
    const match = lower.match(/android\s+([\d.]+)/);
    return { osName: 'Android', osVersion: match ? match[1] : null };
  }
  if (/iphone|ipad|ipod/i.test(lower)) {
    const match = lower.match(/os\s+([\d_]+)/);
    return { osName: 'iOS', osVersion: match ? match[1].replace(/_/g, '.') : null };
  }
  if (/windows/i.test(lower)) {
    let ver = '10/11';
    if (/windows nt 10\.0/i.test(lower)) ver = '10/11';
    else if (/windows nt 6\.3/i.test(lower)) ver = '8.1';
    else if (/windows nt 6\.2/i.test(lower)) ver = '8';
    else if (/windows nt 6\.1/i.test(lower)) ver = '7';
    return { osName: 'Windows', osVersion: ver };
  }
  if (/macintosh|mac os x/i.test(lower)) {
    const match = lower.match(/mac os x\s+([\d_]+)/);
    return { osName: 'macOS', osVersion: match ? match[1].replace(/_/g, '.') : null };
  }
  if (/cros/i.test(lower)) {
    return { osName: 'ChromeOS', osVersion: null };
  }
  if (/linux/i.test(lower)) {
    return { osName: 'Linux', osVersion: null };
  }

  return { osName: 'unknown', osVersion: null };
}

/**
 * Detect Browser safely without invasive tricks
 */
export function detectBrowser(ua: string): { browserName: string; browserVersion: string | null } {
  const lower = ua.toLowerCase();

  if (/edg\//i.test(lower)) {
    const match = lower.match(/edg\/([\d.]+)/);
    return { browserName: 'Edge', browserVersion: match ? match[1] : null };
  }
  if (/samsungbrowser/i.test(lower)) {
    const match = lower.match(/samsungbrowser\/([\d.]+)/);
    return { browserName: 'Samsung Internet', browserVersion: match ? match[1] : null };
  }
  if (/opr\/|opera/i.test(lower)) {
    const match = lower.match(/(?:opr|opera)[\s/]([\d.]+)/);
    return { browserName: 'Opera', browserVersion: match ? match[1] : null };
  }
  if (/firefox|fxios/i.test(lower)) {
    const match = lower.match(/(?:firefox|fxios)\/([\d.]+)/);
    return { browserName: 'Firefox', browserVersion: match ? match[1] : null };
  }
  if (/chrome|crios/i.test(lower)) {
    const match = lower.match(/(?:chrome|crios)\/([\d.]+)/);
    return { browserName: 'Chrome', browserVersion: match ? match[1] : null };
  }
  if (/safari/i.test(lower) && !/chrome|crios|android/i.test(lower)) {
    const match = lower.match(/version\/([\d.]+)/);
    return { browserName: 'Safari', browserVersion: match ? match[1] : null };
  }

  return { browserName: 'other', browserVersion: null };
}

/**
 * Detect PWA standalone mode
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // iOS Safari standalone
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
  );
}

/**
 * Resolve UI Profile based on physical capabilities, not brand
 */
export function resolveUIProfile(
  viewportWidth: number,
  touch: boolean,
  orientation: 'portrait' | 'landscape'
): UIProfile {
  if (touch && viewportWidth < 420) {
    return 'mobile-compact';
  }
  if (touch && viewportWidth < 768) {
    return 'mobile-standard';
  }
  if (touch && viewportWidth < 1200) {
    return orientation === 'portrait' ? 'tablet-portrait' : 'tablet-landscape';
  }
  if (touch && viewportWidth >= 1200) {
    return 'desktop-touch';
  }
  if (viewportWidth >= 1600) {
    return 'desktop-wide';
  }
  return 'desktop-standard';
}

/**
 * Synchronous client-side detection
 */
export function detectDeviceSync(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server',
      deviceType: 'unknown',
      uiProfile: 'desktop-standard',
      osName: 'unknown',
      osVersion: null,
      browserName: 'unknown',
      browserVersion: null,
      deviceBrand: null,
      deviceModel: null,
      platform: null,
      architecture: null,
      screen: { width: 1920, height: 1080, pixelRatio: 1, orientation: 'landscape' },
      viewport: { width: 1920, height: 1080 },
      input: { touch: false, maxTouchPoints: 0, pointer: 'fine', hover: true },
      orientation: 'landscape',
      pwa: false,
      language: 'id',
      timezone: 'UTC',
      isOnline: true,
    };
  }

  const deviceId = getOrCreateDeviceId();
  const ua = window.navigator.userAgent || '';
  const { osName, osVersion } = detectOS(ua);
  const { browserName, browserVersion } = detectBrowser(ua);

  // Screen & Viewport
  const screenWidth = window.screen?.width || window.innerWidth || 1024;
  const screenHeight = window.screen?.height || window.innerHeight || 768;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screenWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || screenHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  const orientation: 'portrait' | 'landscape' =
    viewportHeight > viewportWidth ? 'portrait' : 'landscape';

  // Input capabilities
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;
  const hasTouch = maxTouchPoints > 0 || 'ontouchstart' in window;
  const pointerCoarse = window.matchMedia('(pointer: coarse)').matches;
  const pointerFine = window.matchMedia('(pointer: fine)').matches;
  const pointerType: 'coarse' | 'fine' | 'none' = pointerCoarse ? 'coarse' : pointerFine ? 'fine' : 'none';
  const hoverSupported = window.matchMedia('(hover: hover)').matches;

  // Device Type determination
  let deviceType: DeviceType = 'desktop';
  if (osName === 'Android' || osName === 'iOS') {
    if (Math.min(viewportWidth, viewportHeight) >= 600 || /ipad|tablet/i.test(ua)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  } else if (hasTouch && viewportWidth >= 1024) {
    deviceType = 'desktop-touch';
  } else if (hasTouch && viewportWidth < 1024) {
    deviceType = viewportWidth < 600 ? 'mobile' : 'tablet';
  }

  const uiProfile = resolveUIProfile(viewportWidth, hasTouch, orientation);
  const pwa = isPWA();
  const language = window.navigator.language || 'id-ID';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const isOnline = window.navigator.onLine !== false;

  return {
    deviceId,
    deviceType,
    uiProfile,
    osName,
    osVersion,
    browserName,
    browserVersion,
    deviceBrand: null,
    deviceModel: null,
    platform: window.navigator.platform || null,
    architecture: null,
    screen: {
      width: screenWidth,
      height: screenHeight,
      pixelRatio,
      orientation,
    },
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
    },
    input: {
      touch: hasTouch,
      maxTouchPoints,
      pointer: pointerType,
      hover: hoverSupported,
    },
    orientation,
    pwa,
    language,
    timezone,
    isOnline,
  };
}

/**
 * Optional async enrichment with Client Hints (User-Agent Client Hints API)
 */
export async function enrichWithClientHints(info: DeviceInfo): Promise<DeviceInfo> {
  if (typeof window === 'undefined') return info;

  try {
    const nav = window.navigator as unknown as {
      userAgentData?: {
        platform?: string;
        getHighEntropyValues?: (
          hints: string[]
        ) => Promise<{
          model?: string;
          platformVersion?: string;
          architecture?: string;
          bitness?: string;
          formFactor?: string[];
        }>;
      };
    };

    if (nav.userAgentData?.getHighEntropyValues) {
      const hints = await nav.userAgentData.getHighEntropyValues([
        'model',
        'platformVersion',
        'architecture',
        'formFactor',
      ]);

      return {
        ...info,
        deviceModel: hints.model || info.deviceModel,
        architecture: hints.architecture || info.architecture,
        osVersion: hints.platformVersion || info.osVersion,
        platform: nav.userAgentData.platform || info.platform,
      };
    }
  } catch {
    // Client Hints are optional; safely fallback
  }

  return info;
}

/**
 * Expose adaptive UI attributes to root DOM element
 */
export function applyUIProfileToDOM(info: DeviceInfo) {
  if (typeof document === 'undefined') return;

  try {
    const root = document.documentElement;
    root.setAttribute('data-device', info.deviceType);
    root.setAttribute('data-ui-profile', info.uiProfile);
    root.setAttribute('data-input', info.input.touch ? 'touch' : 'mouse');
    root.setAttribute('data-orientation', info.orientation);
    root.setAttribute('data-pwa', info.pwa ? 'true' : 'false');
  } catch (err) {
    console.warn('[DeviceIntelligence] Error applying DOM attributes:', err);
  }
}
