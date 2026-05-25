"use client";
import { useEffect, useRef, useState } from "react";

const TRIGGER_PX = 72;
const MAX_PX = 120;

type State = "idle" | "pulling" | "refreshing";

export default function PullToRefresh() {
  const [state, setState] = useState<State>("idle");
  const [pullPx, setPullPx] = useState(0);
  const startY = useRef(0);
  const startedAtTop = useRef(false);
  const triggeredHaptic = useRef(false);

  useEffect(() => {
    const hasTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (!hasTouch) return;

    function onTouchStart(e: TouchEvent) {
      if (state !== "idle") return;
      if ((document.scrollingElement?.scrollTop ?? window.scrollY) > 0) {
        startedAtTop.current = false;
        return;
      }
      startedAtTop.current = true;
      startY.current = e.touches[0].clientY;
      triggeredHaptic.current = false;
    }
    function onTouchMove(e: TouchEvent) {
      if (!startedAtTop.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        if (state !== "idle") setState("idle");
        setPullPx(0);
        return;
      }
      e.preventDefault();
      const eased = Math.min(MAX_PX, delta * 0.5);
      setPullPx(eased);
      if (state !== "pulling") setState("pulling");
      if (eased >= TRIGGER_PX && !triggeredHaptic.current) {
        triggeredHaptic.current = true;
        if ("vibrate" in navigator) navigator.vibrate(15);
      } else if (eased < TRIGGER_PX) {
        triggeredHaptic.current = false;
      }
    }
    function onTouchEnd() {
      if (!startedAtTop.current) {
        startedAtTop.current = false;
        return;
      }
      startedAtTop.current = false;
      if (state === "pulling" && pullPx >= TRIGGER_PX) {
        setState("refreshing");
        if ("vibrate" in navigator) navigator.vibrate([12, 40, 12]);
        setTimeout(() => window.location.reload(), 380);
      } else {
        setState("idle");
        setPullPx(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [state, pullPx]);

  if (state === "idle") return null;

  const progress = Math.min(1, pullPx / TRIGGER_PX);
  const rotation = progress * 360;
  const opacity = Math.min(1, progress + 0.2);
  const scale = 0.7 + progress * 0.3;

  return (
    <div
      className="ptr-indicator"
      data-state={state}
      style={{
        transform:
          state === "refreshing"
            ? "translate(-50%, 20%) scale(1)"
            : `translate(-50%, ${pullPx - 56}px) scale(${scale})`,
        opacity,
      }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--brand-purple)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        {state === "refreshing" ? (
          <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        ) : (
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.4}
            stroke="currentColor"
            style={{ transform: `rotate(${rotation}deg)`, transition: "transform 80ms linear" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12a7 7 0 11-2.05-4.95L19 9M19 4v5h-5" />
          </svg>
        )}
      </div>
    </div>
  );
}
