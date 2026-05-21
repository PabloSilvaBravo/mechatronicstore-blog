"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * SearchOverlay — fullscreen command-palette estilo Algolia DocSearch /
 * Linear / Stripe. Se abre con Cmd+K (Mac) o Ctrl+K (otros) o
 * programáticamente vía useSearchOverlay().
 *
 * Pablo 21-may-2026 (Tier A blog): además del SearchBar inline del
 * header, agregamos esta capa premium tipo command palette. La
 * arquitectura es additive — el inline dropdown de SearchBar.tsx
 * sigue funcionando si el provider no está mountado (graceful
 * degradation). Cuando el provider sí está mountado, el variant="full"
 * de SearchBar fuerza foco → overlay para que el UX se sienta
 * consistente.
 *
 * Reusa el mismo endpoint que SearchBar (/api/blog/search?q=) con
 * 300ms debounce, cap 8 resultados. No modifica el endpoint.
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

// ─── Context ────────────────────────────────────────────────────
interface SearchOverlayContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  /** True si el provider está montado — el SearchBar usa esto para
   *  decidir si focus → overlay o seguir con el dropdown inline. */
  isProviderMounted: true;
}

const SearchOverlayContext = createContext<SearchOverlayContextValue | null>(
  null,
);

/**
 * Hook para abrir/cerrar el overlay desde cualquier componente client
 * dentro del provider. Retorna null si el provider NO está montado —
 * los consumidores deben hacer fallback al comportamiento previo
 * (e.g. SearchBar muestra su dropdown inline).
 */
export function useSearchOverlay(): SearchOverlayContextValue | null {
  return useContext(SearchOverlayContext);
}

// ─── Provider ───────────────────────────────────────────────────
interface ProviderProps {
  children: ReactNode;
}

export function SearchOverlayProvider({ children }: ProviderProps) {
  const [open, setOpen] = useState(false);

  // Cmd+K / Ctrl+K global handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Match en ambos: Mac (metaKey) y otros (ctrlKey).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<SearchOverlayContextValue>(
    () => ({ open, setOpen, isProviderMounted: true }),
    [open],
  );

  return (
    <SearchOverlayContext.Provider value={value}>
      {children}
      {open ? <SearchOverlayDialog onClose={() => setOpen(false)} /> : null}
    </SearchOverlayContext.Provider>
  );
}

// ─── Dialog (separado para que solo monte cuando open=true) ────
interface DialogProps {
  onClose: () => void;
}

function SearchOverlayDialog({ onClose }: DialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Auto-focus al abrir.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Lock scroll del body mientras está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Live fetch con debounce 300ms (mismo patrón que SearchBar).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setActiveIdx(0);
      return;
    }
    setLoading(true);
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/blog/search?q=${encodeURIComponent(q)}`,
          { signal: ac.signal },
        );
        if (!res.ok) throw new Error("search failed");
        const data: { results: SearchResult[] } = await res.json();
        setResults(data.results || []);
        setActiveIdx(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [query]);

  // Keyboard navigation: Esc cierra, ↑↓ navegan, Enter abre, Tab
  // trampea foco dentro del modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (results.length === 0) return;
        setActiveIdx((idx) => (idx + 1) % results.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (results.length === 0) return;
        setActiveIdx((idx) => (idx - 1 + results.length) % results.length);
        return;
      }
      if (e.key === "Enter") {
        // Enter dentro del input (no en links): si hay resultado activo
        // navegamos a el; si no, vamos a /blog/tutoriales?q=
        if (results.length > 0 && document.activeElement === inputRef.current) {
          e.preventDefault();
          const hit = results[activeIdx];
          if (hit) {
            onClose();
            router.push(`/blog/${hit.slug}`);
          }
        } else if (
          results.length === 0 &&
          query.trim().length > 0 &&
          document.activeElement === inputRef.current
        ) {
          e.preventDefault();
          onClose();
          router.push(`/blog/tutoriales?q=${encodeURIComponent(query.trim())}`);
        }
        return;
      }
      if (e.key === "Tab") {
        // Focus trap: solo input + 2 buttons potencialmente focusables.
        // Como el list es navegable por arrow keys, mantenemos foco en
        // input siempre.
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, activeIdx, onClose, router, query]);

  // Scroll del item activo into view.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleResultClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSeeAll = useCallback(() => {
    const q = query.trim();
    onClose();
    if (q.length > 0) {
      router.push(`/blog/tutoriales?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/blog/tutoriales");
    }
  }, [query, router, onClose]);

  const showEmpty =
    !loading && query.trim().length >= 2 && results.length === 0;
  const showInitial = query.trim().length < 2;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar tutoriales"
      className="fixed inset-0 z-[100] flex items-start justify-center px-3 sm:px-4"
      style={{
        // Top offset ~15vh en desktop, más cerca del top en mobile.
        paddingTop: "max(8vh, 32px)",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        // Click en el backdrop (no en el dialog interior) cierra.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[640px] rounded-[14px] overflow-hidden flex flex-col"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px -12px rgba(0, 0, 0, 0.45)",
          maxHeight: "min(640px, 80vh)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Input row ────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            height: "56px",
          }}
        >
          <svg
            width="18"
            height="18"
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
          <label htmlFor="search-overlay-input" className="sr-only">
            Buscar tutoriales
          </label>
          <input
            ref={inputRef}
            id="search-overlay-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tutoriales, ej. ESP32, Arduino…"
            className="flex-1 text-[15px] outline-none bg-transparent placeholder:opacity-70"
            style={{
              color: "var(--text)",
              border: "none",
              minWidth: 0,
              fontWeight: 500,
            }}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls="search-overlay-list"
            aria-activedescendant={
              results.length > 0 ? `search-overlay-item-${activeIdx}` : undefined
            }
          />
          <kbd
            className="inline-flex items-center justify-center text-[10px] font-bold tabular-nums"
            aria-hidden
            style={{
              color: "var(--text-dim)",
              background: "var(--bg)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "5px",
              padding: "3px 7px",
              minWidth: "28px",
              height: "22px",
              letterSpacing: "0.04em",
            }}
          >
            esc
          </kbd>
        </div>

        {/* ── Body ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div
              className="px-4 py-8 text-sm flex items-center gap-2"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                aria-hidden
                style={{ animation: "spin 0.9s linear infinite" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>Buscando…</span>
            </div>
          ) : showInitial ? (
            <div
              className="px-4 py-8 text-sm text-center"
              style={{ color: "var(--text-muted)" }}
            >
              <div className="mb-2">
                Empezá a escribir para buscar tutoriales.
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                Mínimo 2 caracteres. Probá con{" "}
                <span style={{ color: "var(--text-accent)" }}>ESP32</span>,{" "}
                <span style={{ color: "var(--text-accent)" }}>
                  HC-SR04
                </span>{" "}
                o{" "}
                <span style={{ color: "var(--text-accent)" }}>
                  servo
                </span>
                .
              </div>
            </div>
          ) : showEmpty ? (
            <div
              className="px-4 py-8 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              <div className="mb-2">
                Sin resultados para{" "}
                <strong style={{ color: "var(--text)" }}>
                  &quot;{query.trim()}&quot;
                </strong>
                .
              </div>
              <Link
                href="/blog/tutoriales"
                onClick={onClose}
                className="text-xs underlink"
                style={{ color: "var(--text-accent)" }}
              >
                Ver todos los tutoriales →
              </Link>
            </div>
          ) : (
            <>
              <div
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{
                  color: "var(--text-dim)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                {results.length}{" "}
                {results.length === 1 ? "resultado" : "resultados"}
              </div>
              <ul
                ref={listRef}
                id="search-overlay-list"
                role="listbox"
                className="py-1"
              >
                {results.map((r, idx) => {
                  const isActive = idx === activeIdx;
                  return (
                    <li key={r.slug} data-idx={idx}>
                      <Link
                        id={`search-overlay-item-${idx}`}
                        href={`/blog/${r.slug}`}
                        onClick={handleResultClick}
                        onMouseEnter={() => setActiveIdx(idx)}
                        role="option"
                        aria-selected={isActive}
                        className="flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-md transition-colors"
                        style={{
                          background: isActive
                            ? "var(--bg-hover)"
                            : "transparent",
                        }}
                      >
                        {r.hero_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.hero_image_url}
                            alt=""
                            className="w-12 h-12 object-cover rounded flex-shrink-0"
                            style={{
                              border: "1px solid var(--border-subtle)",
                            }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded flex-shrink-0"
                            style={{ background: "var(--bg-hover)" }}
                            aria-hidden
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {r.category ? (
                            <div
                              className="text-[9px] font-bold uppercase tracking-[0.12em] mb-0.5"
                              style={{ color: "var(--text-accent)" }}
                            >
                              {CATEGORY_LABELS[r.category] || r.category}
                            </div>
                          ) : null}
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
                        {/* Glyph enter cuando activo */}
                        {isActive ? (
                          <kbd
                            className="hidden sm:inline-flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            aria-hidden
                            style={{
                              color: "var(--text-dim)",
                              background: "var(--bg)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "5px",
                              padding: "2px 6px",
                              minWidth: "22px",
                              height: "20px",
                            }}
                          >
                            ↵
                          </kbd>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* ── Footer hints ─────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-2.5 text-[11px]"
          style={{
            color: "var(--text-dim)",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg)",
          }}
        >
          <div className="hidden sm:flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd
                className="inline-flex items-center justify-center font-bold"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  padding: "1px 5px",
                  minWidth: "18px",
                  height: "18px",
                  fontSize: "10px",
                }}
                aria-label="Flecha arriba"
              >
                ↑
              </kbd>
              <kbd
                className="inline-flex items-center justify-center font-bold"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  padding: "1px 5px",
                  minWidth: "18px",
                  height: "18px",
                  fontSize: "10px",
                }}
                aria-label="Flecha abajo"
              >
                ↓
              </kbd>
              <span>navegar</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd
                className="inline-flex items-center justify-center font-bold"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  padding: "1px 5px",
                  minWidth: "18px",
                  height: "18px",
                  fontSize: "10px",
                }}
                aria-label="Enter"
              >
                ↵
              </kbd>
              <span>abrir</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd
                className="inline-flex items-center justify-center font-bold"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  padding: "1px 5px",
                  minWidth: "20px",
                  height: "18px",
                  fontSize: "10px",
                }}
                aria-label="Escape"
              >
                esc
              </kbd>
              <span>cerrar</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSeeAll}
            className="font-medium underlink ml-auto"
            style={{ color: "var(--text-accent)" }}
          >
            {query.trim().length >= 2
              ? "Ver todos los resultados →"
              : "Ver todos los tutoriales →"}
          </button>
        </div>
      </div>

      {/* Spinner keyframes inline. Tailwind v4 no nos da animate-spin
          dependible aquí porque el style="" hace inline — usamos un
          @keyframes local para que sea autocontenido. */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
