"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * SearchBar — campo de búsqueda con LIVE RESULTS estilo Algolia / Stripe.
 *
 * Pablo 18-may-2026 v3: agregamos dropdown con resultados live a medida
 * que el usuario escribe. Debounce 300ms para evitar spam de fetches.
 *
 * Comportamiento:
 *   1. Usuario tipea > = 2 caracteres en el input
 *   2. Tras 300ms sin tipear, fetch a /api/blog/search?q={q}
 *   3. Resultados (max 8) aparecen en dropdown debajo del campo
 *   4. Click en resultado → navega al tutorial
 *   5. Enter o click 🔍 → va a /blog/tutoriales?q={q} (resultados completos)
 *   6. Escape → cierra dropdown
 *   7. Click fuera → cierra dropdown
 *
 * Variants:
 *   - "full": campo expandido para desktop (en main bar)
 *   - "icon":  botón lupa que abre modal fullscreen para mobile
 */

interface SearchResult {
  slug: string;
  title_es: string;
  subtitle_es: string;
  hero_image_url: string | null;
  category: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  arduino: "Arduino",
  esp32: "ESP32",
  rpi: "Raspberry Pi",
  robotica: "Robótica",
  sensores: "Sensores",
  "3d": "Impresión 3D",
  otros: "Otros",
};

interface Props {
  variant?: "full" | "icon";
  className?: string;
}

export default function SearchBar({ variant = "full", className = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [open, setOpen] = useState(false); // modal mobile
  const [dropdownOpen, setDropdownOpen] = useState(false); // dropdown desktop / dentro del modal
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync query con URL (back/forward, link share)
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Live fetch con debounce 300ms
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/blog/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        setResults(data.results || []);
        setDropdownOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Click-outside para cerrar dropdown (solo desktop)
  useEffect(() => {
    if (!dropdownOpen || variant === "icon") return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [dropdownOpen, variant]);

  // Auto-focus al abrir modal mobile
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setDropdownOpen(false);
    setOpen(false);
    if (q.length === 0) {
      router.push("/blog/tutoriales");
    } else {
      router.push(`/blog/tutoriales?q=${encodeURIComponent(q)}`);
    }
  };

  const handleResultClick = () => {
    setDropdownOpen(false);
    setOpen(false);
  };

  // Dropdown UI shared (used in both variant full and icon modal)
  const renderDropdown = () => {
    if (!dropdownOpen) return null;
    if (loading && results.length === 0) {
      return (
        <div
          className="absolute left-0 right-0 mt-2 rounded-lg border shadow-2xl z-50 p-4 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-muted)",
          }}
        >
          Buscando…
        </div>
      );
    }
    if (results.length === 0) {
      return (
        <div
          className="absolute left-0 right-0 mt-2 rounded-lg border shadow-2xl z-50 p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-elevated)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Sin resultados para <strong style={{ color: "var(--text)" }}>&quot;{query}&quot;</strong>.
          </p>
        </div>
      );
    }
    return (
      <div
        className="absolute left-0 right-0 mt-2 rounded-lg border shadow-2xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-elevated)",
          boxShadow: "0 12px 40px var(--shadow-color)",
        }}
      >
        <div
          className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] border-b"
          style={{
            color: "var(--text-dim)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {results.length} {results.length === 1 ? "resultado" : "resultados"}
        </div>
        <ul>
          {results.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/blog/${r.slug}`}
                onClick={handleResultClick}
                className="accent-bar flex items-center gap-3 px-3 py-2.5 mx-1 my-1 rounded-md transition-colors hover:bg-[color:var(--bg-hover)]"
              >
                {r.hero_image_url ? (
                  <img
                    src={r.hero_image_url}
                    alt=""
                    className="w-12 h-12 object-cover rounded flex-shrink-0 border"
                    style={{ borderColor: "var(--border-subtle)" }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded flex-shrink-0"
                    style={{ background: "var(--bg-hover)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {r.category && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: "var(--text-accent)" }}
                      >
                        {CATEGORY_LABELS[r.category] || r.category}
                      </span>
                    )}
                  </div>
                  <div
                    className="font-semibold text-sm leading-snug line-clamp-1"
                    style={{ color: "var(--text)" }}
                  >
                    {r.title_es}
                  </div>
                  <div
                    className="text-xs line-clamp-1 mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {r.subtitle_es}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <div
          className="border-t px-3 py-2"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <button
            type="button"
            onClick={() => {
              router.push(`/blog/tutoriales?q=${encodeURIComponent(query)}`);
              setDropdownOpen(false);
              setOpen(false);
            }}
            className="text-xs font-medium underlink"
            style={{ color: "var(--text-accent)" }}
          >
            Ver todos los resultados →
          </button>
        </div>
      </div>
    );
  };

  // ─── variant "icon" (mobile modal) ─────────────────────────
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
            <div
              className="relative w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSubmit}>
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3-3" />
                    </svg>
                  </button>
                </div>
              </form>
              {renderDropdown()}
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── variant "full" (desktop) ──────────────────────────────
  // Pablo 21-may-2026: rediseño estética — pasamos de bloque sólido púrpura
  // (672px x 43px) a estilo Stripe/Linear/Algolia DocSearch:
  //   - fondo neutro elevado (var(--bg-elevated)) + borde sutil
  //   - lupa a la izquierda en gris muted (no botón fucsia a la derecha)
  //   - foco con ring púrpura + leve glow (sin manchar la barra entera)
  //   - hint "/" o "⌘K" a la derecha (look-and-feel app moderna)
  //   - radio 10px alineado con cards
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form
        onSubmit={handleSubmit}
        className={`group flex items-center gap-2.5 px-3.5 transition-all ${
          dropdownOpen || query ? "search-bar-focus" : ""
        }`}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          height: "42px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{ color: "var(--text-dim)", flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setDropdownOpen(true);
          }}
          placeholder="Buscar tutoriales, ej. ESP32, Arduino…"
          className="flex-1 text-sm outline-none bg-transparent placeholder:opacity-70"
          style={{
            color: "var(--text)",
            border: "none",
            minWidth: 0,
            fontWeight: 500,
          }}
          aria-label="Buscar tutoriales"
          autoComplete="off"
        />
        {/* Hint visual (escondido en pantallas chicas para no apretar) */}
        <kbd
          className="hidden md:inline-flex items-center justify-center text-[10px] font-bold tabular-nums"
          aria-hidden
          style={{
            color: "var(--text-dim)",
            background: "var(--bg)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "5px",
            padding: "2px 6px",
            minWidth: "22px",
            height: "20px",
            letterSpacing: "0.04em",
          }}
        >
          ↵
        </kbd>
        {/* Botón submit invisible (Enter en input lo dispara igual; mantenemos
            type=submit para form semantics + accessibility) */}
        <button
          type="submit"
          aria-label="Buscar"
          className="sr-only"
        >
          Buscar
        </button>
      </form>
      {renderDropdown()}
    </div>
  );
}
