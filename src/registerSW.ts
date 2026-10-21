// ==============================================================================
// LOXER Progressive Web App Service Worker Registration
// Mengaktifkan PWA Cache, Offline Support & 1-Click Install
// ==============================================================================

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[LOXER PWA] Service Worker terdaftar dengan scope:', registration.scope);

        // Periksa update service worker berkala
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[LOXER PWA] Versi baru tersedia, siap di-refresh.');
                } else {
                  console.log('[LOXER PWA] Konten disimpan offline pertama kali.');
                }
              }
            };
          }
        };
      })
      .catch((error) => {
        console.warn('[LOXER PWA] Gagal mendaftarkan Service Worker:', error);
      });
  });
}

export function applyPwaUpdate(): void {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

