"use client";
import { useEffect, useState } from "react";

const VISITS_KEY = "mechablog-visits";
const DISMISSED_KEY = "mechablog-install-dismissed";
const VISITS_BEFORE_PROMPT = 3;

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BIPEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const t = setTimeout(() => {
      // El blog vive bajo /blog/* (Cloudflare Worker route).
      // SW + scope deben estar bajo /blog/ para que el worker los enrute.
      navigator.serviceWorker
        .register("/blog/sw.js", { scope: "/blog/" })
        .catch((err) => console.warn("[SW] register failed", err));
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    setIsIOS(iOS);

    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (installed) return;

    const visits = parseInt(localStorage.getItem(VISITS_KEY) || "0", 10) + 1;
    localStorage.setItem(VISITS_KEY, String(visits));
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    if (visits < VISITS_BEFORE_PROMPT) return;

    function onBIP(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BIPEvent);
      setShowPrompt(true);
    }
    window.addEventListener("beforeinstallprompt", onBIP);

    if (iOS) {
      const t = setTimeout(() => setShowPrompt(true), 1500);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBIP);
        clearTimeout(t);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  function onInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    });
  }

  function onDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div
      className="fixed inset-x-0 z-[120] mx-auto max-w-md px-4 animate-[fadeIn_0.4s_ease-out]"
      style={{ bottom: "calc(20px + env(safe-area-inset-bottom, 0))" }}
      role="dialog"
      aria-live="polite"
    >
      <div
        className="flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
        style={{
          borderColor: "var(--border-strong)",
          backgroundColor: "var(--bg-overlay)",
          boxShadow: "0 10px 40px rgba(96,23,177,0.3)",
        }}
      >
        <img src="/blog/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1">
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            Instalar MechaBlog
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {isIOS
              ? "Tocá compartir y luego \"Agregar a Pantalla de inicio\"."
              : "Acceso rápido a tutoriales sin abrir el navegador."}
          </p>
          <div className="mt-3 flex gap-2">
            {!isIOS && deferredPrompt && (
              <button
                onClick={onInstall}
                className="rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: "var(--brand-purple)",
                  color: "var(--text-on-purple)",
                }}
              >
                Instalar
              </button>
            )}
            <button
              onClick={onDismiss}
              className="rounded-md px-3 py-1.5 text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Cerrar"
          className="text-lg"
          style={{ color: "var(--text-dim)" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
