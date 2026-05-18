"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * SearchBar — campo de búsqueda grande estilo mechatronicstore.cl.
 *
 * Pablo 18-may-2026: replica visual del search del store — campo full
 * width purple con icono lupa a la derecha. Submit hace GET a
 * /blog/tutoriales?q={query} (lista cronológica filtrada).
 *
 * Mantiene el query en sync con la URL para que el usuario pueda
 * editarlo y refrescar/compartir el link.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────┐
 *   │ Buscar tutoriales...                         🔍 │
 *   └─────────────────────────────────────────────────┘
 *
 * Variant compact para mobile (sin label visible, solo icono cuando
 * el viewport es chico).
 */
interface Props {
  /** Variante: "full" = campo expandido, "icon" = solo botón lupa que abre */
  variant?: "full" | "icon";
  className?: string;
}

export default function SearchBar({ variant = "full", className = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query con URL cuando cambia (back/forward, link share)
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // En variant icon: auto-focus al abrir
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length === 0) {
      router.push("/blog/tutoriales");
    } else {
      router.push(`/blog/tutoriales?q=${encodeURIComponent(q)}`);
    }
    setOpen(false);
  };

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buscar"
          className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-[color:var(--bg-hover)]"
          style={{ color: "var(--text)" }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
        </button>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setOpen(false)}
          >
            <form
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <div
                className="flex items-center rounded-lg overflow-hidden shadow-2xl"
                style={{ background: "var(--brand-purple)" }}
              >
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar tutoriales..."
                  className="flex-1 px-5 py-4 text-base font-medium outline-none placeholder:opacity-70"
                  style={{
                    background: "transparent",
                    color: "#fff",
                    border: "none",
                  }}
                />
                <button
                  type="submit"
                  className="px-5 py-4 transition-colors hover:bg-[color:var(--brand-purple-light)]"
                  aria-label="Buscar"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3-3" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  }

  // variant "full"
  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center rounded-lg overflow-hidden transition-shadow ${className}`}
      style={{
        background: "var(--brand-purple)",
        boxShadow: "0 2px 8px -2px color-mix(in srgb, var(--brand-purple) 35%, transparent)",
      }}
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar tutoriales..."
        className="flex-1 px-4 py-2.5 text-sm font-medium outline-none placeholder:opacity-70"
        style={{
          background: "transparent",
          color: "#fff",
          border: "none",
          minWidth: 0,
        }}
        aria-label="Buscar tutoriales"
      />
      <button
        type="submit"
        className="flex items-center justify-center px-4 py-2.5 transition-colors hover:bg-[color:var(--brand-purple-light)]"
        aria-label="Buscar"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </svg>
      </button>
    </form>
  );
}
