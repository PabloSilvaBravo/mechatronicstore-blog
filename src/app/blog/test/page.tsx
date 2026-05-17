import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tutorial de prueba",
  description: "Página dummy para validar el routing y deploy de la semana 1.",
  alternates: { canonical: "https://www.mechatronicstore.cl/blog/test" },
};

export default function TestTutorialPage() {
  return (
    <article>
      <nav className="text-sm text-[color:var(--muted)] mb-6">
        <Link href="/blog" className="hover:underline">← Volver al blog</Link>
      </nav>

      <h1 className="text-3xl font-bold mb-2">
        Tutorial de prueba (Foundation week)
      </h1>
      <p className="text-[color:var(--muted)] mb-8">
        Publicado el 16-may-2026 · 5 min lectura
      </p>

      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <h2>Propósito</h2>
        <p>
          Esta página existe para confirmar que el routing end-to-end funciona:
        </p>
        <ol>
          <li>Cloudflare recibe request a <code>mechatronicstore.cl/blog/test</code></li>
          <li>Worker <code>proxy-blog</code> hace reverse proxy a <code>mecha-blog.vercel.app/blog/test</code></li>
          <li>Next.js sirve esta página</li>
          <li>Usuario ve contenido bajo URL del dominio principal</li>
        </ol>

        <h2>Próximos pasos</h2>
        <p>
          Cuando esta página rendere correctamente bajo
          <code>https://www.mechatronicstore.cl/blog/test</code>, la semana 1
          Foundation está completa. Pasamos a semana 2 (ingesta + scoring).
        </p>
      </div>
    </article>
  );
}
