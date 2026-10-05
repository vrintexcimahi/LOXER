/**
 * LOXER App Access & Smart Detection Engine
 * 
 * Aturan Sistem:
 * 1. Seluruh akses fitur interaktif (daftar akun, lamar loker, beli/WA marketplace, pasang iklan, dll)
 *    WAJIB melalui Aplikasi Resmi LOXER (Android APK / PWA Standalone).
 * 2. Pengunjung via Web Browser biasa hanya bisa VIEW ONLY (melihat daftar lowongan, produk, profil jasa).
 * 3. Super Admin memiliki Akses Rahasia (Secret Passkey / Easter Egg / URL Bypass) untuk membuka
 *    akses penuh tanpa batasan View-Only di Web Browser.
 */

export const SECRET_PASSKEYS = [
  'kayaraya3+',
  'LOXER-ROOT-2026',
  'vrintex',
  'superadmin2026',
  'godmode',
];

export const SUPER_ADMIN_STORAGE_KEY = 'loxer_super_admin_bypass';
export const APP_FORCE_STORAGE_KEY = 'loxer_is_app';
export const APP_COOKIE_KEY = 'loxer_is_app';
export const HIDE_INSTALL_BANNER_KEY = 'loxer_hide_install_banner';

/**
 * Simpan status aplikasi secara persisten (localStorage, sessionStorage, dan cookie)
 */
export function markAsAppClient(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APP_FORCE_STORAGE_KEY, 'true');
    sessionStorage.setItem(APP_FORCE_STORAGE_KEY, 'true');
    (window as unknown as { isLoxerApp?: boolean; isNativeApp?: boolean }).isLoxerApp = true;
    (window as unknown as { isLoxerApp?: boolean; isNativeApp?: boolean }).isNativeApp = true;
    // Set 1-year persistent cookie
    document.cookie = `${APP_COOKIE_KEY}=true; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignore storage/cookie quota errors
  }
}

/**
 * Smart Deteksi: Memeriksa apakah client berjalan di dalam Aplikasi LOXER
 * Mendeteksi:
 * 1. Global JS Bridge (window.isLoxerApp, window.AndroidBridge, window.LoxerNative, window.Android)
 * 2. Persistent Storage (localStorage, sessionStorage, document.cookie)
 * 3. URL search params / hash (?source=app, ?source=apk, ?platform=apk, ?client=android, ?app=true, ?mode=app, dll)
 * 4. PWA Standalone Mode & Fullscreen (display-mode: standalone / fullscreen / minimal-ui / iOS standalone)
 * 5. Document Referrer (android-app://)
 * 6. User-Agent Tokens (LoxerApp, id.web.loxer.app, LoxerNative, wv, Android WebView)
 */
export function detectIsAppClient(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 0. Check in-memory global bridge
    const win = window as unknown as {
      isLoxerApp?: boolean;
      isNativeApp?: boolean;
      AndroidBridge?: unknown;
      LoxerNative?: unknown;
      Android?: unknown;
    };
    if (
      win.isLoxerApp === true ||
      win.isNativeApp === true ||
      win.LoxerNative !== undefined ||
      win.AndroidBridge !== undefined ||
      win.Android !== undefined
    ) {
      markAsAppClient();
      return true;
    }

    // 1. Check persistent App override flags in localStorage or sessionStorage
    const storedAppFlag = localStorage.getItem(APP_FORCE_STORAGE_KEY);
    const sessionAppFlag = sessionStorage.getItem(APP_FORCE_STORAGE_KEY);
    if (storedAppFlag === 'true' || sessionAppFlag === 'true') {
      markAsAppClient();
      return true;
    }

    // 2. Check Cookie
    if (document.cookie && document.cookie.includes(`${APP_COOKIE_KEY}=true`)) {
      markAsAppClient();
      return true;
    }

    // 3. Check URL search params for app query
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const fullQuery = search + (hash.includes('?') ? '&' + hash.split('?')[1] : '');
    const params = new URLSearchParams(fullQuery);

    const appFlag = params.get('app');
    const sourceFlag = (params.get('source') || '').toLowerCase();
    const platformFlag = (params.get('platform') || '').toLowerCase();
    const clientFlag = (params.get('client') || '').toLowerCase();
    const modeFlag = (params.get('mode') || '').toLowerCase();
    const isAppParam = params.get('is_app') || params.get('native');

    if (
      appFlag === 'true' ||
      appFlag === '1' ||
      isAppParam === 'true' ||
      isAppParam === '1' ||
      ['app', 'apk', 'twa', 'android', 'mobile'].includes(sourceFlag) ||
      ['apk', 'android', 'app', 'mobile'].includes(platformFlag) ||
      ['android', 'app', 'mobile', 'apk'].includes(clientFlag) ||
      ['app', 'standalone', 'fullscreen'].includes(modeFlag)
    ) {
      markAsAppClient();
      return true;
    }

    // 4. Check Display Mode (PWA Standalone, Fullscreen, Minimal-UI)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      markAsAppClient();
      return true;
    }

    // 5. Check Document Referrer for Android package id (Official APK or Android app link)
    if (
      document.referrer &&
      (document.referrer.includes('android-app://id.web.loxer.app') ||
       document.referrer.startsWith('android-app://'))
    ) {
      markAsAppClient();
      return true;
    }

    // 6. Check User Agent for Android WebView / Custom App identifier
    const ua = navigator.userAgent || '';
    if (
      /LoxerApp/i.test(ua) ||
      /id\.web\.loxer\.app/i.test(ua) ||
      /LoxerNative/i.test(ua) ||
      (/Android/i.test(ua) && /wv/i.test(ua)) ||
      (/Android/i.test(ua) && /Version\/[\d.]+/i.test(ua) && /Chrome\/[\d.]+/i.test(ua) && !/Mobile Safari/i.test(ua))
    ) {
      markAsAppClient();
      return true;
    }

    return false;
  } catch (err) {
    console.debug('[AppAccess] Error detecting app client:', err);
    return false;
  }
}

/**
 * Smart Deteksi: Memeriksa apakah Super Admin Bypass sedang aktif
 */
export function detectIsSuperAdminBypass(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Session Storage flags
    if (
      sessionStorage.getItem(SUPER_ADMIN_STORAGE_KEY) === 'true' ||
      sessionStorage.getItem('loxer_admin_unlocked') === 'true' ||
      sessionStorage.getItem('app_admin_unlocked') === 'true'
    ) {
      return true;
    }

    // 2. URL Secret check
    const params = new URLSearchParams(window.location.search);
    const secretQuery = params.get('secret_admin') || params.get('superadmin') || params.get('secret');
    if (secretQuery) {
      const isMatch = SECRET_PASSKEYS.some(
        (key) => key.toLowerCase() === secretQuery.toLowerCase()
      );
      if (isMatch) {
        unlockSuperAdminBypass();
        return true;
      }
    }

    // 3. Path secret check (/admin-secret or /secret-admin)
    const pathname = window.location.pathname;
    if (pathname === '/admin-secret' || pathname === '/secret-admin') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Verifikasi passkey rahasia Super Admin
 */
export function verifySecretPasskey(inputKey: string): boolean {
  if (!inputKey) return false;
  const cleanKey = inputKey.trim().toLowerCase();
  return SECRET_PASSKEYS.some((key) => key.toLowerCase() === cleanKey);
}

/**
 * Aktifkan Super Admin Bypass
 */
export function unlockSuperAdminBypass(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SUPER_ADMIN_STORAGE_KEY, 'true');
    sessionStorage.setItem('loxer_admin_unlocked', 'true');
    sessionStorage.setItem('app_admin_unlocked', 'true');
  } catch (err) {
    console.warn('[AppAccess] Failed to write bypass session:', err);
  }
}

/**
 * Kunci kembali mode Super Admin
 */
export function lockSuperAdminBypass(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
    sessionStorage.removeItem('loxer_admin_unlocked');
    sessionStorage.removeItem('app_admin_unlocked');
  } catch {
    // ignore
  }
}
