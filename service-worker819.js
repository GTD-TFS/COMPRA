/* service-worker.js — PWA mínima para GitHub Pages
   - HTML: network-first (para recibir cambios al actualizar)
   - Assets: cache-first (rápido y offline)
*/

const CACHE_VERSION = "compra-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  // Si tienes carpeta de fotos y quieres offline:
  // "./images/leche.jpg",
  // "./images/panintegral.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_VERSION ? null : caches.delete(k))));
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
  const cache = await caches.open(CACHE_VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;

  const res = await fetch(req);
  // Cachea solo respuestas válidas
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    // CLAVE: en navegación, ignora querystring (?list=...) al buscar en caché
    const hit =
      (await cache.match(req, { ignoreSearch: true })) ||
      (await cache.match("./index.html", { ignoreSearch: true })) ||
      (await cache.match("./", { ignoreSearch: true }));

    return hit;
  }
}
