const CACHE = "leadadmin-v3";
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/index.html", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"]))); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // borrar caches viejos para forzar la nueva versión
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const u = new URL(req.url);
  // nunca cachear llamadas a Supabase
  if (u.hostname.endsWith("supabase.co")) return;
  // navegación (abrir la app): siempre red primero, así ves la última versión
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("/index.html", cp)); return r; }).catch(() => caches.match("/index.html")));
    return;
  }
  e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; }).catch(() => caches.match(req).then((m) => m || caches.match("/index.html"))));
});
