import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Tutoriales y proyectos de electrónica, robótica y DIY publicados por MechatronicStore.",
  alternates: { canonical: "https://www.mechatronicstore.cl/blog" },
};

export default function BlogHomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">
        Blog de tutoriales
      </h1>
      <p className="text-lg text-[color:var(--muted)] mb-8 max-w-2xl">
        Aprendé electrónica, robótica y DIY con tutoriales paso a paso.
        Cada proyecto incluye lista de materiales, código y links para
        comprar los componentes en MechatronicStore.
      </p>

      <div className="rounded-lg border border-[color:var(--border)] p-6 bg-[color:var(--background)]">
        <h2 className="text-xl font-semibold mb-2">
          🚧 Foundation week — placeholder
        </h2>
        <p className="text-[color:var(--muted)] mb-4">
          Este es un dummy del MVP semana 1. La página real con listings,
          buscador, categorías y schema vendrá en semanas 4-5.
        </p>
        <Link
          href="/blog/test"
          className="inline-block px-4 py-2 bg-[color:var(--primary)] text-black font-medium rounded hover:opacity-90"
        >
          Ver tutorial de prueba →
        </Link>
      </div>
    </div>
  );
}
