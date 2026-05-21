import Link from "next/link";
import type { Metadata } from "next";

const BASE_URL = "https://www.mechatronicstore.cl";

export const metadata: Metadata = {
  title: "Sobre el blog",
  description:
    "Blog MechatronicStore: cómo curamos, traducimos y adaptamos tutoriales de electrónica y mecatrónica al maker chileno.",
  alternates: { canonical: `${BASE_URL}/blog/sobre` },
  openGraph: {
    title: "Sobre el Blog MechatronicStore",
    description:
      "Cómo curamos, traducimos y adaptamos tutoriales para el maker chileno.",
    url: `${BASE_URL}/blog/sobre`,
    type: "website",
    siteName: "MechatronicStore Blog",
    locale: "es_CL",
  },
};

export default function SobrePage() {
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
        <span style={{ color: "var(--text-muted)" }}>Sobre</span>
      </nav>

      <header className="mb-10">
        <div
          className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
          style={{ color: "var(--brand-yellow)" }}
        >
          Sobre el blog
        </div>
        <h1
          className="font-headline mb-4 tracking-tight"
          style={{
            fontSize: "clamp(2rem, 1.5rem + 3vw, 3.25rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          <span className="h1-gradient-block">
            Electrónica explicada paso a paso
          </span>
        </h1>
        <p
          className="subtitle-mono with-caret mt-4"
          style={{ maxWidth: "60ch" }}
        >
          Lo que hacemos, cómo lo hacemos y por qué te sirve.
        </p>
      </header>

      <section className="space-y-6" style={{ color: "var(--text-muted)" }}>
        <p className="text-base leading-relaxed">
          El <strong style={{ color: "var(--text)" }}>Blog MechatronicStore</strong>{" "}
          es una vitrina educativa de proyectos de electrónica y mecatrónica,
          curada y traducida desde fuentes especializadas (Adafruit, Hackaday,
          Random Nerd Tutorials, Raspberry Tips, Electromaker, entre otras) y
          adaptada al contexto del maker chileno: componentes disponibles
          localmente, voltajes, materiales y precios en CLP.
        </p>

        <h2
          className="font-headline text-2xl font-bold mt-10 mb-3"
          style={{ color: "var(--text)" }}
        >
          Cómo curamos
        </h2>
        <p className="text-base leading-relaxed">
          Cada tutorial pasa por un pipeline editorial automatizado de cinco
          etapas:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-base">
          <li>
            <strong style={{ color: "var(--text)" }}>Ingest:</strong> recolectamos
            tutoriales de 42 fuentes RSS (Arduino, ESP32, Raspberry Pi,
            robótica, sensores, 3D).
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Hard filters:</strong>{" "}
            descartamos contenido off-topic (sistemas operativos, retro
            computing, fotografía analógica) y posts puramente promocionales.
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Editorial ranking:</strong>{" "}
            puntuamos cada candidato en 7 dimensiones (pedagogía, calidad de
            código, claridad de materiales, completitud, relevancia al catálogo,
            valor añadido, originalidad). Solo los que superan threshold pasan.
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>
              Traducción + re-angulación:
            </strong>{" "}
            la versión española no es traducción literal: re-angulamos
            mínimo 40% del texto, agregamos secciones de variantes, mejoras y
            personalización para Chile, e indexamos componentes del catálogo
            local cuando aplica.
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Publicación:</strong>{" "}
            cada tutorial publicado cita al autor original y enlaza la fuente.
            Ver{" "}
            <Link href="/blog/etica" className="underlink">
              política editorial
            </Link>
            .
          </li>
        </ol>

        <h2
          className="font-headline text-2xl font-bold mt-10 mb-3"
          style={{ color: "var(--text)" }}
        >
          Qué encontrás
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-base">
          <li>Proyectos con materiales listados (cantidades y roles)</li>
          <li>Pasos numerados con código copy-paste y bloques destacados</li>
          <li>Variantes, mejoras y consideraciones para Chile (voltajes, importación, alternativas locales)</li>
          <li>Links a componentes del catálogo cuando aplican</li>
          <li>Atribución a la fuente original (autor, link, fecha)</li>
        </ul>

        <h2
          className="font-headline text-2xl font-bold mt-10 mb-3"
          style={{ color: "var(--text)" }}
        >
          Mantenete al día
        </h2>
        <p className="text-base leading-relaxed">
          Suscribite al{" "}
          <Link href="/blog/feed.xml" className="underlink">
            feed RSS
          </Link>
          {" "}o esperá nuestro digest semanal por email — un resumen breve de
          los tutoriales más leídos cada lunes.
        </p>

        <p
          className="text-sm mt-12 pt-6 border-t"
          style={{
            color: "var(--text-dim)",
            borderColor: "var(--border-subtle)",
          }}
        >
          ¿Comentario, errata o sugerencia?{" "}
          <a
            href="https://www.mechatronicstore.cl/contacto"
            className="underlink"
          >
            Escribinos
          </a>
          .
        </p>
      </section>
    </article>
  );
}
