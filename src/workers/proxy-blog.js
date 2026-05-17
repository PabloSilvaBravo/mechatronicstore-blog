// proxy-blog Cloudflare Worker
//
// True reverse proxy: cuando un usuario navega a
// https://www.mechatronicstore.cl/blog/* (o /api/blog/* o /admin/blog/*),
// el request se forwardea a la app Next.js en Vercel manteniendo la URL
// pública. Google trata el contenido como del dominio raíz mechatronicstore.cl
// → acumula link juice y autoridad.
//
// Distinto a proxy-noticias y proxy-ai que hacen redirect 301 a subdominio.
//
// Para cualquier path que NO empiece con /blog, /api/blog o /admin/blog,
// el worker hace passthrough al origin (WordPress).
//
// Pablo 16-may-2026.

const BLOG_BACKEND = "https://mechatronicstore-blog.vercel.app";

function isBlogPath(pathname) {
  return (
    pathname === "/blog" ||
    pathname.startsWith("/blog/") ||
    pathname === "/api/blog" ||
    pathname.startsWith("/api/blog/") ||
    pathname === "/admin/blog" ||
    pathname.startsWith("/admin/blog/") ||
    // Next.js assets necesarios para que el cliente React hidrate.
    // Las rutas /_next/* las genera Next.js con paths absolutos en el HTML;
    // si no las forwardamos, WordPress devuelve 403 y la página se queda
    // sin JS → no se montan componentes client-side (Comments, etc.).
    pathname.startsWith("/_next/")
  );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (!isBlogPath(url.pathname)) {
      // Passthrough a WordPress
      return fetch(request);
    }

    // Reverse proxy a Vercel
    const target = new URL(BLOG_BACKEND);
    target.pathname = url.pathname;
    target.search = url.search;

    const proxyReq = new Request(target.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual",
    });

    // Forwarding headers para que Next.js sepa el host original
    proxyReq.headers.set("X-Forwarded-Host", url.hostname);
    proxyReq.headers.set("X-Forwarded-Proto", "https");
    proxyReq.headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");

    return fetch(proxyReq);
  },
};
