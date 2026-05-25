"use client";
import { useEffect, useState } from "react";

const VISIT_KEY = "mechablog-push-visit";
const DISMISSED_KEY = "mechablog-push-dismissed-until";
const SUBSCRIBED_FLAG = "mechablog-push-subscribed";
const SHOW_AFTER_MS = 20000;
const SHOW_ON_VISIT_N = 3;

type Status = "idle" | "granted" | "denied" | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!vapidKey) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      localStorage.setItem(SUBSCRIBED_FLAG, "1");
      return;
    }
    if (Notification.permission === "denied") return;

    const dismissed = parseInt(localStorage.getItem(DISMISSED_KEY) || "0", 10);
    if (dismissed && Date.now() < dismissed) return;

    const visits = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < 2) return;
    if (visits >= SHOW_ON_VISIT_N) {
      setShow(true);
      return;
    }
    const t = setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [vapidKey]);

  async function ensureSubscription(): Promise<boolean> {
    if (!vapidKey) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
    });
    return res.ok;
  }

  async function onAccept() {
    if (Notification.permission === "default") {
      const r = await Notification.requestPermission();
      if (r !== "granted") {
        setStatus("denied");
        setTimeout(() => setShow(false), 1200);
        return;
      }
    }
    try {
      const ok = await ensureSubscription();
      if (ok) {
        localStorage.setItem(SUBSCRIBED_FLAG, "1");
        setStatus("granted");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setTimeout(() => setShow(false), 1500);
  }

  function onDismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 14 * 24 * 60 * 60 * 1000));
    setShow(false);
  }

  if (!show || !vapidKey) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0))] left-1/2 z-[95] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 lg:bottom-6 lg:left-6 lg:translate-x-0"
    >
      <div
        className="rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-overlay)",
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(96,23,177,0.15)" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ color: "var(--brand-purple-light)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <h3 style={{ fontFamily: "Georgia, serif", color: "var(--text)" }} className="text-base font-bold leading-tight">
            Avisame cuando salga un tutorial nuevo
          </h3>
        </div>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {status === "granted" ? "Listo, vas a recibir el aviso." :
           status === "denied" ? "Activá los permisos en Configuración si cambiás de idea." :
           status === "error" ? "Algo falló. Intentá más tarde." :
           "Te avisamos el tutorial más importante del día, una notificación max."}
        </p>
        {status === "idle" && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAccept}
              className="rounded-md px-3 py-1.5 text-xs font-bold"
              style={{
                backgroundColor: "var(--brand-purple)",
                color: "var(--text-on-purple)",
              }}
            >
              Activar alertas
            </button>
            <button
              onClick={onDismiss}
              className="rounded-md px-3 py-1.5 text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              En otro momento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
