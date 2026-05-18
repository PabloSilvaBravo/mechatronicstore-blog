"use client";

import { useEffect, useState } from "react";

/**
 * BackToTop — botón FAB flotante en bottom-right que aparece tras
 * scrollear ~600px y vuelve al top con scroll smooth.
 *
 * Pablo 18-may-2026 (Pack D audit luisllamas): los tutoriales son
 * largos. Sin atajo para volver arriba el usuario tiene que
 * scrollear manual o usar Cmd+Up. El FAB lo resuelve en 1 click.
 *
 * Inspirado en el #back-to-top de luisllamas:
 *   - Aparece cuando body[data-pos="bottom"]
 *   - bottom: 2rem, right: 2rem
 *   - circular 48x48
 *   - bg accent color
 *   - transition: all 0.2s
 *
 * Adaptado: usamos useState + scroll listener throttled con rAF.
 * Brand: gradient purple→yellow para que matchee el reading-progress
 * bar.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 600);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTop = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      type="button"
      onClick={goTop}
      aria-label="Volver arriba"
      className="fixed z-40 inline-flex items-center justify-center transition-all"
      style={{
        right: "1.5rem",
        bottom: visible ? "1.5rem" : "-4rem",
        width: "48px",
        height: "48px",
        borderRadius: "9999px",
        background: "var(--gradient-brand)",
        color: "var(--text-on-purple)",
        boxShadow:
          "0 10px 30px -8px color-mix(in srgb, var(--brand-purple) 60%, transparent), 0 4px 12px -2px var(--shadow-color)",
        border: "0",
        transitionDuration: "0.3s",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
