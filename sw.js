// Fourth Shift service worker — bump CACHE on every deploy.
const CACHE = "fourth-shift-v11";
const SHELL = [
  "./", "index.html", "css/style.css",
  "js/app.js", "js/api.js", "js/local-backend.js", "js/config.js", "js/skeleton-tasks.js",
  "manifest.json", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// App shell: cache-first. Everything else (Supabase, fonts): network only.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request))
  );
});
