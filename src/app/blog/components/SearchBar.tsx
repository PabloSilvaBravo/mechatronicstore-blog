"use client";

// Pablo 23-may-2026: bump comment to force Vercel deploy of v4 SearchBar
// refactor (commit 7f15561 was skipped when a docs-only commit landed
// right after it, Vercel only honored HEAD^→HEAD diff which only saw docs).

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSearchOverlay } from "./SearchOverlay";

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
  const overlay = useSearchOverlay();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [open, setOpen] = useState(false); // modal mobile
  const [dropdownOpen, setDropdownOpen] = useState(false); // dropdown desktop / dentro del modal
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Pablo 23-may-2026: removido useState `isMac` — el badge ⌘K/Ctrl K que
  // lo usaba se quitó al alinear con store (que no muestra ese hint).

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
  // Pablo 21-may-2026 (header alignment con store): el store de
  // mechatronicstore.cl usa una barra de búsqueda PÚRPURA SÓLIDA
  // (#6017b1) con texto blanco. Para que el usuario sienta que blog y
  // tienda son un solo sitio, replicamos ese estilo:
  //
  // Pablo 23-may-2026 v6 — REVERT del v5 (que estaba todo morado, mal)
  // y CORRECCIÓN del v4. Auditoría JS confirmó:
  //   - .asp_w (search bar visible del store): 477×32, bg rgb(209,234,255)
  //     = #d1eaff celeste muy claro, radius 12px, sin border externo
  //   - .promagnifier (botón lupa del store): 28×28 bg TRANSPARENT (no
  //     cuadrado morado/amarillo distinto), icono SVG fill #f9f9f9 gris
  //     claro. Sutilísimo, casi invisible.
  //
  // El v4 estaba bien en bg pero MAL en la lupa (cuadrado morado externo
  // — el store NO tiene cuadrado, la lupa está embebida en el mismo bg).
  // Esta versión arregla la lupa: bg transparent, color icon var(--text-muted)
  // (más oscuro que #f9f9f9 del store para que sea VISIBLE).
  //
  // v6 (corregido):
  //   - bg form: #d1eaff celeste muy claro (como .asp_w del store) ✓
  //   - border: ninguno (store no tiene border en .asp_w)
  //   - radius: 12px
  //   - height: 40px
  //   - text input: var(--text), placeholder var(--text-muted)
  //   - lupa: bg transparent, sin cuadrado distinto, icono morado visible
  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ maxWidth: "477px" }}
    >
      <form
        onSubmit={handleSubmit}
        className="group flex items-center transition-all overflow-hidden"
        style={{
          background: "#d1eaff",
          border: "none",
          borderRadius: "12px",
          height: "40px",
          paddingLeft: "16px",
          paddingRight: "8px",
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => {
            // Si el provider del overlay está montado, foco → overlay
            // (UX premium tipo Algolia/Linear). Si no, fallback al
            // dropdown inline (graceful degradation, comportamiento
            // original).
            if (overlay) {
              e.currentTarget.blur();
              overlay.setOpen(true);
              return;
            }
            if (results.length > 0) setDropdownOpen(true);
          }}
          onMouseDown={(e) => {
            // En desktop con overlay montado, evitamos el flash de foco
            // → blur → re-render del estilo "focus" del form. Abrimos
            // overlay direct desde mousedown.
            if (overlay) {
              e.preventDefault();
              overlay.setOpen(true);
            }
          }}
          placeholder="Buscar..."
          className="flex-1 text-sm outline-none bg-transparent search-input-store"
          style={{
            color: "var(--text)",
            border: "none",
            minWidth: 0,
            fontWeight: 500,
            marginRight: "8px",
          }}
          aria-label="Buscar tutoriales"
          autoComplete="off"
          readOnly={overlay !== null}
        />
        {/* Botón submit lupa — sin cuadrado externo (replica .promagnifier
            del store que es transparent). Icono morado para visibilidad
            sobre el bg celeste claro. */}
        <button
          type="submit"
          aria-label="Buscar"
          className="flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
          style={{
            width: "28px",
            height: "28px",
            background: "transparent",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            color: "var(--brand-purple)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
        </button>
      </form>
      {renderDropdown()}
    </div>
  );
}
