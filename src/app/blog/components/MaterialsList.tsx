import type { TutorialPublished } from "@/lib/db/queries";
import { matchProductToMaterial } from "@/lib/materials-matching";
import TrackableLink from "./TrackableLink";
import MaterialThumb from "./MaterialThumb";

interface Props {
  materials: TutorialPublished["materials_list"];
  linkedProducts: TutorialPublished["linked_products"];
  slug: string;
}

// Pablo 22-may-2026: WordPress genera sizes cropeados automáticamente
// (foto.jpg → foto-100x100.jpg en el mismo path). Las thumbs cropeadas
// son ~10× más livianas (1-10KB vs 50-500KB) — critical performance
// con 20+ thumbs/página. El <img onError> hace fallback a original si
// la cropeada no existe (raro con WebP recientes).
const THUMB_EXT_RE = /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i;
const THUMB_ALREADY_RE = /-\d+x\d+\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i;
function toThumb(url: string, size = 100): string {
  if (!url || THUMB_ALREADY_RE.test(url)) return url;
  const m = url.match(THUMB_EXT_RE);
  if (!m) return url;
  return url.replace(THUMB_EXT_RE, `-${size}x${size}.${m[1]}${m[2] || ""}`);
}

function buildProductUrl(
  rawUrl: string,
  slug: string,
  productId: number | string,
  wcId?: number,
  qty?: number,
): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("utm_source", "blog");
    u.searchParams.set("utm_medium", "tutorial");
    u.searchParams.set("utm_campaign", slug);
    u.searchParams.set("utm_content", String(productId));
    // Pablo 22-may-2026: si tenemos wc_id, agregamos ?add-to-cart=N
    // que WooCommerce procesa nativamente: agrega al cart Y queda en
    // la página del producto con notif "Producto añadido". Sin wc_id
    // solo abre página producto (UX intermedia OK).
    if (wcId) {
      u.searchParams.set("add-to-cart", String(wcId));
      if (qty && qty > 1) {
        u.searchParams.set("quantity", String(qty));
      }
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

export default function MaterialsList({
  materials,
  linkedProducts,
  slug,
}: Props) {
  const linked = materials
    .map((m) => ({ m, product: matchProductToMaterial(m.name, linkedProducts) }))
    .filter((x) => x.product);
  const unlinked = materials
    .map((m) => ({ m, product: matchProductToMaterial(m.name, linkedProducts) }))
    .filter((x) => !x.product);

  return (
    <section
      className="my-10 overflow-hidden rounded-xl border"
      style={{
        borderColor: "var(--border-strong)",
        backgroundColor: "var(--bg-elevated)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center gap-3"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "color-mix(in srgb, var(--brand-purple) 8%, transparent)",
        }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
          style={{ backgroundColor: "var(--brand-purple)" }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="white"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
            />
          </svg>
        </div>
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--text-accent)" }}
          >
            Necesitas
          </div>
          <h2
            className="font-headline text-xl"
            style={{ color: "var(--text)" }}
          >
            Lista de materiales
          </h2>
        </div>
      </div>

      {/* Lista */}
      <ul>
        {[...linked, ...unlinked].map(({ m, product }, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-4 px-5 py-4 border-b last:border-b-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Thumbnail del producto si el match existe + tiene imagen.
                  Pablo 22-may-2026: el MCP buscar_productos devuelve thumb
                  100×100, y enrich_linked_products.py scrapea og:image
                  como fallback. Mejor UX que el checkmark suelto. */}
              {product?.image_url ? (
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border"
                  style={{
                    borderColor: "var(--border-subtle)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <MaterialThumb
                    thumbUrl={toThumb(product.image_url, 100)}
                    fallbackUrl={product.image_url}
                  />
                </div>
              ) : (
                <div
                  className="mt-1 flex-shrink-0 w-5 h-5 flex items-center justify-center"
                  style={{ color: product ? "var(--brand-yellow)" : "var(--text-dim)" }}
                >
                  {product ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="font-semibold leading-snug"
                  style={{ color: "var(--text)" }}
                >
                  {m.name}
                  {m.qty && m.qty > 1 ? (
                    <span
                      className="ml-2 text-sm font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ×{m.qty}
                    </span>
                  ) : null}
                </div>
                {m.role && (
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {m.role}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {product ? (
                <>
                  <span
                    className="text-sm font-bold whitespace-nowrap"
                    style={{ color: "var(--text)" }}
                  >
                    ${product.price_clp.toLocaleString("es-CL")}
                  </span>
                  <TrackableLink
                    href={buildProductUrl(
                      product.product_url,
                      slug,
                      product.product_id,
                      product.wc_id,
                      m.qty,
                    )}
                    slug={slug}
                    source="material_list"
                    productId={String(product.product_id)}
                    productName={product.name_original}
                    className="btn-luis inline-flex items-center gap-1 text-xs font-bold rounded-md whitespace-nowrap"
                    style={{
                      backgroundColor: "var(--brand-yellow)",
                      color: "var(--text-on-yellow)",
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.375rem",
                    }}
                  >
                    Agregar →
                  </TrackableLink>
                </>
              ) : (
                <span
                  className="text-xs italic whitespace-nowrap"
                  style={{ color: "var(--text-dim)" }}
                >
                  no disponible
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
