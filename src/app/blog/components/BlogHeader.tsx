"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import Logo from "../../components/Logo";

const CATEGORIES = [
  { slug: "arduino", label: "Arduino", icon: "🔌" },
  { slug: "esp32", label: "ESP32", icon: "📡" },
  { slug: "rpi", label: "Raspberry Pi", icon: "🍓" },
  { slug: "robotica", label: "Robótica", icon: "🤖" },
  { slug: "sensores", label: "Sensores", icon: "📊" },
  { slug: "3d", label: "Impresión 3D", icon: "🖨️" },
  { slug: "otros", label: "Otros", icon: "⚙️" },
];

/**
 * Header sticky con branding, nav categorías (click-to-open dropdown),
 * theme toggle y mobile hamburger.
 *
 * Pablo 18-may-2026 audit visual: el dropdown hover-only era inutilizable
 * en mobile + se cerraba antes de poder hacer click en desktop. Ahora es
 * click-controlled con click-outside listener para cerrar.
 */
export default function BlogHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Cerrar mobile menu al cambiar de ruta (best effort via popstate)
  useEffect(() => {
    const close = () => setMobileOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "var(--bg-overlay)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-4">
          {/* Logo SVG mechatronic + BLOG */}
          <Link
            href="/blog"
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label="Blog MechatronicStore"
          >
            <Logo size="md" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link
              href="/blog"
              className="underlink px-1 py-2"
              style={{ color: "var(--text-muted)" }}
            >
              Inicio
            </Link>

            {/* Categorías dropdown — click-controlled */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setCatsOpen((v) => !v)}
                className="px-3 py-2 rounded-md transition-colors hover:bg-[color:var(--bg-hover)] inline-flex items-center gap-1.5"
                style={{
                  color: catsOpen ? "var(--text)" : "var(--text-muted)",
                  backgroundColor: catsOpen ? "var(--bg-hover)" : "transparent",
                }}
                aria-expanded={catsOpen}
                aria-haspopup="menu"
              >
                Categorías
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${catsOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
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
                  className="absolute top-full right-0 mt-1.5 w-64 rounded-xl border shadow-2xl py-2 z-50"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--bg-elevated)",
                    boxShadow: "0 12px 40px var(--shadow-color)",
                  }}
                >
                  <div
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] border-b mb-1"
                    style={{
                      color: "var(--text-dim)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    Por temática
                  </div>
                  {CATEGORIES.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/blog/categoria/${c.slug}`}
                      role="menuitem"
                      className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-md text-sm transition-colors hover:bg-[color:var(--bg-hover)]"
                      style={{ color: "var(--text)" }}
                      onClick={() => setCatsOpen(false)}
                    >
                      <span className="text-base" aria-hidden>{c.icon}</span>
                      <span className="font-medium">{c.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <a
              href="https://www.mechatronicstore.cl"
              className="underlink inline-flex items-center gap-1.5 px-1 py-2"
              style={{ color: "var(--text-muted)" }}
            >
              Tienda
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border transition-colors"
              style={{
                borderColor: "var(--border)",
                backgroundColor: mobileOpen ? "var(--bg-hover)" : "var(--bg-elevated)",
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

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-t pb-4 pt-3 fade-in-up"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <Link
              href="/blog"
              className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-[color:var(--bg-hover)]"
              style={{ color: "var(--text)" }}
              onClick={() => setMobileOpen(false)}
            >
              📰 Inicio
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
            <a
              href="https://www.mechatronicstore.cl"
              className="mt-3 flex items-center justify-center gap-2 mx-3 py-3 text-sm font-bold rounded-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-light))",
                color: "white",
              }}
            >
              Visitar la tienda →
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
