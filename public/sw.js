// ==============================================================================
// LOXER Progressive Web App Service Worker (v1.5.0)
// ==============================================================================

const CACHE_NAME = 'loxer-pwa-v1.5.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/branding/icon32.png',
  '/branding/icon48.png',
  '/branding/icon64.png',
  '/branding/icon96.png',
  '/branding/icon128.png',
  '/branding/icon192.png',
  '/branding/icon256.png',
  '/branding/icon512.png',
];

// Install: Cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA] Failed to cache initial assets:', err);
      });
    })
  );
  // Skip waiting so new SW activates immediately after install
  self.skipWaiting();
});

// Activate: Clean up older caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Message: Support manual skipWaiting from client update toast
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Multi-tier caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or non-http protocols (like chrome-extension://)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Never intercept sw.js itself or requests with explicit bypass params
  if (
    url.pathname === '/sw.js' ||
    url.searchParams.has('no-sw') ||
    url.searchParams.has('nocache')
  ) {
    return;
  }

  // Bypass Vite internal HMR/dev tooling if encountered
  if (
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // Never persistent-cache live authentication or mutations API
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML Navigation: Network-first with fast 3.5s timeout fallback to cached App Shell
  if (request.mode === 'navigate') {
    const networkFetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const cloned = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
      }
      return networkResponse;
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Navigation network timeout')), 3500)
    );

    event.respondWith(
      Promise.race([networkFetchPromise, timeoutPromise])
        .catch(async () => {
          // Fallback to cached version if offline or slow network
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/index.html');
          if (shell) return shell;
          return caches.match('/');
        })
    );
    return;
  }

  // Helper: check if response is an invalid HTML fallback for a script or style asset
  const isInvalidAssetResponse = (res) => {
    if (!res || res.status !== 200) return true;
    const cType = res.headers.get('content-type') || '';
    if (url.pathname.match(/\.(js|mjs|css|json)$/i) && cType.includes('text/html')) {
      return true;
    }
    return false;
  };

  // Static Assets (CSS, JS, Fonts, Images): Cache-first with background network revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse && !isInvalidAssetResponse(cachedResponse)) {
        // Asynchronously update cache in the background for immutable assets
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && !isInvalidAssetResponse(networkResponse)) {
              const cloned = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !isInvalidAssetResponse(networkResponse)) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback image if an image asset fails while offline
          if (request.destination === 'image') {
            return caches.match('/branding/icon192.png');
          }
          return new Response('Offline resource not found', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

// Push: Handle incoming Web Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'LOXER - Karir Indonesia';
  const options = {
    body: data.body || 'Pembaruan baru terkait akun atau lamaran kerja Anda.',
    icon: data.icon || '/branding/icon192.png',
    badge: data.badge || '/branding/icon32.png',
    tag: data.tag || 'loxer-notification',
    data: {
      url: data.url || data.link || '/seeker/applications',
    },
    vibrate: [100, 50, 100],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click: Handle opening or focusing window upon click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (targetUrl && client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
