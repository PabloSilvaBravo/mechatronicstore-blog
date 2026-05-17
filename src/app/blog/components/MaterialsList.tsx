import type { TutorialPublished } from "@/lib/db/queries";

interface Props {
  materials: TutorialPublished["materials_list"];
  linkedProducts: TutorialPublished["linked_products"];
  slug: string;
}

export default function MaterialsList({ materials, linkedProducts }: Props) {
  const productIndex = new Map(
    linkedProducts.map((p) => [p.name_original.toLowerCase(), p])
  );

  return (
    <div className="rounded-lg border border-[color:var(--border)] p-5 bg-[color:var(--background)] my-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>📋</span>
        <span>Lista de materiales</span>
      </h2>
      <ul className="space-y-3">
        {materials.map((m, i) => {
          const product = productIndex.get(m.name.toLowerCase());
          return (
            <li
              key={i}
              className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3 last:border-b-0"
            >
              <div className="flex-1">
                <div className="font-medium">
                  {m.name}
                  {m.qty && m.qty > 1 ? ` ×${m.qty}` : ""}
                </div>
                {m.role && (
                  <div className="text-xs text-[color:var(--muted)]">{m.role}</div>
                )}
              </div>
              {product ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    CLP ${product.price_clp.toLocaleString("es-CL")}
                  </span>
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noopener"
                    className="text-xs px-3 py-1.5 bg-[color:var(--primary)] text-black font-semibold rounded hover:opacity-90"
                  >
                    Agregar al carrito
                  </a>
                </div>
              ) : (
                <span className="text-xs text-[color:var(--muted)]">
                  (no disponible)
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
