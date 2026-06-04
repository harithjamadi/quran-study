// Service worker for Mubin — offline-friendly Quran study.
//
// Strategy:
//   • Static assets (font/image/style/script): cache-first. Safe because Next.js
//     content-hashes these URLs, so a given URL's bytes never change.
//   • Quran word/root data and /api/roots: stale-while-revalidate.
//   • HTML documents: network-first, falling back to cache only when offline.
//     We deliberately do NOT precache the HTML shell — a stale shell references
//     old hashed chunk URLs that 404 after a deploy, which boots a blank page.
//
// IMPORTANT: bump CACHE_VERSION on every deploy that changes caching behaviour.
// Changing this file's bytes is what makes browsers detect and install the new
// worker; the `activate` step then purges every older cache, self-healing any
// device stuck on a previous version.

const CACHE_VERSION = "v2";
const CACHE = `mubin-${CACHE_VERSION}`;

// Only stable, non-hashed static files. Never precache HTML routes.
const ESSENTIAL = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(ESSENTIAL.map((url) => cache.add(url))))
  );
  // Activate this worker as soon as it finishes installing.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Allow the page to tell a waiting worker to take over immediately.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Pass-through for cross-origin (audio CDN, translation API).
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate for static Quran data + API roots.
  if (url.pathname.startsWith("/data/") || url.pathname.startsWith("/api/roots/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // HTML documents: network-first. Only fall back to cache when the network is
  // unreachable — never serve a stale shell while online, so fresh chunk URLs
  // always match the served HTML.
  if (req.destination === "document" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/")) || Response.error())
    );
    return;
  }

  // Static assets: cache-first (URLs are content-hashed, so this is safe).
  if (["font", "image", "style", "script"].includes(req.destination)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req).catch(() => null);
        if (res && res.ok) cache.put(req, res.clone());
        return res || Response.error();
      })
    );
  }
});
