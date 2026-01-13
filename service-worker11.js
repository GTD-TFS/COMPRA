/* service-worker.js — PWA mínima para GitHub Pages
   - HTML: network-first (para recibir cambios al actualizar)
   - Assets: cache-first (rápido y offline)
   - Imágenes /images/: cache-first persistente (no se borra al cambiar versión app)
*/

const APP_CACHE = "compra-app-v3";
const IMG_CACHE = "compra-images-v1";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k === APP_CACHE || k === IMG_CACHE ? null : caches.delete(k)))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo tu mismo origen
  if (url.origin !== self.location.origin) return;

  // Imágenes: cache-first persistente
  if (url.pathname.startsWith("/images/")) {
    event.respondWith(imageCacheFirst(req));
    return;
  }

  // Navegaciones / HTML: network-first (para que el index se actualice)
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Resto: cache-first
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(APP_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;

  const res = await fetch(req);
  // Cachea solo respuestas "válidas"
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req);
    // Fallback final: intenta servir index.html
    return hit || cache.match("./index.html");
  }
}

// Cache-first para imágenes, cacheando incluso respuestas opaque
async function imageCacheFirst(req) {
  const cache = await caches.open(IMG_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;

  const res = await fetch(req);
  if (res) cache.put(req, res.clone());
  return res;
}
