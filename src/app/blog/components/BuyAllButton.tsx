import type { TutorialPublished } from "@/lib/db/queries";
import TrackableLink from "./TrackableLink";

interface Props {
  linkedProducts: TutorialPublished["linked_products"];
  slug: string;
}

/**
 * CTA "Comprar todo" — agrega N productos al carrito via plugin WP
 * mecha-blog-tutorials v1.1.0+ (?mecha_bundle=SKU1,SKU2,...).
 */
export default function BuyAllButton({ linkedProducts, slug }: Props) {
  if (linkedProducts.length === 0) return null;

  const total = linkedProducts.reduce((s, p) => s + p.price_clp, 0);
  const skus = linkedProducts.map((p) => p.product_id).join(",");
  const bundleUrl =
    `https://www.mechatronicstore.cl/?mecha_bundle=${encodeURIComponent(skus)}` +
    `&utm_source=blog&utm_medium=tutorial` +
    `&utm_campaign=${encodeURIComponent(slug)}&utm_content=buy_all`;

  return (
    <div className="my-8">
      <TrackableLink
        href={bundleUrl}
        slug={slug}
        source="buy_all"
        productName={`Comprar todo (${linkedProducts.length} productos)`}
        className="group relative block overflow-hidden rounded-xl transition-all hover:scale-[1.01]"
      >
        <div
          className="relative flex items-center justify-between gap-4 p-5"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-purple-light) 100%)",
            boxShadow: "0 8px 32px var(--shadow-glow)",
          }}
        >
          {/* Decoración: yellow accent corner */}
          <div
            className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20"
            style={{ background: "var(--brand-yellow)" }}
            aria-hidden
          />
          <div className="relative flex items-center gap-4 flex-1 min-w-0">
            <div
              className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg"
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                backdropFilter: "blur(4px)",
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-white/85 text-xs font-bold uppercase tracking-[0.12em]">
                Atajo
              </div>
              <div className="text-white font-bold text-lg leading-tight">
                Comprar los {linkedProducts.length} productos juntos
              </div>
              <div className="text-white/85 text-xs mt-0.5">
                Se agregan automáticamente a tu carrito
              </div>
            </div>
          </div>
          <div className="relative flex-shrink-0 text-right">
            <div className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-0.5">
              Total
            </div>
            <div
              className="text-white font-bold text-2xl tabular-nums"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}
            >
              ${total.toLocaleString("es-CL")}
            </div>
          </div>
        </div>
      </TrackableLink>
    </div>
  );
}
