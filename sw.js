// ══════════════════════════════════════════════════════
// SERVICE WORKER — ILTEC Reporte de Producción
// Estrategia: Cache-first para el HTML, network-first para el resto
// Sube este archivo a GitHub junto con index.html
// ══════════════════════════════════════════════════════

const CACHE_NAME = 'iltec-v1';
const URLS_CACHE = [
    '/orden_produccion/index.html',
    '/orden_produccion/',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Instalar: guardar archivos en caché
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(URLS_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activar: limpiar cachés viejos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(k => k !== CACHE_NAME)
                .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: cache-first para el HTML local, network-first para Firebase/WhatsApp
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Firebase y WhatsApp siempre necesitan red — no interceptar
    if (url.includes('firebase') || url.includes('firestore') ||
        url.includes('wa.me') || url.includes('googleapis.com/icon')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // Servir desde caché y actualizar en segundo plano
                const networkFetch = fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache =>
                            cache.put(event.request, response.clone())
                        );
                    }
                    return response;
                }).catch(() => {});
                return cached;
            }
            // No está en caché: intentar red
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => caches.match('/orden_produccion/index.html'));
        })
    );
});
