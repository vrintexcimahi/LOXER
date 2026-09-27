// ==============================================================================
// LOXER PWA Service Worker Registration & Update Notification
// ==============================================================================

let swRegistration: ServiceWorkerRegistration | null = null;

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const urlParams = new URLSearchParams(window.location.search);
  const forcePwa = urlParams.get('pwa') === 'true';
  const bypassSw = urlParams.get('no-sw') === 'true';

  if (bypassSw) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    return;
  }

  // During raw Vite dev server, only register SW if explicitly requested via ?pwa=true to avoid HMR cache clashes
  if (import.meta.env.DEV && !forcePwa) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        swRegistration = registration;
        console.log('[PWA] ServiceWorker registered with scope:', registration.scope);

        // Check for updates on load
        registration.update().catch(() => {});

        // Detect new Service Worker waiting to activate
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available! Dispatching update event.');
              window.dispatchEvent(
                new CustomEvent('loxer:pwa-update-available', {
                  detail: { registration },
                })
              );
            }
          };
        };
      })
      .catch((error) => {
        console.warn('[PWA] ServiceWorker registration failed:', error);
      });

    // Handle controller change (when new worker takes control)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

export function applyPwaUpdate(): void {
  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    });
  }
}
