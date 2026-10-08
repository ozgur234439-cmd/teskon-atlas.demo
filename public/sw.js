// TESKON Atlas Service Worker — madde 84
// Basit önbellek: statik dosyalar + sayfa kabuğu
// V2: tam offline sync

const CACHE_NAME = 'atlas-v1.0.0';
const CACHE_DOSYALAR = [
  '/',
  '/giris',
  '/manifest.json',
  '/icon.svg',
];

// Install: cache doldur
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_DOSYALAR).catch(() => {
        // Bazı sayfalar auth gerektirir, hata yut
      });
    })
  );
  self.skipWaiting();
});

// Activate: eski cache temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((isimler) => {
      return Promise.all(
        isimler
          .filter((isim) => isim !== CACHE_NAME)
          .map((isim) => caches.delete(isim))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first, cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece GET isteklerini ele al
  if (request.method !== 'GET') return;

  // API ve auth istekleri geç
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return;
  }

  // Next.js sunucu action'ları geç
  if (request.headers.get('RSC') === '1' || request.headers.get('Next-Router-State-Tree')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Başarılı GET yanıtlarını cache'e ekle
        if (response.status === 200 && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: cache'ten al
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Sayfa değilse basit offline yanıt
          if (request.mode === 'navigate') {
            return caches.match('/giris');
          }
          return new Response('Çevrimdışı', { status: 503, statusText: 'Offline' });
        });
      })
  );
});