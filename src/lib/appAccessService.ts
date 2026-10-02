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

/**
 * Smart Deteksi: Memeriksa apakah client berjalan di dalam Aplikasi LOXER
 * Mendeteksi:
 * 1. PWA Standalone Mode (Desktop / Mobile PWA)
 * 2. iOS Home Screen WebClip Standalone
 * 3. Android Trusted Web Activity (TWA) - id.web.loxer.app
 * 4. Android WebView / Custom In-App Container (UserAgent LoxerApp, wv)
 * 5. Query parameter ?app=true / ?source=app / ?mode=app (yang dipersist ke localStorage)
 * 6. Global JS Bridge window.isLoxerApp atau window.AndroidBridge
 */
export function detectIsAppClient(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Check persistent App override flag (e.g. launched with ?app=true)
    const storedAppFlag = localStorage.getItem(APP_FORCE_STORAGE_KEY);
    if (storedAppFlag === 'true') {
      return true;
    }

    // 2. Check URL search params for app query
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('app') === 'true' ||
      params.get('app') === '1' ||
      params.get('source') === 'app' ||
      params.get('source') === 'twa' ||
      params.get('client') === 'android' ||
      params.get('mode') === 'app'
    ) {
      try {
        localStorage.setItem(APP_FORCE_STORAGE_KEY, 'true');
      } catch {
        // ignore storage errors
      }
      return true;
    }

    // 3. Check Standalone Display Mode (PWA desktop / mobile installed)
    const isStandaloneDisplay =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches;
    if (isStandaloneDisplay) {
      return true;
    }

    // 4. Check iOS Safari standalone
    if (
      'standalone' in navigator &&
      (navigator as unknown as { standalone: boolean }).standalone === true
    ) {
      return true;
    }

    // 5. Check Document Referrer for Android TWA package id
    if (document.referrer && document.referrer.includes('android-app://id.web.loxer.app')) {
      return true;
    }

    // 6. Check User Agent for Android WebView / Custom App identifier
    const ua = navigator.userAgent || '';
    if (
      /LoxerApp/i.test(ua) ||
      /id\.web\.loxer\.app/i.test(ua) ||
      (/Android/i.test(ua) && /Version\/[\d.]+/i.test(ua) && /Chrome\/[\d.]+/i.test(ua) && /wv/i.test(ua))
    ) {
      return true;
    }

    // 7. Check Custom JS Injection Bridge
    const win = window as unknown as { isLoxerApp?: boolean; AndroidBridge?: unknown; LoxerNative?: unknown };
    if (win.isLoxerApp === true || win.AndroidBridge !== undefined || win.LoxerNative !== undefined) {
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
