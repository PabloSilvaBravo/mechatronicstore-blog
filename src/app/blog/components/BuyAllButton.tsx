import type { TutorialPublished } from "@/lib/db/queries";
import TrackableLink from "./TrackableLink";

interface Props {
  linkedProducts: TutorialPublished["linked_products"];
  slug: string;
}

/**
 * Botón "Comprar todo" que agrega N productos al carrito de un click.
 *
 * Pablo 18-may-2026: el endpoint default de WC `?add-to-cart=A,B,C`
 * NO soporta múltiples productos → 404. Fix: usamos el endpoint del
 * plugin `mecha-blog-tutorials` (v1.1.0+) `?mecha_bundle=SKU1,SKU2,SKU3`
 * que resuelve cada SKU, los agrega vía WC API interna y redirige a /carrito/.
 *
 * Requiere: plugin v1.1.0+ instalado en WP. Si no está, este link da 404
 * tal cual el bug original. Verificar con Pablo después de redeploy.
 */
export default function BuyAllButton({ linkedProducts, slug }: Props) {
  if (linkedProducts.length === 0) return null;

  const total = linkedProducts.reduce((s, p) => s + p.price_clp, 0);
  const skus = linkedProducts.map((p) => p.product_id).join(",");
  // Endpoint del plugin mecha-blog-tutorials (handler en wp_loaded).
  // No requiere ruta específica — escucha en cualquier URL WP con
  // ?mecha_bundle=… presente. Usamos / (home) por compatibilidad.
  const bundleUrl =
    `https://www.mechatronicstore.cl/?mecha_bundle=${encodeURIComponent(skus)}` +
    `&utm_source=blog&utm_medium=tutorial` +
    `&utm_campaign=${encodeURIComponent(slug)}&utm_content=buy_all`;

  return (
    <TrackableLink
      href={bundleUrl}
      slug={slug}
      source="buy_all"
      productName={`Comprar todo (${linkedProducts.length} productos)`}
      className="block w-full text-center py-4 my-6 bg-[color:var(--primary)] text-black font-bold text-lg rounded-lg hover:opacity-90 transition-opacity"
    >
      🛒 Comprar todo ({linkedProducts.length} productos): CLP ${total.toLocaleString("es-CL")}
    </TrackableLink>
  );
}
