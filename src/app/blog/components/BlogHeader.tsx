"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "../../components/ThemeToggle";

const CATEGORIES = [
  { slug: "arduino", label: "Arduino" },
  { slug: "esp32", label: "ESP32" },
  { slug: "rpi", label: "Raspberry Pi" },
  { slug: "robotica", label: "Robótica" },
  { slug: "sensores", label: "Sensores" },
  { slug: "3d", label: "Impresión 3D" },
  { slug: "otros", label: "Otros" },
];

/**
 * Header del blog con navegación de categorías (desktop dropdown +
 * mobile hamburger) y ThemeToggle.
 *
 * Estructura espejada de mechanews EditorialHeader v2 pero adaptada
 * para blog (foco en categorías de tutoriales, no breaking news).
 */
export default function BlogHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "color-mix(in srgb, var(--bg) 85%, transparent)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-4">
          {/* Logo / título */}
          <Link
            href="/blog"
            className="flex items-center gap-2 font-bold text-lg sm:text-xl hover:opacity-80"
            style={{ color: "var(--text)" }}
          >
            <span aria-hidden>📚</span>
            <span>Blog MechatronicStore</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link
              href="/blog"
              className="px-3 py-1.5 rounded hover:bg-[color:var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
            >
              Inicio
            </Link>

            {/* Categorías dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setCatsOpen(true)}
              onMouseLeave={() => setCatsOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCatsOpen((v) => !v)}
                className="px-3 py-1.5 rounded hover:bg-[color:var(--bg-hover)] inline-flex items-center gap-1"
                style={{ color: "var(--text-muted)" }}
                aria-expanded={catsOpen}
              >
                Categorías
                <svg
                  className="h-3 w-3"
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
                  className="absolute top-full left-0 mt-1 min-w-[180px] rounded-lg border shadow-lg py-2"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/blog/categoria/${c.slug}`}
                      className="block px-4 py-2 text-sm hover:bg-[color:var(--bg-hover)]"
                      style={{ color: "var(--text)" }}
                      onClick={() => setCatsOpen(false)}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <a
              href="https://www.mechatronicstore.cl"
              className="px-3 py-1.5 rounded hover:bg-[color:var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
            >
              Tienda
            </a>
          </nav>

          {/* Right cluster: theme toggle + mobile menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text)",
              }}
              aria-label="Menú"
              aria-expanded={mobileOpen}
            >
              <svg
                className="h-5 w-5"
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

        {/* Mobile dropdown */}
        {mobileOpen && (
          <nav
            className="md:hidden border-t pb-4 pt-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <Link
              href="/blog"
              className="block px-3 py-2 text-sm rounded hover:bg-[color:var(--bg-hover)]"
              style={{ color: "var(--text)" }}
              onClick={() => setMobileOpen(false)}
            >
              Inicio
            </Link>
            <div
              className="mt-2 px-3 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              Categorías
            </div>
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/blog/categoria/${c.slug}`}
                className="block px-3 py-2 text-sm rounded hover:bg-[color:var(--bg-hover)]"
                style={{ color: "var(--text-muted)" }}
                onClick={() => setMobileOpen(false)}
              >
                {c.label}
              </Link>
            ))}
            <a
              href="https://www.mechatronicstore.cl"
              className="mt-2 block px-3 py-2 text-sm rounded hover:bg-[color:var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
            >
              ← Tienda
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
