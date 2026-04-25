// Minimal service worker — required for the app to be installable as a PWA.
// We deliberately keep caching narrow: only the app shell entry points are
// cached on install so a returning user can boot the app even on a flaky
// connection. Everything else (Supabase calls, Tesseract WASM, dynamic JS
// chunks) goes straight to the network — they're already designed to fail
// gracefully and we don't want stale chunks served after deploys.

const CACHE_NAME = "fbt-shell-v1";
const SHELL_URLS = ["/", "/index.html", "/favicon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Wipe old caches on version bump
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle GET requests to the same origin — everything else (POST to
  // Supabase, image uploads, third-party WASM) goes through untouched.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Network-first for navigation: keeps the user on the latest HTML after a
  // deploy. Falls back to cached shell when offline so the app still boots.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html") || caches.match("/"))
    );
    return;
  }

  // Cache-first for the shell static assets (favicon, manifest); else passthrough.
  const url = new URL(req.url).pathname;
  if (SHELL_URLS.includes(url)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req))
    );
  }
});
