"use client";

import { useState } from "react";
import type { TutorialPublished } from "@/lib/db/queries";

interface Props {
  linkedProducts: TutorialPublished["linked_products"];
  slug: string;
}

/**
 * CTA "Comprar todo" — agrega N productos al carrito de WooCommerce.
 *
 * Pablo 22-may-2026 (FIX bug crítico): la versión anterior usaba
 * ?mecha_bundle=SKU1,SKU2,... esperando un plugin WP `mecha-blog-tutorials`
 * que NUNCA existió. El link daba 200 pero WP ignoraba el query param →
 * el botón "Comprar todo" no hacía absolutamente nada.
 *
 * Solución: client-side handler que aprovecha que blog+store son same-
 * origin (mechatronicstore.cl). WooCommerce nativo procesa
 * `?add-to-cart=ID&quantity=N` con session cookies compartidas. Hacemos
 * N fetches en secuencia, después redirigimos a /cart/.
 *
 * Productos sin `wc_id` (no enriquecidos aún) se skipean y se reporta
 * al final. UX: button con estado loading mientras corre.
 */
export default function BuyAllButton({ linkedProducts, slug }: Props) {
  const [status, setStatus] = useState<"idle" | "adding" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");

  if (linkedProducts.length === 0) return null;

  // Solo productos enriquecidos con wc_id pueden agregarse
  const addable = linkedProducts.filter((p) => p.wc_id);
  const total = addable.reduce((s, p) => s + p.price_clp, 0);

  if (addable.length === 0) {
    return null;
  }

  async function handleAddAll() {
    if (status === "adding") return;
    setStatus("adding");
    setError("");

    try {
      // Sequential fetches. WooCommerce no soporta bulk con un solo request,
      // así que iteramos. Tarda ~200-500ms por producto.
      for (const p of addable) {
        const qty = (p as { qty?: number }).qty || 1;
        const url =
          `https://www.mechatronicstore.cl/?add-to-cart=${p.wc_id}` +
          `&quantity=${qty}` +
          `&utm_source=blog&utm_medium=tutorial` +
          `&utm_campaign=${encodeURIComponent(slug)}` +
          `&utm_content=buy_all_${p.wc_id}`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include", // cookies WC sesión
          redirect: "follow",
        });
        if (!res.ok && res.status !== 0) {
          throw new Error(`Producto ${p.wc_id} no se agregó (HTTP ${res.status})`);
        }
        // Track click conversion (best-effort, no bloqueante)
        fetch("/api/blog/track/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            source: "buy_all",
            product_id: String(p.product_id),
            product_name: p.name_original,
            ref_url: url,
          }),
        }).catch(() => {});
      }

      setStatus("done");
      // Pequeño delay para que el usuario vea el "✓ Listo" antes de redirect
      setTimeout(() => {
        window.location.href = "https://www.mechatronicstore.cl/cart/?utm_source=blog&utm_medium=tutorial&utm_campaign=" + encodeURIComponent(slug);
      }, 700);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const buttonLabel =
    status === "adding"
      ? "Agregando..."
      : status === "done"
        ? "✓ Listo · llevándote al carrito..."
        : `Comprar los ${addable.length} productos juntos`;

  return (
    <div className="my-8">
      <button
        type="button"
        onClick={handleAddAll}
        disabled={status === "adding" || status === "done"}
        className="btn-luis group relative block overflow-hidden rounded-xl w-full text-left disabled:opacity-90 disabled:cursor-wait"
      >
        <div
          className="relative flex items-center justify-between gap-4 p-5"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-purple-light) 100%)",
            boxShadow: "0 8px 32px var(--shadow-glow)",
          }}
        >
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
              {status === "adding" ? (
                <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" stroke="white" strokeWidth={2} fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                  <path d="M12 2 a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
              )}
            </div>
            <div className="text-left">
              <div className="text-white/85 text-xs font-bold uppercase tracking-[0.12em]">
                Atajo
              </div>
              <div className="text-white font-bold text-lg leading-tight">
                {buttonLabel}
              </div>
              <div className="text-white/85 text-xs mt-0.5">
                {status === "idle" && "Se agregan automáticamente a tu carrito"}
                {status === "adding" && `Agregando ${addable.length} productos...`}
                {status === "done" && "Te llevamos al carrito"}
                {status === "error" && error}
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
      </button>
    </div>
  );
}
