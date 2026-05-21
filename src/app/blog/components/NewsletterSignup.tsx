"use client";

import { useState, type FormEvent } from "react";

// Pablo 21-may-2026 Tier A: signup para el weekly digest (Routine F).
// Email se guarda en tabla newsletter_subscribers de Turso. Resend lo
// usa los lunes a las 11:30 UTC para mandar el digest semanal.
export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/blog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "No pudimos completar la suscripción");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMsg("Error de red, intentá de nuevo");
    }
  };

  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color: "var(--text-dim)" }}
      >
        Digest semanal
      </div>
      <p
        className="text-xs leading-relaxed mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        Tutoriales más leídos cada lunes. Sin spam, podés desuscribirte cuando quieras.
      </p>
      {status === "success" ? (
        <div
          className="text-sm py-2 px-3 rounded-md"
          style={{
            color: "var(--brand-purple)",
            background: "color-mix(in srgb, var(--brand-purple) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--brand-purple) 25%, transparent)",
          }}
        >
          ✓ Gracias. Recibirás el próximo lunes.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.cl"
            required
            disabled={status === "loading"}
            className="flex-1 text-sm outline-none px-3 py-2 rounded-md transition-colors"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text)",
            }}
            aria-label="Tu email"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            style={{
              background: "var(--brand-purple)",
              color: "#fff",
            }}
          >
            {status === "loading" ? "..." : "Suscribirme"}
          </button>
        </form>
      )}
      {status === "error" && (
        <p
          className="text-xs mt-2"
          style={{ color: "var(--text-accent)" }}
          role="alert"
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}
