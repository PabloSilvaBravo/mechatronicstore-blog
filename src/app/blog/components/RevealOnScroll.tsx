"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * RevealOnScroll — wrapper que aplica `.is-visible` cuando el elemento
 * entra al viewport. Usa IntersectionObserver para no animar en cada
 * scroll (one-shot reveal).
 *
 * Pablo 18-may-2026: agregado en el audit "luisllamas style". Los
 * sitios pro animan secciones a medida que aparecen — da sensación
 * de pulido sin distraer.
 *
 * Uso:
 *   <RevealOnScroll>
 *     <section>contenido</section>
 *   </RevealOnScroll>
 *
 * O con stagger (delay automático entre hijos):
 *   <RevealOnScroll stagger>
 *     <Card1 /> <Card2 /> <Card3 />
 *   </RevealOnScroll>
 *
 * Si el usuario tiene prefers-reduced-motion, el CSS desactiva la
 * animación pero el elemento queda visible (opacity:1, no transform).
 */
interface Props {
  children: ReactNode;
  /** Si true, los hijos directos reciben transition-delay escalonado */
  stagger?: boolean;
  /** Threshold del observer — % visible para disparar (default 0.15) */
  threshold?: number;
  /** Margin del rootRect — útil para disparar antes (default "0px 0px -10% 0px") */
  rootMargin?: string;
  /** className extra (se mergea con `reveal-on-scroll`) */
  className?: string;
  /** Tag del wrapper (default "div") */
  as?: "div" | "section" | "article" | "ul" | "ol";
}

export default function RevealOnScroll({
  children,
  stagger = false,
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
  className = "",
  as = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Si reduce-motion → mostrar de una sin animar
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // one-shot
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const cls = `reveal-on-scroll ${stagger ? "stagger-children" : ""} ${className}`.trim();
  const Tag = as;

  // @ts-expect-error — TS no resuelve dinámico <Tag>
  return <Tag ref={ref} className={cls}>{children}</Tag>;
}
