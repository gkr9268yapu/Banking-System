const CACHE = "gkr-offline-v1";
const OFFLINE_URL = "/offline.html"; // a plain static page with no user data

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.add(OFFLINE_URL))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            // Remove caches left by older versions of this file.
            .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    // Not a page open: do nothing, the browser handles it normally.
    if (event.request.mode !== "navigate") return;

    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});