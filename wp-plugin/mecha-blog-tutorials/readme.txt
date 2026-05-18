=== Mecha Blog Tutorials Widget ===
Contributors: pablosilvabravo92
Tags: woocommerce, tutorials, mechatronicstore
Requires at least: 6.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.1.0
License: MIT

Muestra "Tutoriales con este producto" en cada página de producto WooCommerce.

== Description ==

Consulta el endpoint público https://www.mechatronicstore.cl/api/blog/tutorials?product_id=X
del blog Next.js, y renderiza una sección con cards de los tutoriales que
linkean a ese producto. Crea link juice bidireccional con el blog.

== Instalación ==

1. Subir la carpeta `mecha-blog-tutorials/` a `/wp-content/plugins/`
2. Activar el plugin desde el menú "Plugins" de WordPress
3. Visitar una página de producto Woo (ej. SKU `D-517`) — debería
   aparecer la sección al final del summary del producto

== Configuración ==

Cero config requerida. Endpoint hardcoded a https://www.mechatronicstore.cl/api/blog.

Si necesitás cambiarlo (e.g. para staging), editar `MBT_API_BASE` en
el archivo PHP principal.

== Cache ==

Cada respuesta del endpoint se cachea 6h via WP Transients API. Para
invalidar manualmente: Settings → Mecha Blog Tutorials → "Limpiar cache de un SKU".

== Shortcode ==

`[mecha_blog_tutorials]` — usa el SKU del producto actual (dentro de página WC)
`[mecha_blog_tutorials sku="D-517"]` — usa un SKU específico

== Changelog ==

= 1.1.0 (18-may-2026) =
* NEW: bundle add-to-cart handler `?mecha_bundle=SKU1,SKU2,SKU3` que
  resuelve cada SKU, los agrega TODOS al carrito y redirige a /carrito/
  preservando UTMs del blog. Soluciona 404 del botón "Comprar todo" de
  tutoriales con múltiples productos (WC default no soporta multi-add).
* Max 20 SKUs por bundle (anti-abuse). Sanitización SKU regex.
* Skip productos no-purchasable + warning notice con lista de skipped.

= 1.0.0 (17-may-2026) =
* Initial release: hook woocommerce_after_single_product_summary,
  shortcode, settings page con clear-cache.
