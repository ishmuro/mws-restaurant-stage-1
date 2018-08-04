const CACHE_VER = 'v1';
const CACHE_WHITELIST = ['v1'];

const CACHED_RESOURCES = [
    '/js/dbhelper.js',
    '/js/idb.js',
    '/js/restaurant_info.js',
    '/js/main.js',
    '/css/styles.css',
    '/css/responsive.css',
    '/restaurant.html',
    '/service_worker.js'
];

const CACHEABLE_LOCATIONS = [
    'googleapis.com',
    'gstatic.com'
]

/**
 * On worker install we want to have a full app carcass cached
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VER)
        .then(cache => {
            return cache.addAll(CACHED_RESOURCES);
        })
        .catch(error => {
            console.error(`Could not open cache ${CACHE_VER}: ${error}`);
        })
    );
});

/**
 * Prune old caches when new worker takes over
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
        .then(cache_keys => Promise.all(
                cache_keys.map(key => CACHE_WHITELIST.includes(key)?Promise.resolve():caches.delete(key))
            )
        )
    );
});

/**
 * Return cached data for fetch events if present, put it to cache otherwise
 */
self.addEventListener('fetch', event => {
    if (event.request.method === 'GET' && /^https?/i.test(event.request.url)) {

        let canCache = false;
        for (const pattern of CACHEABLE_LOCATIONS) {
            if (event.request.url.includes(pattern)) {
                canCache = true;
            }
        }

        if (!canCache) {
            event.respondWith(fetch(event.request));    // Skip caching
            return;
        }

        event.respondWith(
            caches.open(CACHE_VER)
            .then(cache => {
                return cache.match(event.request)
                .then (response => {
                    console.debug(`Found cached response to ${event.request.url}.`);
                    return response || fetch(event.request)
                    .then(fetched_response => {
                        cache.put(event.request, fetched_response.clone());
                        console.debug(`Fetched and cached ${event.request.url}.`);
                        return fetched_response;
                    })
                    .catch(error => {
                        console.warn(`Could not fetch ${event.request.uri} (${error}). Internet much?`);
                    });
                })
            })
            .catch(error => {
                console.error(`Could not open cache ${CACHE_VER}: ${error}`);
            })
        );
    }
});