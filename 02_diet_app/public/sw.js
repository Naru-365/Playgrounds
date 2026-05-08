const VERSION = "karute-v1";
const STATIC_ASSETS = [
  "/",
  "/log",
  "/coach",
  "/talk",
  "/profile",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((u) =>
          cache.add(u).catch(() => {
            // ignore individual asset failures
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache API routes — always go network. AI calls must be fresh.
  if (url.pathname.startsWith("/api/")) return;

  // Network-first for navigation (HTML), fallback to cache when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/")))
    );
    return;
  }

  // Cache-first for static assets.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok && (res.type === "basic" || res.type === "default")) {
              const clone = res.clone();
              caches.open(VERSION).then((c) => c.put(req, clone));
            }
            return res;
          })
      )
    );
  }
});
