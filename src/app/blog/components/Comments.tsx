"use client";
import { useEffect, useRef } from "react";

interface Props {
  slug: string;
}

/**
 * Giscus comentarios (GitHub Discussions backend).
 * Repo: PabloSilvaBravo/mechatronicstore-blog
 * Categoría: General (configurada 17-may-2026).
 */
const GISCUS_CONFIG = {
  repo: "PabloSilvaBravo/mechatronicstore-blog",
  repoId: "R_kgDOSfzoSg",
  category: "General",
  categoryId: "DIC_kwDOSfzoSs4C9Qk_",
};

export default function Comments({ slug }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current || !ref.current) return;
    mounted.current = true;

    if (GISCUS_CONFIG.repoId === "REPLACE_ME_REPO_ID") {
      ref.current.innerHTML = `
        <div style="padding:1rem;border:1px dashed var(--border);border-radius:.5rem;font-size:.875rem;color:var(--muted)">
          💬 Los comentarios estarán disponibles pronto.
          <small>(setup Giscus pendiente).</small>
        </div>
      `;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
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

  return (
    <section className="my-12 pt-8 border-t border-[color:var(--border)]">
      <h2 className="text-2xl font-bold mb-4">💬 Comentarios</h2>
      <div ref={ref} />
    </section>
  );
}
