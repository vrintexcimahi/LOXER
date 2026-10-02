// ==============================================================================
// LOXER Service Worker Cleanup & PWA Decommissioning
// Akses Web PWA dinonaktifkan, fokus penuh pada Aplikasi Mobile APK Android
// ==============================================================================

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // Pastikan seluruh service worker lama di-unregister
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });

  // Bersihkan sisa cache storage PWA lama
  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        if (key.includes('loxer')) {
          caches.delete(key);
        }
      }
    });
  }
}

export function applyPwaUpdate(): void {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

