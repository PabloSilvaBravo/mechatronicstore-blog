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
  /** Threshold del observer — % visible para disparar (default 0, dispara
   *  apenas asome 1px). Pablo 22-may-2026: 0.15 era demasiado restrictivo
   *  para grids altos (3000px+ de "Más tutoriales") — pedía scrollear
   *  ~450px dentro del bloque antes de animar, daba sensación de lazy
   *  load roto. */
  threshold?: number;
  /** Margin del rootRect — positivo expande el root (preload antes de
   *  entrar al viewport), negativo lo contrae (dispara tarde). Default
   *  "0px 0px 240px 0px" = el observer considera el viewport 240px más
   *  abajo de lo real, así el bloque se anima cuando aún está 240px por
   *  debajo del fold — el usuario lo ve aparecer en la transición de
   *  scroll, no después. Pablo 22-may-2026: el default anterior
   *  "0px 0px -10% 0px" disparaba tarde. */
  rootMargin?: string;
  /** className extra (se mergea con `reveal-on-scroll`) */
  className?: string;
  /** Tag del wrapper (default "div") */
  as?: "div" | "section" | "article" | "ul" | "ol";
}

export default function RevealOnScroll({
  children,
  stagger = false,
  threshold = 0,
  rootMargin = "0px 0px 240px 0px",
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

    // Pablo 21-may-2026 fix: si el elemento YA está en viewport al mount
    // (típico en pages above-the-fold como /blog/tutoriales grid), mostrar
    // inmediatamente. Sin esto el grid quedaba con opacity:0 hasta que el
    // usuario scrolleaba, lo que parecía bug.
    const rect = el.getBoundingClientRect();
    const inViewport =
      rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) {
      // Pequeño rAF para que el browser pinte el estado inicial primero
      // y la transición se vea (no flash instantáneo).
      requestAnimationFrame(() => el.classList.add("is-visible"));
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
