// Service worker for Mubin — offline-friendly Quran study.
// Strategy:
//   • Static assets (font/image/style/script): cache-first.
//   • Quran word/root data and /api/roots: stale-while-revalidate.
//   • HTML documents: network-first with offline fallback to the cached root.
//   • Cross-origin (Quran audio CDN, translation API): pass through.

const CACHE = "mubin-v1";
const ESSENTIAL = ["/", "/learn", "/surahs", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(ESSENTIAL.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
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

  // HTML documents: network-first; on failure, fall back to cached page or root.
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

  // Static assets: cache-first.
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
