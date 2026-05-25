/* eslint-disable */
// MechaBlog Service Worker v1.0.1
// Servido desde /blog/sw.js con scope /blog/ (el blog vive bajo /blog/* via CF Worker).
// Estrategias:
// - HTML pages: NETWORK-ONLY con fallback /blog/offline (no cachea HTML)
// - Images same/cross-origin: stale-while-revalidate cap 60
// - CSS/JS/fonts: cache-first
// - /api/blog/header-data: stale-while-revalidate cap 30

const VERSION = "v1.0.1";
const CACHE_SHELL = `mb-shell-${VERSION}`;
const CACHE_IMAGES = "mb-images";
const CACHE_PAGES = "mb-pages";

const SHELL = [
  "/blog/offline",
  "/blog/icons/icon-192.png",
  "/blog/icons/icon-512.png",
  "/blog/icons/apple-touch-icon.png",
];

const MAX_IMAGES = 60;
const MAX_PAGES = 30;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) =>
        Promise.all(SHELL.map((u) => cache.add(u).catch(() => {})))
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("mb-shell-") && k !== CACHE_SHELL)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, maxItems) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  await cache.delete(keys[0]);
  return trimCache(name, maxItems);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  const isImage =
    req.destination === "image" ||
    /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|$)/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      caches.open(CACHE_IMAGES).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(req, res.clone());
                trimCache(CACHE_IMAGES, MAX_IMAGES);
              }
              return res;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        }),
      ),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");
  if (isHTML) {
    event.respondWith(
      fetch(req).catch(() => caches.match("/blog/offline")),
    );
    return;
  }

  if (/\.(css|js|woff2?|ttf|otf)(\?|$)/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res && res.status === 200) {
              caches.open(CACHE_SHELL).then((c) => c.put(req, res.clone()));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/api/blog/header-data")) {
    event.respondWith(
      caches.open(CACHE_PAGES).then((cache) =>
        cache.match(req).then((cached) => {
          const fp = fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(req, res.clone());
                trimCache(CACHE_PAGES, MAX_PAGES);
              }
              return res;
            })
            .catch(() => cached);
          return cached || fp;
        }),
      ),
    );
    return;
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "MechaBlog", body: event.data.text() };
  }
  const title = payload.title || "MechaBlog";
  const options = {
    body: payload.body || "",
    icon: "/blog/icons/icon-192.png",
    badge: "/blog/icons/icon-192.png",
    image: payload.image,
    tag: payload.tag || "mechablog-default",
    renotify: true,
    data: { url: payload.url || "/blog" },
    actions: [
      { action: "read", title: "Leer" },
      { action: "close", title: "Cerrar" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/blog";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const c of clients) {
          if ("focus" in c) {
            c.focus();
            c.navigate(url);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((sub) =>
        fetch("/api/blog/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        }),
      ),
  );
});
