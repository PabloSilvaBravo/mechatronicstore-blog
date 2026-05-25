"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "../Logo";
import ThemeToggle from "../ThemeToggle";
import MegaMenu from "./MegaMenu";
import SearchOverlay from "./SearchOverlay";
import UtilityBar from "../../blog/components/UtilityBar";
import SearchBar from "../../blog/components/SearchBar";
import HeaderActions from "../../blog/components/HeaderActions";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { useScrollLock } from "@/lib/use-scroll-lock";
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  BLOG_CATEGORY_SLUGS,
} from "@/lib/blog-categories";
import type { Tag, FeaturedTutorial } from "@/lib/queries/trending-tags";

interface BlogHeaderData {
  topTags: Tag[];
  categories: Record<
    string,
    { topTags: Tag[]; featured: FeaturedTutorial | null }
  >;
}

const STORE_URL =
  "https://www.mechatronicstore.cl/?utm_source=blog&utm_medium=header";

/**
 * BlogHeader v2 — match estructural con mechatronicstore.cl + extras del blog.
 *
 * Layout (Pablo 25-may-2026 — pidio replicar la web principal):
 *
 *   Row 1 (UtilityBar, top, scroll con la pagina, NO sticky):
 *     ¡Envio gratis a todo Chile en compras sobre $19.990!
 *
 *   Row 2 (main bar, STICKY, colapsable con scroll-down):
 *     [Logo]  [SearchBar inline morado, ancho]  [Suscribete] [COTIZAR]
 *     [Cart] [User] [ThemeToggle nuevo del v2] [Hamburger lg:hidden]
 *
 *   Row 3 (nav, sticky junto al main, oculta en mobile):
 *     [MechatronicStore link]  [Electronica v] [Robotica v] [Domotica v]
 *     [Telematica v]
 *
 *   Row 4 (trending marquee, siempre visible):
 *     TENDENCIA - 25 may  #esp32 #arduino #raspberry-pi ...
 *
 *   Drawer mobile (slide-in derecha): Logo + Tienda card + Categorias +
 *     Tendencia chips. Backdrop con scroll lock.
 */
export default function BlogHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMegaId, setOpenMegaId] = useState<string | null>(null);
  const [data, setData] = useState<BlogHeaderData | null>(null);
  const [todayShort, setTodayShort] = useState("");

  const hideMain = useHideOnScroll();
  useScrollLock(menuOpen);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/blog/header-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: BlogHeaderData | null) => {
        if (!cancelled && j) setData(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const d = new Date();
    const f = d.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    setTodayShort(f);
  }, []);

  function handleLogoClick(e: React.MouseEvent) {
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (e as React.MouseEvent).button === 1
    )
      return;
    e.preventDefault();
    if (
      window.location.pathname === "/blog" ||
      window.location.pathname === "/blog/"
    ) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/blog");
    }
  }

  return (
    <>
      {/* ============================================================
          ROW 1 - UtilityBar (gradient negro/morado con Envio gratis).
          NO sticky - scroll con la pagina, igual que mechatronicstore.cl.
          ============================================================ */}
      <UtilityBar />

      {/* ============================================================
          HEADER STICKY (rows 2-4)
          ============================================================ */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg)",
          transform: "translateZ(0)",
          willChange: "auto",
          contain: "layout",
        }}
      >
        {/* ============================================================
            ROW 2 - Main bar (collapsible). Logo + SearchBar + Actions.
            ============================================================ */}
        <div
          className={openMegaId ? "overflow-visible" : "overflow-hidden"}
          style={{
            maxHeight: hideMain ? "0" : "200px",
            opacity: hideMain ? 0 : 1,
            transition:
              "max-height 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            position: "relative",
            zIndex: openMegaId ? 30 : "auto",
          }}
        >
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:gap-5">
            {/* Logo */}
            <Link
              href="/blog"
              prefetch
              className="block shrink-0"
              aria-label="Blog MechatronicStore, ir al inicio"
              onClick={handleLogoClick}
            >
              <Logo className="h-9 w-auto sm:h-10" />
            </Link>

            {/* SearchBar inline (md+) - el que clona el store con bg morado.
                En mobile (<md) escondemos esta y usamos el btn lupa del cluster
                derecho que abre overlay full-screen. */}
            <div className="hidden flex-1 md:block">
              <SearchBar variant="full" className="mx-auto" />
            </div>

            {/* Spacer mobile - empuja el cluster derecho */}
            <div className="flex-1 md:hidden" />

            {/* Right cluster: HeaderActions (cart + user + Suscribete + COTIZAR)
                + ThemeToggle (nuevo del v2) + Buscar btn mobile + Hamburger.
                HeaderActions ya esconde Suscribete y COTIZAR <lg internamente. */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Btn lupa mobile only - abre overlay */}
              <button
                type="button"
                aria-label="Buscar"
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border text-[color:var(--text-muted)] transition-colors hover:border-[color:var(--text-muted)] hover:text-[color:var(--text)] md:hidden"
                style={{ borderColor: "var(--border)" }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.2-5.2M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                  />
                </svg>
              </button>

              {/* HeaderActions clonado del store - Suscribete + COTIZAR (lg+),
                  Cart + User. */}
              <HeaderActions />

              {/* ThemeToggle - NUEVO del v2 (Pablo lo pidio expresamente).
                  Se mantiene fuera de HeaderActions para que el store no lo tenga. */}
              <ThemeToggle />

              {/* Hamburger (lg:hidden) - abre drawer mobile */}
              <button
                type="button"
                aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full border text-[color:var(--text-muted)] hover:text-[color:var(--text)] lg:hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {menuOpen ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ============================================================
              ROW 3 - Nav row (desktop only, lg+). MechatronicStore + 4 cats.
              ============================================================ */}
          <nav
            className="hidden border-t lg:block"
            style={{
              borderColor: "var(--border-subtle)",
              backgroundColor: "var(--nav-row-bg, var(--bg))",
            }}
            aria-label="Categorias del blog"
          >
            <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-4 py-1.5 sm:px-6">
              <a
                href={STORE_URL}
                target="_blank"
                rel="noopener"
                className="group inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-bold uppercase tracking-wider transition-colors hover:bg-[color:var(--bg-elevated)]"
                style={{ color: "var(--brand-purple)" }}
              >
                Tienda
                <svg
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>

              {BLOG_CATEGORIES.map((cat) => {
                const catData = data?.categories[cat] || {
                  topTags: [],
                  featured: null,
                };
                return (
                  <MegaMenu
                    key={cat}
                    itemId={cat}
                    openId={openMegaId ?? undefined}
                    onOpen={(id) => setOpenMegaId(id)}
                    label={BLOG_CATEGORY_LABELS[cat] || cat}
                    href={`/blog/categoria/${
                      BLOG_CATEGORY_SLUGS[cat] || cat.toLowerCase()
                    }`}
                    topTags={catData.topTags}
                    featured={catData.featured}
                  />
                );
              })}
            </div>
          </nav>
        </div>

        {/* ============================================================
            ROW 4 - Trending marquee (siempre visible, tambien con main colapsado).
            ============================================================ */}
        {data?.topTags && data.topTags.length > 0 && (
          <div
            className="relative border-t"
            style={{
              borderColor: "var(--border-subtle)",
              backgroundColor: "var(--bg)",
            }}
          >
            <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2 text-[12px] sm:px-6">
              <div className="flex shrink-0 items-baseline gap-2">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: "var(--brand-yellow)" }}
                >
                  Tendencia
                </span>
                {todayShort && (
                  <time
                    className="hidden text-[11px] capitalize sm:inline"
                    style={{ color: "var(--text-dim)" }}
                  >
                    · {todayShort}
                  </time>
                )}
              </div>

              <div
                onPointerDownCapture={(e) => {
                  // Fix hit-test: el track animado pierde hit-testing nativo,
                  // hacemos hit-test geometrico con getBoundingClientRect.
                  const target = e.target as HTMLElement;
                  if (target.closest("a")) return;
                  const anchors =
                    e.currentTarget.querySelectorAll<HTMLAnchorElement>(
                      "a[href^='/blog/tag/']",
                    );
                  const px = e.clientX;
                  const py = e.clientY;
                  for (const a of anchors) {
                    const r = a.getBoundingClientRect();
                    if (
                      px >= r.left &&
                      px <= r.right &&
                      py >= r.top &&
                      py <= r.bottom
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      setTimeout(() => {
                        router.push(a.getAttribute("href") || "/blog");
                      }, 0);
                      return;
                    }
                  }
                }}
                className="relative flex min-w-0 flex-1 items-center overflow-x-hidden [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollbarWidth: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12"
                  style={{
                    background:
                      "linear-gradient(to right, var(--bg) 0%, transparent 100%)",
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12"
                  style={{
                    background:
                      "linear-gradient(to left, var(--bg) 0%, transparent 100%)",
                  }}
                />
                <div
                  className="trending-marquee-track flex shrink-0 items-center gap-1.5"
                  style={{
                    animation: `trending-scroll-x ${Math.max(
                      40,
                      data.topTags.length * 4,
                    )}s linear infinite`,
                    animationPlayState: "running",
                    willChange: "transform",
                  }}
                >
                  {data.topTags.map((t) => (
                    <Link
                      key={`a-${t.slug}`}
                      href={`/blog/tag/${t.slug}`}
                      className="shrink-0 rounded-full px-2.5 py-0.5 transition-colors hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>#</span>
                      <span className="font-medium">{t.name}</span>
                    </Link>
                  ))}
                  {data.topTags.map((t) => (
                    <Link
                      key={`b-${t.slug}`}
                      href={`/blog/tag/${t.slug}`}
                      aria-hidden
                      tabIndex={-1}
                      className="shrink-0 rounded-full px-2.5 py-0.5 transition-colors hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>#</span>
                      <span className="font-medium">{t.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            MOBILE DRAWER (slide-in derecha, lg:hidden).
            ============================================================ */}
        <div
          className="fixed inset-0 z-50 lg:hidden"
          style={{ pointerEvents: menuOpen ? "auto" : "none" }}
          aria-hidden={!menuOpen}
        >
          <button
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 cursor-default"
            style={{
              backgroundColor: "rgba(0,0,0,0.45)",
              opacity: menuOpen ? 1 : 0,
              transition: "opacity 280ms cubic-bezier(0.32,0.72,0,1)",
            }}
          />
          <aside
            className="absolute right-0 top-0 flex h-full w-[88%] max-w-[380px] flex-col"
            style={{
              background:
                "linear-gradient(180deg, var(--bg) 0%, var(--bg) 70%, var(--bg-elevated) 100%)",
              borderLeft: "1px solid var(--border-subtle)",
              transform: menuOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 280ms cubic-bezier(0.32,0.72,0,1)",
              paddingTop: "env(safe-area-inset-top, 0)",
              paddingBottom: "env(safe-area-inset-bottom, 0)",
            }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <Logo className="h-7 w-auto" />
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* MechatronicStore card */}
              <a
                href={STORE_URL}
                target="_blank"
                rel="noopener"
                onClick={() => setMenuOpen(false)}
                className="mb-5 flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-[color:var(--bg-hover)]"
                style={{
                  borderColor: "var(--border-strong)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--brand-yellow)" }}
                  >
                    Tienda
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--brand-purple)" }}
                  >
                    MechatronicStore
                  </div>
                </div>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  style={{ color: "var(--brand-purple)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>

              <div className="mb-5">
                <div
                  className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: "var(--brand-yellow)" }}
                >
                  Categorias
                </div>
                <ul className="space-y-0.5">
                  {BLOG_CATEGORIES.map((cat) => (
                    <li key={cat}>
                      <Link
                        href={`/blog/categoria/${
                          BLOG_CATEGORY_SLUGS[cat] || cat.toLowerCase()
                        }`}
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-md px-3 py-2.5 text-base font-medium transition-colors hover:bg-[color:var(--bg-hover)]"
                        style={{ color: "var(--text)" }}
                      >
                        {BLOG_CATEGORY_LABELS[cat] || cat}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {data?.topTags && data.topTags.length > 0 && (
                <div className="mb-5">
                  <div
                    className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--brand-yellow)" }}
                  >
                    Tendencia
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.topTags.slice(0, 12).map((t) => (
                      <Link
                        key={t.slug}
                        href={`/blog/tag/${t.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="rounded-full border px-2.5 py-1 text-xs transition-colors"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span style={{ color: "var(--text-dim)" }}>#</span>
                        {t.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </header>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
