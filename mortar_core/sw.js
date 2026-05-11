// Update CACHE_VERSION on every release (same cadence as ?v= query strings in index.html).
const CACHE_VERSION = 'v2.13.0';
const CACHE_NAME = `armamortars-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
    'index.html',
    'styles.css?v=5',
    'BallisticCalculator.js?v=2.13.0',
    'ballistic-data.json',
    'manifest.webmanifest',
    'arma-reforger-logo.png',
    'icon.png',
    'ui_js/main.js',
    'ui_js/calculator.js',
    'ui_js/constants.js',
    'ui_js/coord-manager.js',
    'ui_js/corrections.js',
    'ui_js/dom-cache.js',
    'ui_js/ffe.js',
    'ui_js/history.js',
    'ui_js/onboarding.js',
    'ui_js/share.js',
    'ui_js/state.js',
    'ui_js/ui.js',
    'ui_js/utils.js',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;

    if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
        return;
    }

    const url = new URL(request.url);

    // Navigation requests — network-first so users always get the latest index.html when online.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
                    return response;
                })
                .catch(() =>
                    caches.match(request).then(cached => cached || caches.match('index.html'))
                )
        );
        return;
    }

    // ballistic-data.json — stale-while-revalidate: serve cached instantly, refresh in background.
    if (url.pathname.endsWith('/ballistic-data.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async cache => {
                const cached = await cache.match(request);
                const fetchPromise = fetch(request).then(response => {
                    if (response.ok) cache.put(request, response.clone());
                    return response;
                });
                if (cached) {
                    fetchPromise.catch(() => {});
                    return cached;
                }
                return fetchPromise;
            })
        );
        return;
    }

    // All other same-origin assets — cache-first, network fallback.
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                if (response.ok) {
                    caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
                }
                return response;
            });
        })
    );
});
