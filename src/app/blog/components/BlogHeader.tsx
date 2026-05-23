"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import Logo from "../../components/Logo";
import SearchBar from "./SearchBar";
import HeaderActions from "./HeaderActions";

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
        background: "var(--brand-purple)",
        opacity: 0.9,
        height: "32px",
        borderRadius: "12px",
        maxWidth: "654px",
      }}
      aria-hidden
    />
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
  // Pablo 23-may-2026 v10 — removido catsOpen/dropdownRef/totalTutorials
  // junto con el dropdown del mega menú. Las categorías ahora son links
  // inline en la nav row, una sola interacción para llegar a cada una.

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
        // Pablo 23-may-2026 v8 — bg BLANCO FIJO + CSS vars locales que
        // sobrescriben las globales SOLO dentro del header. Esto fuerza
        // todos los textos (var(--text), var(--text-muted), etc.) a
        // valores claros independiente de si el resto del blog está en
        // dark theme. Paridad con store (que no tiene dark mode) sin
        // tocar 20+ inline styles.
        backgroundColor: "#ffffff",
        ["--text" as string]: "#1a1a1a",
        ["--text-muted" as string]: "#5f5f6e",
        ["--text-dim" as string]: "#8a8a9a",
        ["--bg-card" as string]: "#ffffff",
        ["--bg-hover" as string]: "#f5f5f7",
        ["--nav-row-bg" as string]: "#f5f5f7",
        ["--border-subtle" as string]: "rgba(0, 0, 0, 0.08)",
        color: "#1a1a1a",
      }}
    >
      {/* ─── Row 2: Main bar ──────────────────────────────────────
          Layout horizontal: [Logo] [SearchBar grows] [Actions]
          Replica el main bar del store. */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-5 py-3">
          {/* Logo — variant default morado original sobre header bg
              claro (v6 revert del v5). */}
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

          {/* Divider vertical entre search/center y cluster derecho —
              replica el `<li class="header-divider">` del store: 1px ×
              30px con border-left rgba(0,0,0,0.1). Pablo 23-may-2026 v7. */}
          <span
            className="hidden md:inline-block flex-shrink-0"
            style={{
              width: "1px",
              height: "30px",
              background: "rgba(0, 0, 0, 0.1)",
              marginRight: "7px",
            }}
            aria-hidden
          />

          {/* Right cluster: search icon en mobile + actions + theme + burger */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="md:hidden">
              <Suspense fallback={<SearchBarFallback variant="icon" />}>
                <SearchBar variant="icon" />
              </Suspense>
            </div>
            <HeaderActions />
            {/* Pablo 23-may-2026 v7 — eliminado ShippingTriggerStub.
                Auditoría Playwright confirmó que el store NO tiene
                "Enviar a / Elegir ubicación" en el header — yo lo había
                inventado. Cluster derecho del store es exactamente:
                Suscríbete | divider | COTIZAR | cart | user. */}
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
          Pablo 23-may-2026 v10 — REDISEÑO completo. v7 era "feísima,
          poco funcional, mal estructurada". Replica el estilo del
          store (.header-bottom-nav): cápsulas hover morado translúcido,
          font-weight 500, centered + extras a la derecha.

          Estructura nueva:
            [Inicio] [Tutoriales] [arduino] [ESP32] [Raspberry Pi]
            [Robótica] [Sensores] [3D] ····················
            ················· [Noticias↗] [Tienda↗]

          Categorías inline en lugar de dropdown — UX más directa, un
          click va a la categoría. Si necesitás todas, "Tutoriales"
          lleva al index global.
       */}
      <div
        className="hidden md:block border-t blog-nav-row"
        style={{
          borderColor: "var(--border-subtle)",
          background: "transparent",
        }}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6">
          <ul className="flex items-center gap-1 lg:gap-1.5 py-1.5">
            <li>
              <Link href="/blog" className="blog-nav-link">
                Inicio
              </Link>
            </li>
            <li>
              <Link href="/blog/tutoriales" className="blog-nav-link">
                Tutoriales
              </Link>
            </li>
            {/* Separador sutil entre principales y categorías */}
            <li className="mx-1.5" aria-hidden>
              <span
                style={{
                  display: "inline-block",
                  width: "1px",
                  height: "16px",
                  background: "rgba(0, 0, 0, 0.08)",
                }}
              />
            </li>
            {/* Categorías inline — un click directo a cada una */}
            {CATEGORIES.map((c) => {
              const n = categoryCounts[c.slug] || 0;
              return (
                <li key={c.slug}>
                  <Link
                    href={`/blog/categoria/${c.slug}`}
                    className="blog-nav-link inline-flex items-center gap-1"
                  >
                    <span>{c.label}</span>
                    {n > 0 && (
                      <span
                        className="blog-nav-count tabular-nums"
                        aria-label={`${n} tutoriales`}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
            {/* Spacer + external links a la derecha */}
            <li className="ml-auto flex items-center gap-1">
              <a
                href="https://noticias.mechatronicstore.cl/?utm_source=blog&utm_medium=header_nav"
                className="blog-nav-link blog-nav-external inline-flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Noticias</span>
                <svg
                  width="10"
                  height="10"
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
                className="blog-nav-link blog-nav-external inline-flex items-center gap-1"
              >
                <span>Tienda</span>
                <svg
                  width="10"
                  height="10"
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
