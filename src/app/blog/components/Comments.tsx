"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  slug: string;
}

/**
 * Comentarios via Giscus (GitHub Discussions backend).
 *
 * Pablo 25-may-2026 audit Fase D: la version anterior cargaba el script
 * de giscus.app aunque el repo no tiene la GitHub App de giscus instalada
 * todavia. El script devuelve 403 + el iframe muestra un error tecnico
 * VISIBLE al lector ("giscus is not installed on this repository").
 *
 * Fix: degradacion explicita. Si el bool GISCUS_ENABLED es false (o el
 * mount detecta error en el script), mostramos un placeholder amigable
 * en lugar del error tecnico.
 *
 * ----------------------------------------------------------------------
 * ESTADO actual (verificado 30-may-2026 con gh GraphQL):
 *   - repoId (R_kgDOSfzoSg): REAL. Coincide con repository.id del repo.
 *   - categoryId (DIC_kwDOSfzoSs4C9Qk_): REAL. Es la categoria "General"
 *     (slug "general") de las Discussions del repo.
 *   - Discussions: YA habilitado en el repo (hasDiscussionsEnabled=true).
 *   Los dos IDs ya estan cableados abajo. NO hace falta volver a buscarlos.
 *
 * LO UNICO que falta para encender los comentarios (1 paso de Pablo):
 *   1. Instalar la GitHub App de giscus en el repo:
 *      https://github.com/apps/giscus  ->  Install  ->  elegir
 *      "Only select repositories"  ->  PabloSilvaBravo/mechatronicstore-blog.
 *      (No se pudo verificar por API si ya esta instalada: el endpoint de
 *       installations exige auth de App, no de usuario. Si ya la instalaste,
 *       saltea este paso.)
 *   2. Cambiar GISCUS_ENABLED = true abajo y desplegar.
 *
 * Opcional, si queres re-confirmar o usar otra categoria, anda a
 * https://giscus.app, pega el repo PabloSilvaBravo/mechatronicstore-blog
 * y copia el repoId + categoryId que te muestre (deben coincidir con los
 * de abajo). Mapping = "Discussion title contains page pathname" no aplica
 * aca: usamos mapping "specific" con el slug del tutorial como termino.
 * ----------------------------------------------------------------------
 */
const GISCUS_ENABLED = true;
// IDs verificados reales el 30-may-2026 (gh api graphql contra el repo).
// Si Pablo quiere otra categoria, reemplazar category + categoryId por
// los valores de https://giscus.app (categorias disponibles: General,
// Announcements, Ideas, Q&A, Show and tell, Polls).
const GISCUS_CONFIG = {
  repo: "PabloSilvaBravo/mechatronicstore-blog",
  repoId: "R_kgDOSfzoSg",
  category: "General",
  categoryId: "DIC_kwDOSfzoSs4C9Qk_",
};

export default function Comments({ slug }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!GISCUS_ENABLED) return;
    if (mounted.current || !ref.current) return;
    mounted.current = true;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => setError(true);
    script.setAttribute("data-repo", GISCUS_CONFIG.repo);
    script.setAttribute("data-repo-id", GISCUS_CONFIG.repoId);
    script.setAttribute("data-category", GISCUS_CONFIG.category);
    script.setAttribute("data-category-id", GISCUS_CONFIG.categoryId);
    script.setAttribute("data-mapping", "specific");
    script.setAttribute("data-term", slug);
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", "preferred_color_scheme");
    script.setAttribute("data-lang", "es");
    script.setAttribute("data-loading", "lazy");

    ref.current.appendChild(script);
  }, [slug]);

  const showPlaceholder = !GISCUS_ENABLED || error;

  return (
    <section
      className="my-10 pt-6 border-t"
      style={{ borderColor: "var(--border)" }}
      aria-label="Comentarios"
    >
      <h2
        className="text-xl font-bold mb-3"
        style={{ color: "var(--text)" }}
      >
        Comentarios
      </h2>
      {showPlaceholder ? (
        <div
          className="rounded-lg border p-5"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-muted)",
          }}
        >
          <p className="text-sm leading-relaxed mb-1">
            Estamos preparando los comentarios. Vuelve pronto.
          </p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            Mientras tanto, escribinos a{" "}
            <a
              href="mailto:ventas@mechatronicstore.cl"
              className="underline"
              style={{ color: "var(--text-accent)" }}
            >
              ventas@mechatronicstore.cl
            </a>{" "}
            con dudas del tutorial.
          </p>
        </div>
      ) : (
        <div ref={ref} />
      )}
    </section>
  );
}
