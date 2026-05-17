import type { MetadataRoute } from "next";

/**
 * NOTA importante (Pablo 17-may-2026):
 *
 * Next.js sirve /robots.txt en el root. PERO el dominio público
 * www.mechatronicstore.cl tiene WordPress como origin para todo lo que no
 * es /blog/*, /api/blog/* o /admin/blog/*. El worker `proxy-blog` NO
 * rutea /robots.txt a Vercel → este robots NO es alcanzable públicamente.
 *
 * Sirve para 2 cosas:
 *   1. Documentar policy oficial del blog (referenciado en code review)
 *   2. Accesible en https://mechatronicstore-blog.vercel.app/robots.txt
 *      (URL canónica de Vercel, útil para testing aislado)
 *
 * El robots.txt PÚBLICO se gestiona en wp-admin de WordPress.
 * Asegurar que incluya: Sitemap: https://www.mechatronicstore.cl/blog/sitemap.xml
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/blog", "/blog/"],
        disallow: [
          "/admin/blog",
          "/admin/blog/",
          "/blog/buscar",
          "/api/blog/",
        ],
      },
    ],
    sitemap: "https://www.mechatronicstore.cl/blog/sitemap.xml",
    host: "https://www.mechatronicstore.cl",
  };
}
