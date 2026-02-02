const CACHE_NAME = 'hangru-vending-v1';
const NO_CACHE_URLS = [
    '/admin',
    'admin.html'
];

self.addEventListener('install', (event) => {
    // Skip waiting to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Simple pass-through strategy for now to avoid caching issues during development
    // For PWA installability, having a fetch handler is often sufficient even if it just fetches.
    // We can add distinct caching later if requested.
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
