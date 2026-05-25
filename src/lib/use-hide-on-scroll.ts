"use client";
import { useEffect, useState, useRef } from "react";

/**
 * Hook que devuelve `true` cuando el usuario está scrolleando hacia abajo
 * y `false` cuando vuelve hacia arriba. Implementa:
 *
 * - rAF-throttle del listener scroll
 * - jump-protect: ignora deltas absurdos (>60px en <50ms — scroll-anchoring browser noise)
 * - cooldown 800ms entre flips para evitar oscilación
 * - hysteresis: needs downDelta=32 acumulados para ocultar, upDelta=16 para mostrar
 * - siempre visible si scrollY < threshold
 */
export function useHideOnScroll(opts?: {
  threshold?: number;
  downDelta?: number;
  upDelta?: number;
}) {
  const threshold = opts?.threshold ?? 200;
  const downDelta = opts?.downDelta ?? 32;
  const upDelta = opts?.upDelta ?? 16;
  const FLIP_COOLDOWN_MS = 800;
  const JUMP_PX = 60;
  const JUMP_MS = 50;

  const [hidden, setHidden] = useState(false);
  const anchorY = useRef(0);
  const anchorTime = useRef(0);
  const lastFlip = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const now = Date.now();
        const dy = y - anchorY.current;
        const dt = now - anchorTime.current;

        if (dt < JUMP_MS && Math.abs(dy) > JUMP_PX) {
          anchorY.current = y;
          anchorTime.current = now;
          ticking.current = false;
          return;
        }

        if (y < threshold) {
          if (hidden) {
            const inCooldown = now - lastFlip.current < FLIP_COOLDOWN_MS;
            if (!inCooldown) {
              setHidden(false);
              lastFlip.current = now;
            }
          }
          anchorY.current = y;
          anchorTime.current = now;
          ticking.current = false;
          return;
        }

        const inCooldown = now - lastFlip.current < FLIP_COOLDOWN_MS;
        if (inCooldown) {
          if ((hidden && dy > 0) || (!hidden && dy < 0)) {
            anchorY.current = y;
            anchorTime.current = now;
          }
          ticking.current = false;
          return;
        }

        if (!hidden && dy >= downDelta) {
          setHidden(true);
          lastFlip.current = now;
          anchorY.current = y;
          anchorTime.current = now;
        } else if (hidden && dy <= -upDelta) {
          setHidden(false);
          lastFlip.current = now;
          anchorY.current = y;
          anchorTime.current = now;
        } else if ((hidden && dy > 0) || (!hidden && dy < 0)) {
          anchorY.current = y;
          anchorTime.current = now;
        }

        ticking.current = false;
      });
    }

    anchorY.current = window.scrollY;
    anchorTime.current = Date.now();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hidden, threshold, downDelta, upDelta]);

  return hidden;
}
