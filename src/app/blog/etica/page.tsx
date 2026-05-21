import Link from "next/link";
import type { Metadata } from "next";

const BASE_URL = "https://www.mechatronicstore.cl";

export const metadata: Metadata = {
  title: "Política editorial",
  description:
    "Política editorial del Blog MechatronicStore: atribución obligatoria, re-angulación, valor añadido, transparencia con afiliados.",
  alternates: { canonical: `${BASE_URL}/blog/etica` },
  openGraph: {
    title: "Política editorial · Blog MechatronicStore",
    description:
      "Atribución obligatoria, re-angulación, valor añadido, transparencia con afiliados.",
    url: `${BASE_URL}/blog/etica`,
    type: "website",
    siteName: "MechatronicStore Blog",
    locale: "es_CL",
  },
};

export default function EticaPage() {
  return (
    <article className="prose-blog max-w-3xl mx-auto">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs uppercase tracking-[0.12em]"
        style={{ color: "var(--text-dim)" }}
      >
        <Link href="/blog" className="underlink">
          Blog
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <span style={{ color: "var(--text-muted)" }}>Política editorial</span>
      </nav>

      <header className="mb-10">
        <div
          className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
          style={{ color: "var(--brand-yellow)" }}
        >
          Transparencia
        </div>
        <h1
          className="font-headline mb-4 tracking-tight"
          style={{
            fontSize: "clamp(2rem, 1.5rem + 3vw, 3.25rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          <span className="h1-gradient-block">Política editorial</span>
        </h1>
        <p
          className="subtitle-mono with-caret mt-4"
          style={{ maxWidth: "60ch" }}
        >
          Reglas que aplicamos en cada publicación.
        </p>
      </header>

      <section className="space-y-8" style={{ color: "var(--text-muted)" }}>
        <div>
          <h2
            className="font-headline text-2xl font-bold mb-3"
            style={{ color: "var(--text)" }}
          >
            1. Atribución obligatoria
          </h2>
          <p className="text-base leading-relaxed">
            Todo tutorial publicado cita al autor original, el sitio fuente y la
            fecha de la publicación original. Si la fuente tiene política
            específica de re-uso, la respetamos al pie de la letra. La
            atribución aparece tanto al final del cuerpo como en el footer del
            tutorial.
          </p>
        </div>

        <div>
          <h2
            className="font-headline text-2xl font-bold mb-3"
            style={{ color: "var(--text)" }}
          >
            2. Re-angulación, no plagio
          </h2>
          <p className="text-base leading-relaxed">
            La versión en español no es traducción literal. Por reglamento
            interno, mínimo el{" "}
            <strong style={{ color: "var(--text)" }}>40% del texto</strong> se
            reescribe desde otro ángulo: pedagógico, práctico o adaptado al
            maker chileno. La estructura mínima de cada tutorial incluye:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-3 text-base">
            <li>Introducción reescrita</li>
            <li>Cuerpo con H2/H3 propios</li>
            <li>Sección &quot;Variantes y mejoras&quot;</li>
            <li>Sección &quot;Personalización para Chile&quot; (voltajes, importación, sustitutos locales)</li>
            <li>Sección &quot;Recursos&quot; con atribución y al menos un link externo</li>
          </ul>
        </div>

        <div>
          <h2
            className="font-headline text-2xl font-bold mb-3"
            style={{ color: "var(--text)" }}
          >
            3. Valor añadido
          </h2>
          <p className="text-base leading-relaxed">
            Para que un tutorial pase del ranking, debe ofrecer algo que la
            fuente original no tiene: contexto chileno, alternativas de
            componentes, troubleshooting común, simplificaciones o variantes.
            Si no podemos agregar valor real, descartamos el candidato.
          </p>
        </div>

        <div>
          <h2
            className="font-headline text-2xl font-bold mb-3"
            style={{ color: "var(--text)" }}
          >
            4. Transparencia con afiliados
          </h2>
          <p className="text-base leading-relaxed">
            Cuando un tutorial menciona componentes que vendemos en{" "}
            <a
              href="https://www.mechatronicstore.cl"
              className="underlink"
            >
              MechatronicStore.cl
            </a>
            , agregamos un link al producto con tracking{" "}
            <code
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              utm_source=blog
            </code>
            . Estos links nos generan ingresos cuando alguien compra. Eso
            financia el blog y la mantención del catálogo. Si en un futuro
            agregamos otros tipos de affiliate (Amazon, AliExpress), lo
            declararemos acá explícitamente.
          </p>
        </div>

        <div>
          <h2
            className="font-headline text-2xl font-bold mb-3"
            style={{ color: "var(--text)" }}
          >
            5. Pipeline automatizado
          </h2>
          <p className="text-base leading-relaxed">
            El blog corre sobre un pipeline editorial automatizado (Anthropic
            Claude + GitHub Actions) que aplica las reglas de arriba en cada
            corrida. La parte humana es la curación final, la respuesta a
            erratas y la mantención del catálogo de fuentes. Ver{" "}
            <Link href="/blog/sobre" className="underlink">
              cómo funciona
            </Link>{" "}
            para el flujo completo.
          </p>
        </div>

        <div>
          <h2
            className="font-headline text-2xl font-bold mb-3"
            style={{ color: "var(--text)" }}
          >
            6. Erratas y correcciones
          </h2>
          <p className="text-base leading-relaxed">
            Si encontrás un error técnico, un código que no compila, una
            atribución incorrecta o un componente sustituido por algo que ya no
            existe, escribinos. Las correcciones quedan registradas en el git
            history del repo público{" "}
            <a
              href="https://github.com/PabloSilvaBravo/mechatronicstore-blog"
              className="underlink"
            >
              mechatronicstore-blog
            </a>
            .
          </p>
        </div>

        <p
          className="text-sm mt-12 pt-6 border-t"
          style={{
            color: "var(--text-dim)",
            borderColor: "var(--border-subtle)",
          }}
        >
          Última actualización: 21 de mayo de 2026.
        </p>
      </section>
    </article>
  );
}
