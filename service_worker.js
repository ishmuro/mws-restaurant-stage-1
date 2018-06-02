const CACHE_VER = 'v1';
const CACHE_WHITELIST = ['v1'];

const CACHED_RESOURCES = [
    '/data/restaurants.json',
    '/js/dbhelper.js',
    '/js/restaurant_info.js',
    '/js/main.js',
    '/css/styles.css',
    '/css/responsive.css',
    '/restaurant.html',
    '/'
]


/**
 * On worker install we want to have a full app carcass cached
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VER)
        .then(cache => {
            let resources = CACHED_RESOURCES.cache_first.concat(CACHED_RESOURCES.net_first);
            return cache.addAll(resources);
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
                        console.warn(`Could not fetch ${event.request.uri}. Internet much?`);
                    });
                })
            })
            .catch(error => {
                console.error(`Could not open cache ${CACHE_VER}: ${error}`);
            })
        );
    }
});