"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import Logo from "../../components/Logo";
import SearchBar from "./SearchBar";
import HeaderActions from "./HeaderActions";
import CategoryIcon from "./CategoryIcon";

/**
 * Placeholder visual de SearchBar mientras Suspense resuelve. Mismo
 * tamaño que el campo real para evitar layout shift.
 *
 * Pablo 21-may-2026 (header alignment con store): la barra real es
 * h=38px bg púrpura sólido radius 6px max 477px. El fallback replica
 * esas dimensiones para evitar layout shift.
 */
function SearchBarFallback({ variant }: { variant: "full" | "icon" }) {
  if (variant === "icon") {
    return (
      <div
        className="w-10 h-10 rounded-lg"
        style={{ background: "var(--bg-hover)" }}
        aria-hidden
      />
    );
  }
  return (
    <div
      style={{
        background: "#d1eaff",
        border: "1px solid var(--border-subtle)",
        height: "40px",
        borderRadius: "12px",
        maxWidth: "477px",
      }}
      aria-hidden
    />
  );
}

/**
 * ShippingTriggerStub — réplica visual del trigger "Enviar a / Elegir
 * ubicación" del store (li.header-shipping-trigger). En el blog NO
 * tenemos checkout ni cart con shipping, así que es decorativo y
 * linkea al store home. Pablo 23-may-2026 paridad header.
 *
 * Visualmente match con store:
 *   - pin SVG morado a la izquierda
 *   - "Enviar a" 10px gris dim arriba
 *   - "Elegir ubicación" 13px texto principal abajo
 *   - hidden en mobile (queda en mobile drawer)
 */
function ShippingTriggerStub() {
  return (
    <a
      href="https://www.mechatronicstore.cl/?utm_source=blog&utm_medium=header&utm_campaign=shipping"
      className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity"
      title="Cambiar ubicación de envío"
      aria-label="Cambiar ubicación de envío"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--brand-purple)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          Enviar a
        </span>
        <span
          className="text-[13px] font-bold"
          style={{ color: "var(--text)" }}
        >
          Elegir ubicación
        </span>
      </span>
    </a>
  );
}

/**
 * Categorías del blog — definición compartida con descripción corta
 * para el mega menú (Pablo 18-may-2026 Fase 2 header). El icono
 * dinámico viene del componente CategoryIcon (SVG outline).
 */
const CATEGORIES = [
  {
    slug: "arduino",
    label: "Arduino",
    description: "Placas, kits y proyectos clásicos",
    icon: "🔌", // mobile menu fallback
  },
  {
    slug: "esp32",
    label: "ESP32",
    description: "WiFi, Bluetooth y proyectos IoT",
    icon: "📡",
  },
  {
    slug: "rpi",
    label: "Raspberry Pi",
    description: "SBCs, Pico y proyectos avanzados",
    icon: "🍓",
  },
  {
    slug: "robotica",
    label: "Robótica",
    description: "Motores, drivers y autonomía",
    icon: "🤖",
  },
  {
    slug: "sensores",
    label: "Sensores",
    description: "Temperatura, distancia, movimiento",
    icon: "📊",
  },
  {
    slug: "3d",
    label: "Impresión 3D",
    description: "Filamentos, slicer y piezas",
    icon: "🖨️",
  },
  {
    slug: "otros",
    label: "Otros",
    description: "Herramientas y proyectos varios",
    icon: "⚙️",
  },
];

interface BlogHeaderProps {
  /** Conteo de tutoriales publicados por categoría — viene del server
   *  via blog/layout.tsx. Default empty object si la DB falla. */
  categoryCounts?: Record<string, number>;
}

/**
 * BlogHeader v3 — harmonizado con mechatronicstore.cl (Pablo 18-may-2026).
 *
 * Reestructurado a 3 filas EXACTAS como el store, para que el usuario
 * sienta que blog y tienda son un solo sitio:
 *
 *   Row 1: UtilityBar (montado afuera en layout, sticky top)
 *   Row 2: Main bar — Logo · SearchBar · HeaderActions · Theme · Burger
 *   Row 3: Nav menu — Inicio · Tutoriales · Categorías ▼ · Mecha Noticias ↗ · Tienda ↗
 *
 * Mobile: search collapsa a icono, nav se vuelve hamburger.
 *
 * El UtilityBar (envío gratis) está montado en layout.tsx fuera del
 * BlogHeader para que se mantenga arriba aunque el header sticky
 * cambie de comportamiento.
 */
export default function BlogHeader({ categoryCounts = {} }: BlogHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  // Total de tutoriales (suma de todas las categorías) — para el
  // header del mega menú.
  const totalTutorials = Object.values(categoryCounts).reduce(
    (s, n) => s + n,
    0,
  );

  // Click-outside para cerrar dropdown
  useEffect(() => {
    if (!catsOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setCatsOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCatsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [catsOpen]);

  // Cerrar mobile menu al cambiar de ruta
  useEffect(() => {
    const close = () => setMobileOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        backgroundColor: "var(--bg-overlay)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* ─── Row 2: Main bar ──────────────────────────────────────
          Layout horizontal: [Logo] [SearchBar grows] [Actions]
          Replica el main bar del store. */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-5 py-3">
          {/* Logo */}
          <Link
            href="/blog"
            className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0"
            aria-label="Blog MechatronicStore"
          >
            <Logo size="md" />
          </Link>

          {/* Search bar — grande, ocupa espacio disponible.
              Desktop: variant full (campo expandido).
              Mobile: variant icon (botón lupa que abre modal).
              Suspense porque SearchBar usa useSearchParams (client-only)
              y Next.js 16 exige boundary explícito en static prerender. */}
          <div className="hidden md:block flex-1 max-w-2xl">
            <Suspense fallback={<SearchBarFallback variant="full" />}>
              <SearchBar variant="full" />
            </Suspense>
          </div>
          <div className="md:hidden flex-1" />

          {/* Right cluster: search icon en mobile + actions + theme + burger */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="md:hidden">
              <Suspense fallback={<SearchBarFallback variant="icon" />}>
                <SearchBar variant="icon" />
              </Suspense>
            </div>
            <HeaderActions />
            {/* Pablo 23-may-2026 paridad header con store: el store NO
                tiene ThemeToggle aquí — tiene "Enviar a / Elegir ubicación".
                Para mantener paridad visual, reemplazamos. El blog ya
                respeta prefers-color-scheme del OS (CSS vars). Si Pablo
                quiere el toggle de vuelta, está en el mobile drawer. */}
            <ShippingTriggerStub />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
              style={{
                backgroundColor: mobileOpen ? "var(--bg-hover)" : "transparent",
                color: "var(--text)",
              }}
              aria-label="Menú"
              aria-expanded={mobileOpen}
            >
              <svg
                className="h-5 w-5 transition-transform"
                style={{ transform: mobileOpen ? "rotate(90deg)" : "none" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Row 3: Nav menu ─────────────────────────────────────
          Desktop only. Replica el nav menu del store: items
          horizontales con dropdowns sobre un FONDO GRIS CLARO
          (#f1f1f1 light / #1a1b22 dark) — match exacto con la nav
          row del header del store mechatronicstore.cl. Pablo 21-may-2026
          (header alignment). */}
      <div
        className="hidden md:block border-t"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--nav-row-bg)",
        }}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6">
          <ul className="flex items-center gap-6 text-xs font-bold uppercase tracking-[0.08em] py-2.5">
            <li>
              <Link
                href="/blog"
                className="underlink py-1"
                style={{ color: "var(--text-muted)" }}
              >
                Inicio
              </Link>
            </li>
            <li>
              <Link
                href="/blog/tutoriales"
                className="underlink py-1"
                style={{ color: "var(--text-muted)" }}
              >
                Tutoriales
              </Link>
            </li>
            <li className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setCatsOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 underlink py-1 whitespace-nowrap"
                style={{
                  color: catsOpen ? "var(--text)" : "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: "0.08em",
                  fontFamily: "inherit",
                }}
                aria-expanded={catsOpen}
                aria-haspopup="menu"
              >
                <span>Categorías</span>
                <svg
                  className={`flex-shrink-0 transition-transform ${catsOpen ? "rotate-180" : ""}`}
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>
              {catsOpen && (
                <div
                  role="menu"
                  className="absolute top-full left-0 mt-2 rounded-xl border shadow-2xl z-50 overflow-hidden"
                  style={{
                    width: "min(640px, calc(100vw - 2rem))",
                    borderColor: "var(--border)",
                    backgroundColor: "var(--bg-elevated)",
                    boxShadow: "0 20px 60px var(--shadow-color)",
                  }}
                >
                  {/* Header del mega menú */}
                  <div
                    className="px-5 py-3 border-b flex items-center justify-between gap-4"
                    style={{
                      borderColor: "var(--border-subtle)",
                      backgroundColor:
                        "color-mix(in srgb, var(--brand-purple) 6%, transparent)",
                    }}
                  >
                    <div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{ color: "var(--brand-yellow)" }}
                      >
                        Explorar por temática
                      </div>
                      <div
                        className="text-sm font-semibold mt-0.5"
                        style={{ color: "var(--text)" }}
                      >
                        Categorías del blog
                      </div>
                    </div>
                    {totalTutorials > 0 && (
                      <div
                        className="text-[11px] font-mono tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {totalTutorials}{" "}
                        {totalTutorials === 1 ? "tutorial" : "tutoriales"}
                      </div>
                    )}
                  </div>

                  {/* Grid 2-cols con cards de categoría */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                    {CATEGORIES.map((c) => {
                      const n = categoryCounts[c.slug] || 0;
                      return (
                        <Link
                          key={c.slug}
                          href={`/blog/categoria/${c.slug}`}
                          role="menuitem"
                          onClick={() => setCatsOpen(false)}
                          className="group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[color:var(--bg-hover)]"
                          style={{ color: "var(--text)" }}
                        >
                          {/* Icon container con bg sutil purple */}
                          <div
                            className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--brand-purple) 10%, transparent)",
                              color: "var(--text-accent)",
                            }}
                          >
                            <CategoryIcon slug={c.slug} size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="font-semibold text-sm normal-case tracking-normal group-hover:text-[color:var(--text-accent)] transition-colors"
                                style={{ color: "var(--text)" }}
                              >
                                {c.label}
                              </span>
                              {n > 0 && (
                                <span
                                  className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded normal-case tracking-normal"
                                  style={{
                                    color: "var(--text-muted)",
                                    backgroundColor: "var(--bg-hover)",
                                  }}
                                >
                                  {n}
                                </span>
                              )}
                            </div>
                            <div
                              className="text-[12px] normal-case tracking-normal font-normal leading-snug line-clamp-1"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {c.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Footer: Ver todos los tutoriales → */}
                  <div
                    className="border-t px-5 py-3 flex items-center justify-between"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <Link
                      href="/blog/tutoriales"
                      onClick={() => setCatsOpen(false)}
                      className="underlink text-xs font-bold uppercase tracking-[0.08em]"
                      style={{ color: "var(--text-accent)" }}
                    >
                      Ver todos los tutoriales →
                    </Link>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "var(--text-dim)" }}
                    >
                      ESC para cerrar
                    </span>
                  </div>
                </div>
              )}
            </li>
            {/* External links — Mecha Noticias + Tienda con flecha ↗ */}
            <li className="ml-auto flex items-center gap-6">
              <a
                href="https://noticias.mechatronicstore.cl/?utm_source=blog&utm_medium=header_nav"
                className="inline-flex items-center gap-1 underlink py-1"
                style={{ color: "var(--text-muted)" }}
              >
                Mecha Noticias
                <svg
                  className="w-2.5 h-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
              <a
                href="https://www.mechatronicstore.cl/?utm_source=blog&utm_medium=header_nav"
                className="inline-flex items-center gap-1 underlink py-1"
                style={{ color: "var(--text-muted)" }}
              >
                Tienda
                <svg
                  className="w-2.5 h-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
            </li>
          </ul>
        </nav>
      </div>

      {/* ─── Mobile menu (drawer) ─────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden border-t pb-4 pt-3 fade-in-up"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="mx-auto max-w-7xl px-4">
            <Link
              href="/blog"
              className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-[color:var(--bg-hover)]"
              style={{ color: "var(--text)" }}
              onClick={() => setMobileOpen(false)}
            >
              Inicio
            </Link>
            <Link
              href="/blog/tutoriales"
              className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-[color:var(--bg-hover)]"
              style={{ color: "var(--text)" }}
              onClick={() => setMobileOpen(false)}
            >
              Todos los tutoriales
            </Link>
            <div
              className="mt-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-dim)" }}
            >
              Categorías
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/blog/categoria/${c.slug}`}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-md hover:bg-[color:var(--bg-hover)]"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  <span aria-hidden>{c.icon}</span>
                  <span className="font-medium">{c.label}</span>
                </Link>
              ))}
            </div>
            <div
              className="mt-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-dim)" }}
            >
              Ecosistema
            </div>
            <a
              href="https://noticias.mechatronicstore.cl/?utm_source=blog&utm_medium=mobile_nav"
              className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="font-medium">Mecha Noticias</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
            <a
              href="https://www.mechatronicstore.cl/?utm_source=blog&utm_medium=mobile_nav"
              className="mt-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-light))",
                color: "white",
              }}
            >
              Visitar la tienda →
            </a>
            {/* Pablo 23-may-2026: ThemeToggle vive solo en el mobile drawer
                ahora — del desktop header lo sacamos para paridad con store. */}
            <div className="mt-3 flex items-center justify-between px-3 py-2.5">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Tema
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
