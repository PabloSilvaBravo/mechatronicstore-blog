import type { TutorialPublished } from "@/lib/db/queries";

interface Props {
  linkedProducts: TutorialPublished["linked_products"];
  slug: string;
}

export default function BuyAllButton({ linkedProducts, slug }: Props) {
  if (linkedProducts.length === 0) return null;

  const total = linkedProducts.reduce((s, p) => s + p.price_clp, 0);
  const productIds = linkedProducts.map((p) => p.product_id).join(",");
  const cartUrl =
    `https://www.mechatronicstore.cl/carrito/?add-to-cart=${productIds}` +
    `&utm_source=blog&utm_medium=tutorial&utm_campaign=${encodeURIComponent(slug)}&utm_content=buy_all`;

  return (
    <a
      href={cartUrl}
      target="_blank"
      rel="noopener"
      className="block w-full text-center py-4 my-6 bg-[color:var(--primary)] text-black font-bold text-lg rounded-lg hover:opacity-90 transition-opacity"
    >
      🛒 Comprar todo: CLP ${total.toLocaleString("es-CL")}
    </a>
  );
}
