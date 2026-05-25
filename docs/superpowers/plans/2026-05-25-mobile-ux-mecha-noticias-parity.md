# Mobile UX Parity con MechaNoticias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar el blog (`mechatronicstore-blog`) al mismo nivel de UX mobile + desktop que MechaNoticias (`/Users/pablosilvabravo/Projects/newsletter`), incluyendo el marquee de hashtags, PWA completa, header sticky+collapse, hooks de scroll, y todas las optimizaciones mobile.

**Architecture:** Port topológico en 7 fases. Stack matchea exacto (Next 16.2.6 + React 19.2.6 + Tailwind v4.3.0). Decisiones autónomas: mantener paleta MS para continuidad, datasource del marquee via `json_each(tags_json)` (sin migración DB), 3 mega-menus dinámicos por categoría top, BlogHeader v2 nuevo reemplaza el actual.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (inline `@theme`), Turso/libsql, Cloudflare R2 + custom domain `images.mechatronicstore.cl`, Service Worker plain JS, Web Push (gated por VAPID).

---

## File Structure

### Create

- `src/app/manifest.ts` — PWA manifest (dynamic via `MetadataRoute.Manifest`)
- `src/app/api/blog-header-data/route.ts` — endpoint trending tags + featured per cat
- `src/lib/use-hide-on-scroll.ts` — scroll-hide hook con jump-protect + cooldown
- `src/lib/use-scroll-lock.ts` — body scroll lock ref-counted
- `src/lib/blog-categories.ts` — labels y slugs de categorías del blog
- `src/lib/queries/trending-tags.ts` — query agregada tags + featured por categoría
- `src/app/components/v2/BlogHeader.tsx` — header sticky + marquee + mobile drawer
- `src/app/components/v2/MegaMenu.tsx` — dropdown desktop por categoría
- `src/app/components/v2/SearchOverlay.tsx` — overlay full-screen
- `src/app/components/PullToRefresh.tsx` — gesto pull-to-refresh
- `src/app/components/PWARegister.tsx` — registro SW + install prompt
- `src/app/components/PushPrompt.tsx` — solicitud notifications (gated VAPID)
- `public/sw.js` — service worker (network-only HTML, SWR images)
- `public/icons/icon-192.png` `icon-512.png` `icon-maskable-192.png` `icon-maskable-512.png` `apple-touch-icon.png` — set PWA icons

### Modify

- `src/app/layout.tsx` — agregar `viewport` export, `appleWebApp`, `manifest` ref, montar PullToRefresh + BlogHeader + PWARegister + PushPrompt
- `src/app/globals.css` — agregar keyframes (`trending-scroll-x`, `fadeIn`, `subscribe-pulse`, `live-pulse`, `vt-fade-*`), mobile optimizations (overflow-anchor, overscroll-behavior, input 16px, safe-area helpers, touch-action), `.scrollbar-hide`, fluid typography, view transitions
- `src/app/page.tsx` — remover header viejo si existe inline; ajustar a nuevo flow
- `next.config.ts` — ampliar `images.remotePatterns`, agregar `deviceSizes` + `imageSizes` + `minimumCacheTTL`

### Delete (post-port)

- Header v1 del blog (si está montado en cualquier page) — solo si quedan refs después de Task 12

---

## Task 1: Globals.css — keyframes y mobile optimizations

**Files:**
- Modify: `src/app/globals.css` (append al final del archivo)

- [ ] **Step 1: Leer globals.css actual completo**

Run: leer `src/app/globals.css` con Read tool para identificar dónde insertar.

- [ ] **Step 2: Verificar variables CSS faltantes y agregarlas**

Si en `:root, [data-theme="dark"]` falta alguna de estas, agregarlas dentro del bloque:

```css
--bg-overlay: rgba(14, 15, 20, 0.88);
--shadow-glow: rgba(96, 23, 177, 0.22);
--scrollbar-track: #0E0F14;
--scrollbar-thumb: #6017b1;
--scrollbar-thumb-hover: #8a3fd6;
```

Y dentro de `[data-theme="light"]` (equivalentes):

```css
--bg-overlay: rgba(250, 250, 250, 0.88);
--shadow-glow: rgba(96, 23, 177, 0.22);
--scrollbar-track: #f0f0f0;
--scrollbar-thumb: #6017b1;
--scrollbar-thumb-hover: #4a0f8a;
```

- [ ] **Step 3: Agregar al final de globals.css el bloque mobile + animations**

```css
/* ============================================================
   MOBILE + PERFORMANCE OPTIMIZATIONS (port desde mecha-noticias)
   ============================================================ */

html {
  scroll-behavior: smooth;
  overscroll-behavior-y: contain;
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}

body {
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  /* Fix flicker scroll-anchoring cuando header colapsa (mecha-noticias 24-may-2026) */
  overflow-anchor: none;
}

/* Evita auto-zoom iOS al focus en inputs */
input, textarea, select { font-size: 16px; }
@media (min-width: 640px) {
  input, textarea, select { font-size: inherit; }
}

/* Safe-area helpers (iPhone notch) */
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0); }
.pt-safe { padding-top: env(safe-area-inset-top, 0); }

/* Scrollbar custom + hide utility */
.scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }

/* Fluid typography */
.text-fluid-xl  { font-size: clamp(20px, 4.8vw, 28px); }
.text-fluid-2xl { font-size: clamp(22px, 5.6vw, 36px); }
.text-fluid-3xl { font-size: clamp(26px, 7vw, 48px); }

/* ============================================================
   ANIMATIONS (port desde mecha-noticias)
   ============================================================ */

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.4s ease-out; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.animate-shimmer { animation: shimmer 1.4s ease-in-out infinite; }

@keyframes subscribe-pulse {
  0%, 100% {
    background-color: var(--brand-yellow);
    box-shadow: 0 0 8px 2px rgba(232, 195, 0, 0.55), 0 0 0 1px rgba(232, 195, 0, 0.35);
  }
  50% {
    background-color: var(--text);
    box-shadow: 0 0 0 0 transparent, 0 0 0 1px rgba(0, 0, 0, 0);
  }
}
.subscribe-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 9999px;
  background-color: var(--brand-yellow);
  animation: subscribe-pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}
@media (prefers-reduced-motion: reduce) {
  .subscribe-dot { animation: none; }
}

@keyframes live-pulse {
  0%, 100% { opacity: 1;    transform: scale(1); }
  50%      { opacity: 0.45; transform: scale(0.85); }
}
.live-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 9999px;
  background: var(--brand-yellow);
  animation: live-pulse 1.6s ease-in-out infinite;
  box-shadow: 0 0 0 2px rgba(232, 195, 0, 0.18);
}
@media (prefers-reduced-motion: reduce) { .live-dot { animation: none; } }

/* ============================================================
   TRENDING MARQUEE (port literal, mismo nombre que en noticias)
   ============================================================ */
@keyframes trending-scroll-x {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
.trending-marquee-track:hover,
.trending-marquee-track:focus-within {
  animation-play-state: paused;
}
.trending-marquee-track a {
  touch-action: manipulation;
  position: relative;
  z-index: 1;
}

/* ============================================================
   PULL-TO-REFRESH visual
   ============================================================ */
.ptr-indicator {
  position: fixed; top: 0; left: 50%;
  transform: translate(-50%, -100%);
  z-index: 70;
  transition: transform 0.2s ease, opacity 0.2s ease;
  opacity: 0; pointer-events: none;
}
.ptr-indicator[data-state="pulling"]    { opacity: 1; }
.ptr-indicator[data-state="refreshing"] { opacity: 1; transform: translate(-50%, 20%); }

/* ============================================================
   VIEW TRANSITIONS (Next 16 + Chrome)
   ============================================================ */
@supports (view-transition-name: auto) {
  ::view-transition-old(root), ::view-transition-new(root) {
    animation-duration: 0.3s;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  ::view-transition-old(root) { animation-name: vt-fade-out; }
  ::view-transition-new(root) { animation-name: vt-fade-in; }
  ::view-transition-old(hero-image), ::view-transition-new(hero-image) {
    animation-duration: 0.42s;
    animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    mix-blend-mode: normal;
  }
}
@keyframes vt-fade-out { from {opacity:1; transform:translateY(0);} to {opacity:0; transform:translateY(-4px);} }
@keyframes vt-fade-in  { from {opacity:0; transform:translateY(6px);} to {opacity:1; transform:translateY(0);} }
.vt-hero { view-transition-name: hero-image; contain: paint; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root), ::view-transition-new(root),
  ::view-transition-old(hero-image), ::view-transition-new(hero-image) {
    animation-duration: 0.001s !important;
  }
}
```

- [ ] **Step 4: Verificar compilación CSS**

Run: `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && npx next build 2>&1 | head -40`
Expected: build empieza sin errores de CSS (puede fallar después por otros archivos que aún no existen, ignorar esos errores; importa que CSS se compila).

- [ ] **Step 5: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/app/globals.css
git commit -m "feat(blog): port keyframes y mobile optimizations desde mecha-noticias"
```

---

## Task 2: PWA viewport export + manifest

**Files:**
- Create: `src/app/manifest.ts`
- Modify: `src/app/layout.tsx` (agregar `viewport` export y campos en `metadata`)

- [ ] **Step 1: Crear src/app/manifest.ts**

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MechatronicStore Blog",
    short_name: "MechaBlog",
    description:
      "Tutoriales técnicos de electrónica, robótica, IoT y DIY. Aprende y compra los componentes en MechatronicStore.cl",
    start_url: "/blog",
    scope: "/blog",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0E0F14",
    theme_color: "#0E0F14",
    lang: "es-CL",
    dir: "ltr",
    categories: ["education", "technology", "diy"],
    icons: [
      { src: "/icons/icon-192.png?v=1", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png?v=1", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png?v=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png?v=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Inicio",       short_name: "Inicio",    description: "Últimos tutoriales",       url: "/blog" },
      { name: "Categorías",   short_name: "Cats",      description: "Explorar por categoría",   url: "/blog/categorias" },
      { name: "Buscar",       short_name: "Buscar",    description: "Buscar tutoriales",        url: "/blog/buscar" },
    ],
  };
}
```

- [ ] **Step 2: Modificar src/app/layout.tsx — agregar imports**

Al inicio, junto a los imports actuales, agregar:

```ts
import type { Viewport } from "next";
```

- [ ] **Step 3: Modificar metadata — agregar manifest + icons + appleWebApp + openGraph**

Reemplazar el `export const metadata: Metadata = { ... }` actual por:

```ts
const BASE_URL = "https://www.mechatronicstore.cl";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Blog MechatronicStore · Tutoriales técnicos en español",
    template: "%s · Blog MechatronicStore",
  },
  description:
    "Tutoriales técnicos de electrónica, robótica, IoT y DIY. Aprende y compra los componentes en MechatronicStore.cl",
  icons: {
    icon: [
      { url: "/favicon.ico?v=1", sizes: "any" },
      { url: "/icons/favicon-32.png?v=1", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png?v=1", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png?v=1", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MechaBlog",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: `${BASE_URL}/blog`,
    siteName: "MechatronicStore Blog",
    title: "Blog MechatronicStore · Tutoriales técnicos en español",
    description: "Tutoriales técnicos de electrónica, robótica, IoT y DIY.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog MechatronicStore",
    description: "Tutoriales técnicos en español",
  },
};
```

- [ ] **Step 4: Agregar viewport export debajo de metadata**

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0E0F14" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};
```

- [ ] **Step 5: Typecheck**

Run: `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && npx tsc --noEmit -p .`
Expected: 0 errors (puede fallar por otros archivos creados después; lo crítico es que manifest.ts y layout.tsx compilen).

- [ ] **Step 6: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/app/manifest.ts src/app/layout.tsx
git commit -m "feat(blog): agregar manifest PWA + viewport export + appleWebApp"
```

---

## Task 3: Hooks de scroll (useHideOnScroll + useScrollLock)

**Files:**
- Create: `src/lib/use-hide-on-scroll.ts`
- Create: `src/lib/use-scroll-lock.ts`

- [ ] **Step 1: Crear src/lib/use-scroll-lock.ts**

```ts
import { useEffect } from "react";

let lockCount = 0;
let originalOverflow = "";

function applyLock() {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function releaseLock() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
    originalOverflow = "";
  }
}

/**
 * Lock body scroll mientras `active` sea true. Ref-counted globalmente
 * para que múltiples modales coexistan sin pisarse el overflow.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    applyLock();
    return () => releaseLock();
  }, [active]);
}
```

- [ ] **Step 2: Crear src/lib/use-hide-on-scroll.ts**

```ts
"use client";
import { useEffect, useState, useRef } from "react";

/**
 * Hook que devuelve `true` cuando el usuario está scrolleando hacia abajo
 * y `false` cuando vuelve hacia arriba. Implementa:
 *
 * - rAF-throttle del listener scroll
 * - jump-protect: ignora deltas absurdos (>60px en <50ms — scroll-anchoring browser noise)
 * - cooldown 800ms entre flips para evitar oscilación
 * - hysteresis: needs downDelta=32 acumulados para ocultar, upDelta=16 para mostrar
 * - siempre visible si scrollY < threshold
 */
export function useHideOnScroll(opts?: {
  threshold?: number;
  downDelta?: number;
  upDelta?: number;
}) {
  const threshold = opts?.threshold ?? 200;
  const downDelta = opts?.downDelta ?? 32;
  const upDelta = opts?.upDelta ?? 16;
  const FLIP_COOLDOWN_MS = 800;
  const JUMP_PX = 60;
  const JUMP_MS = 50;

  const [hidden, setHidden] = useState(false);
  const anchorY = useRef(0);
  const anchorTime = useRef(0);
  const lastFlip = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const now = Date.now();
        const dy = y - anchorY.current;
        const dt = now - anchorTime.current;

        if (dt < JUMP_MS && Math.abs(dy) > JUMP_PX) {
          anchorY.current = y;
          anchorTime.current = now;
          ticking.current = false;
          return;
        }

        if (y < threshold) {
          if (hidden) {
            const inCooldown = now - lastFlip.current < FLIP_COOLDOWN_MS;
            if (!inCooldown) {
              setHidden(false);
              lastFlip.current = now;
            }
          }
          anchorY.current = y;
          anchorTime.current = now;
          ticking.current = false;
          return;
        }

        const inCooldown = now - lastFlip.current < FLIP_COOLDOWN_MS;
        if (inCooldown) {
          if ((hidden && dy > 0) || (!hidden && dy < 0)) {
            anchorY.current = y;
            anchorTime.current = now;
          }
          ticking.current = false;
          return;
        }

        if (!hidden && dy >= downDelta) {
          setHidden(true);
          lastFlip.current = now;
          anchorY.current = y;
          anchorTime.current = now;
        } else if (hidden && dy <= -upDelta) {
          setHidden(false);
          lastFlip.current = now;
          anchorY.current = y;
          anchorTime.current = now;
        } else if ((hidden && dy > 0) || (!hidden && dy < 0)) {
          anchorY.current = y;
          anchorTime.current = now;
        }

        ticking.current = false;
      });
    }

    anchorY.current = window.scrollY;
    anchorTime.current = Date.now();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hidden, threshold, downDelta, upDelta]);

  return hidden;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .` desde el repo blog.
Expected: ambos archivos compilan sin errores.

- [ ] **Step 4: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/lib/use-hide-on-scroll.ts src/lib/use-scroll-lock.ts
git commit -m "feat(blog): hooks useHideOnScroll y useScrollLock (port mecha-noticias)"
```

---

## Task 4: Categorías del blog + query trending tags

**Files:**
- Create: `src/lib/blog-categories.ts`
- Create: `src/lib/queries/trending-tags.ts`

- [ ] **Step 1: Crear src/lib/blog-categories.ts**

```ts
/**
 * Categorías visibles en el header del blog. El orden define qué
 * categorías aparecen como mega-menu en desktop (top 3 por defecto)
 * y como links en el drawer mobile.
 */
export const BLOG_CATEGORIES = [
  "Microcontrollers",
  "Sensors",
  "Robotics",
  "IoT",
  "3D Printing",
  "Maker",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Record<string, string> = {
  Microcontrollers: "Microcontroladores",
  Sensors: "Sensores",
  Robotics: "Robótica",
  IoT: "IoT",
  "3D Printing": "Impresión 3D",
  Maker: "Maker",
};

export const BLOG_CATEGORY_SLUGS: Record<string, string> = {
  Microcontrollers: "microcontroladores",
  Sensors: "sensores",
  Robotics: "robotica",
  IoT: "iot",
  "3D Printing": "impresion-3d",
  Maker: "maker",
};
```

- [ ] **Step 2: Crear src/lib/queries/trending-tags.ts**

```ts
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export interface Tag {
  slug: string;
  name: string;
  count: number;
}

export interface FeaturedTutorial {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  category: string;
}

/**
 * Devuelve los top N tags más usados across tutoriales published,
 * extraídos de la columna `tags_json` (JSON array) via json_each.
 * Slug derivado del tag lowercase + dashes.
 */
export async function getTopBlogTags(limit = 20): Promise<Tag[]> {
  const res = await client.execute({
    sql: `
      SELECT je.value AS name, COUNT(*) AS cnt
        FROM tutorials t, json_each(t.tags_json) je
       WHERE t.status = 'published'
         AND t.tags_json IS NOT NULL
         AND t.tags_json != ''
       GROUP BY je.value
       ORDER BY cnt DESC
       LIMIT ?
    `,
    args: [limit],
  });

  return res.rows.map((r) => {
    const name = String(r.name || "").trim();
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return { slug, name, count: Number(r.cnt) };
  });
}

/**
 * Tutorial más reciente de cada categoría (para mega-menu).
 */
export async function getFeaturedPerCategory(
  cats: readonly string[],
): Promise<Record<string, FeaturedTutorial | null>> {
  const out: Record<string, FeaturedTutorial | null> = {};
  for (const cat of cats) {
    const res = await client.execute({
      sql: `
        SELECT id, slug, title_es AS title, hero_image_url AS image, category
          FROM tutorials
         WHERE status = 'published' AND category = ?
         ORDER BY published_at DESC
         LIMIT 1
      `,
      args: [cat],
    });
    const r = res.rows[0];
    out[cat] = r
      ? {
          id: String(r.id),
          slug: String(r.slug),
          title: String(r.title || ""),
          image: r.image ? String(r.image) : null,
          category: String(r.category),
        }
      : null;
  }
  return out;
}

/**
 * Top N tags por categoría (para mega-menu).
 */
export async function getTagsPerCategory(
  cats: readonly string[],
  perCat = 6,
): Promise<Record<string, Tag[]>> {
  const out: Record<string, Tag[]> = {};
  for (const cat of cats) {
    const res = await client.execute({
      sql: `
        SELECT je.value AS name, COUNT(*) AS cnt
          FROM tutorials t, json_each(t.tags_json) je
         WHERE t.status = 'published' AND t.category = ?
           AND t.tags_json IS NOT NULL
           AND t.tags_json != ''
         GROUP BY je.value
         ORDER BY cnt DESC
         LIMIT ?
      `,
      args: [cat, perCat],
    });
    out[cat] = res.rows.map((r) => {
      const name = String(r.name || "").trim();
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return { slug, name, count: Number(r.cnt) };
    });
  }
  return out;
}
```

- [ ] **Step 3: Verificar que el blog ya tiene `@libsql/client`**

Run: `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && grep "@libsql/client" package.json`
Expected: línea encontrada. Si NO está: `npm install @libsql/client` antes de continuar.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p .` desde el blog.
Expected: 0 errors en los archivos nuevos.

- [ ] **Step 5: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/lib/blog-categories.ts src/lib/queries/trending-tags.ts
git commit -m "feat(blog): queries para trending tags y featured per categoría"
```

---

## Task 5: API route `/api/blog-header-data`

**Files:**
- Create: `src/app/api/blog-header-data/route.ts`

- [ ] **Step 1: Crear el route**

```ts
import { NextResponse } from "next/server";
import {
  getTopBlogTags,
  getFeaturedPerCategory,
  getTagsPerCategory,
  type Tag,
  type FeaturedTutorial,
} from "@/lib/queries/trending-tags";
import { BLOG_CATEGORIES } from "@/lib/blog-categories";

export const dynamic = "force-static";
export const revalidate = 1800; // 30 min

export interface BlogHeaderData {
  topTags: Tag[];
  categories: Record<
    string,
    { topTags: Tag[]; featured: FeaturedTutorial | null }
  >;
}

export async function GET() {
  try {
    const [topTags, perCatTags, featured] = await Promise.all([
      getTopBlogTags(20),
      getTagsPerCategory(BLOG_CATEGORIES, 6),
      getFeaturedPerCategory(BLOG_CATEGORIES),
    ]);

    const categories: BlogHeaderData["categories"] = {};
    for (const cat of BLOG_CATEGORIES) {
      categories[cat] = {
        topTags: perCatTags[cat] || [],
        featured: featured[cat] || null,
      };
    }

    const payload: BlogHeaderData = { topTags, categories };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    console.error("[blog-header-data] error:", e);
    return NextResponse.json(
      { topTags: [], categories: {} } satisfies BlogHeaderData,
      { status: 200 },
    );
  }
}
```

- [ ] **Step 2: Verificar alias `@/` configurado**

Run: `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && grep -E '"paths":|baseUrl' tsconfig.json`
Expected: ver `"@/*": ["./src/*"]` o similar. Si no, ajustar imports a `../../../lib/...` directos.

- [ ] **Step 3: Probar el endpoint en dev**

Run en background terminal: `npm run dev` (si ya está corriendo, skip).
Luego: `curl -s http://localhost:3000/api/blog-header-data | head -200`
Expected: JSON con `topTags` (array) y `categories` (objeto con 6 keys). Si DB vacía: arrays vacíos, no error.

- [ ] **Step 4: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/app/api/blog-header-data/route.ts
git commit -m "feat(blog): endpoint /api/blog-header-data con cache 30min"
```

---

## Task 6: SearchOverlay component

**Files:**
- Create: `src/app/components/v2/SearchOverlay.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useScrollLock } from "@/lib/use-scroll-lock";

const HISTORY_KEY = "mechablog-search-history";
const MAX_HISTORY = 8;

const POPULAR_TAGS = [
  "esp32",
  "arduino",
  "raspberry-pi",
  "sensores",
  "robotica",
  "iot",
  "impresion-3d",
  "domotica",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setHistory([]);
    }
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit(q: string) {
    const query = q.trim();
    if (!query) return;
    try {
      const next = [query, ...history.filter((h) => h !== query)].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
    onClose();
    router.push(`/blog/buscar?q=${encodeURIComponent(query)}`);
  }

  function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    setHistory([]);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col"
      style={{
        backgroundColor: "var(--bg)",
        paddingTop: "env(safe-area-inset-top, 0)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Buscar tutoriales"
    >
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--brand-purple), var(--brand-yellow), var(--brand-purple), transparent)",
        }}
      />

      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          style={{ color: "var(--text-dim)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(value); }}
          placeholder="Buscar tutoriales, tags, componentes..."
          className="flex-1 bg-transparent text-lg outline-none"
          style={{ color: "var(--text)" }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Borrar búsqueda"
            className="rounded-full p-1.5"
            style={{ color: "var(--text-dim)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-1 px-2 text-sm font-semibold"
          style={{ color: "var(--text-accent)" }}
        >
          Cancelar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {history.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                Búsquedas recientes
              </h3>
              <button
                type="button"
                onClick={clearHistory}
                className="text-[11px] font-semibold underline"
                style={{ color: "var(--text-dim)" }}
              >
                Limpiar
              </button>
            </div>
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h}>
                  <button
                    type="button"
                    onClick={() => submit(h)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-[color:var(--bg-elevated)]"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: "var(--text-dim)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ color: "var(--text)" }}>{h}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            Temas populares
          </h3>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TAGS.map((t) => (
              <Link
                key={t}
                href={`/blog/tag/${t}`}
                onClick={onClose}
                className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-[color:var(--text-muted)]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ color: "var(--text-dim)" }}>#</span>
                <span className="font-medium">{t}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .` desde el blog.

- [ ] **Step 3: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/app/components/v2/SearchOverlay.tsx
git commit -m "feat(blog): SearchOverlay full-screen con history + popular tags"
```

---

## Task 7: MegaMenu component

**Files:**
- Create: `src/app/components/v2/MegaMenu.tsx`

- [ ] **Step 1: Crear el componente con hover geométrico**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Tag, FeaturedTutorial } from "@/lib/queries/trending-tags";

interface Props {
  label: string;
  href: string;
  topTags: Tag[];
  featured: FeaturedTutorial | null;
  openId?: string;
  itemId: string;
  onOpen?: (id: string | null) => void;
}

export default function MegaMenu({
  label,
  href,
  topTags,
  featured,
  openId,
  itemId,
  onOpen,
}: Props) {
  const open = openId === itemId;
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setOpen(v: boolean) {
    if (onOpen) onOpen(v ? itemId : null);
  }

  function onTriggerEnter() { setOpen(true); }

  useEffect(() => {
    if (!open) return;
    function onMove(e: MouseEvent) {
      const x = e.clientX;
      const y = e.clientY;
      const cRect = containerRef.current?.getBoundingClientRect();
      const pRect = panelRef.current?.getBoundingClientRect();
      const inContainer = !!cRect && x >= cRect.left && x <= cRect.right && y >= cRect.top && y <= cRect.bottom;
      const inPanel = !!pRect && x >= pRect.left && x <= pRect.right && y >= pRect.top && y <= pRect.bottom;
      if (inContainer || inPanel) {
        if (hoverCloseTimer.current) { clearTimeout(hoverCloseTimer.current); hoverCloseTimer.current = null; }
      } else {
        if (!hoverCloseTimer.current) {
          hoverCloseTimer.current = setTimeout(() => {
            setOpen(false);
            hoverCloseTimer.current = null;
          }, 200);
        }
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
      if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div
        onMouseEnter={onTriggerEnter}
        className="flex items-center rounded-md transition-colors hover:bg-[color:var(--bg-elevated)]"
        style={{ backgroundColor: open ? "var(--bg-elevated)" : undefined }}
      >
        <Link
          href={href}
          className="py-2 pl-3 pr-1 text-[13px] font-semibold uppercase tracking-wider transition-colors"
          style={{ color: open ? "var(--text)" : "var(--text-muted)" }}
        >
          {label}
        </Link>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(e) => { e.preventDefault(); setOpen(!open); }}
          className="py-2 pl-0.5 pr-2.5 transition-colors"
          style={{ color: open ? "var(--text)" : "var(--text-dim)" }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {open && (
        <div ref={panelRef} className="absolute left-0 top-full z-50 pt-1 w-[min(92vw,560px)]">
          <div
            role="menu"
            className="rounded-lg border shadow-lg"
            style={{
              borderColor: "var(--border-subtle)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr] sm:gap-6 sm:p-5">
              <div>
                <div
                  className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: "var(--brand-yellow)" }}
                >
                  Subtemas
                </div>
                <ul className="space-y-1.5">
                  {topTags.slice(0, 6).map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/blog/tag/${t.slug}`}
                        className="group flex items-baseline justify-between rounded px-2 py-1 text-sm transition-colors hover:bg-[color:var(--bg-hover)]"
                        onClick={() => setOpen(false)}
                      >
                        <span className="font-medium" style={{ color: "var(--text)" }}>
                          {t.name}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                          {t.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider transition-colors hover:underline"
                  style={{ color: "var(--text-accent)" }}
                >
                  Ver todos los tutoriales <span aria-hidden>→</span>
                </Link>
              </div>

              {featured && (
                <Link
                  href={`/blog/${featured.slug}`}
                  onClick={() => setOpen(false)}
                  className="group block"
                >
                  <div
                    className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--brand-yellow)" }}
                  >
                    Más reciente
                  </div>
                  <div
                    className="relative aspect-[16/10] overflow-hidden rounded-md"
                    style={{ backgroundColor: "var(--bg)" }}
                  >
                    {featured.image && (
                      <img
                        src={featured.image}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <h3
                    className="mt-3 line-clamp-3 text-sm font-bold leading-snug"
                    style={{
                      color: "var(--text)",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    <span className="bg-[linear-gradient(transparent_92%,rgba(255,215,0,0.3)_92%)] bg-no-repeat transition-[background-size] duration-300 [background-size:0%_100%] group-hover:[background-size:100%_100%]">
                      {featured.title}
                    </span>
                  </h3>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .` desde el blog.

- [ ] **Step 3: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/app/components/v2/MegaMenu.tsx
git commit -m "feat(blog): MegaMenu dropdown desktop con hover geométrico"
```

---

## Task 8: BlogHeader v2 — el header completo

**Files:**
- Create: `src/app/components/v2/BlogHeader.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "../Logo";
import ThemeToggle from "../ThemeToggle";
import MegaMenu from "./MegaMenu";
import SearchOverlay from "./SearchOverlay";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { useScrollLock } from "@/lib/use-scroll-lock";
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  BLOG_CATEGORY_SLUGS,
} from "@/lib/blog-categories";
import type { BlogHeaderData } from "../../api/blog-header-data/route";

const STORE_URL = "https://www.mechatronicstore.cl/?utm_source=blog&utm_medium=header";

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
    fetch("/api/blog-header-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: BlogHeaderData | null) => {
        if (!cancelled && j) setData(j);
      })
      .catch(() => {});
    return () => { cancelled = true; };
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
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e as React.MouseEvent).button === 1) return;
    e.preventDefault();
    if (window.location.pathname === "/blog" || window.location.pathname === "/blog/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/blog");
    }
  }

  // Top 3 categorías para mega-menu desktop
  const topCats = BLOG_CATEGORIES.slice(0, 3);

  return (
    <>
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
        {/* MAIN ROW (collapsible) */}
        <div
          className={openMegaId ? "overflow-visible" : "overflow-hidden"}
          style={{
            maxHeight: hideMain ? "0" : "120px",
            opacity: hideMain ? 0 : 1,
            transition:
              "max-height 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            position: "relative",
            zIndex: openMegaId ? 30 : "auto",
          }}
        >
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 lg:gap-4">
            <Link
              href="/blog"
              prefetch
              className="block shrink-0"
              aria-label="Blog MechatronicStore, ir al inicio"
              onClick={handleLogoClick}
            >
              <Logo className="h-9 w-auto sm:h-10" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Navegación principal">
              <a
                href={STORE_URL}
                target="_blank"
                rel="noopener"
                className="group inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-bold uppercase tracking-wider transition-colors hover:bg-[color:var(--bg-elevated)]"
                style={{ color: "var(--brand-purple)" }}
              >
                MechatronicStore
                <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <span aria-hidden className="mx-2 h-5 w-px" style={{ backgroundColor: "var(--border)" }} />

              {topCats.map((cat) => {
                const catData = data?.categories[cat] || { topTags: [], featured: null };
                return (
                  <MegaMenu
                    key={cat}
                    itemId={cat}
                    openId={openMegaId ?? undefined}
                    onOpen={(id) => setOpenMegaId(id)}
                    label={BLOG_CATEGORY_LABELS[cat] || cat}
                    href={`/blog/categoria/${BLOG_CATEGORY_SLUGS[cat] || cat.toLowerCase()}`}
                    topTags={catData.topTags}
                    featured={catData.featured}
                  />
                );
              })}
            </nav>

            {/* Right cluster */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                aria-label="Buscar"
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border text-[color:var(--text-muted)] transition-colors hover:border-[color:var(--text-muted)] hover:text-[color:var(--text)] sm:h-11 sm:w-11"
                style={{ borderColor: "var(--border)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                </svg>
              </button>

              <div className="block"><ThemeToggle /></div>

              <button
                type="button"
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full border text-[color:var(--text-muted)] hover:text-[color:var(--text)] sm:h-11 sm:w-11 lg:hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {menuOpen ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* TRENDING MARQUEE */}
        {data?.topTags && data.topTags.length > 0 && (
          <div
            className="relative border-t"
            style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg)" }}
          >
            <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 text-[12px] sm:px-6">
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
                  const target = e.target as HTMLElement;
                  if (target.closest("a")) return;
                  const anchors = e.currentTarget.querySelectorAll<HTMLAnchorElement>("a[href^='/blog/tag/']");
                  const px = e.clientX;
                  const py = e.clientY;
                  for (const a of anchors) {
                    const r = a.getBoundingClientRect();
                    if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
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
                  style={{ background: "linear-gradient(to right, var(--bg) 0%, transparent 100%)" }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12"
                  style={{ background: "linear-gradient(to left, var(--bg) 0%, transparent 100%)" }}
                />
                <div
                  className="trending-marquee-track flex shrink-0 items-center gap-1.5"
                  style={{
                    animation: `trending-scroll-x ${Math.max(40, data.topTags.length * 4)}s linear infinite`,
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
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 h-full w-12"
              style={{ background: "linear-gradient(to right, transparent, var(--bg) 75%)" }}
            />
          </div>
        )}

        {/* MOBILE DRAWER */}
        <div
          className="fixed inset-0 z-50 lg:hidden"
          style={{ pointerEvents: menuOpen ? "auto" : "none" }}
          aria-hidden={!menuOpen}
        >
          <button
            type="button"
            aria-label="Cerrar menú"
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
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border-subtle)" }}>
              <Logo className="h-7 w-auto" />
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--brand-yellow)" }}>Tienda</div>
                  <div className="text-sm font-bold" style={{ color: "var(--brand-purple)" }}>MechatronicStore</div>
                </div>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ color: "var(--brand-purple)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <div className="mb-5">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--brand-yellow)" }}>
                  Categorías
                </div>
                <ul className="space-y-0.5">
                  {BLOG_CATEGORIES.map((cat) => (
                    <li key={cat}>
                      <Link
                        href={`/blog/categoria/${BLOG_CATEGORY_SLUGS[cat] || cat.toLowerCase()}`}
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
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--brand-yellow)" }}>
                    Tendencia
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.topTags.slice(0, 12).map((t) => (
                      <Link
                        key={t.slug}
                        href={`/blog/tag/${t.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="rounded-full border px-2.5 py-1 text-xs transition-colors"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
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

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .` desde el blog.

- [ ] **Step 3: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/app/components/v2/BlogHeader.tsx
git commit -m "feat(blog): BlogHeader v2 con sticky+collapse, marquee, drawer mobile"
```

---

## Task 9: PullToRefresh + PWARegister + PushPrompt

**Files:**
- Create: `src/app/components/PullToRefresh.tsx`
- Create: `src/app/components/PWARegister.tsx`
- Create: `src/app/components/PushPrompt.tsx`

- [ ] **Step 1: Crear PullToRefresh.tsx**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

const TRIGGER_PX = 72;
const MAX_PX = 120;

type State = "idle" | "pulling" | "refreshing";

export default function PullToRefresh() {
  const [state, setState] = useState<State>("idle");
  const [pullPx, setPullPx] = useState(0);
  const startY = useRef(0);
  const startedAtTop = useRef(false);
  const triggeredHaptic = useRef(false);

  useEffect(() => {
    const hasTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (!hasTouch) return;

    function onTouchStart(e: TouchEvent) {
      if (state !== "idle") return;
      if ((document.scrollingElement?.scrollTop ?? window.scrollY) > 0) {
        startedAtTop.current = false;
        return;
      }
      startedAtTop.current = true;
      startY.current = e.touches[0].clientY;
      triggeredHaptic.current = false;
    }
    function onTouchMove(e: TouchEvent) {
      if (!startedAtTop.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        if (state !== "idle") setState("idle");
        setPullPx(0);
        return;
      }
      e.preventDefault();
      const eased = Math.min(MAX_PX, delta * 0.5);
      setPullPx(eased);
      if (state !== "pulling") setState("pulling");
      if (eased >= TRIGGER_PX && !triggeredHaptic.current) {
        triggeredHaptic.current = true;
        if ("vibrate" in navigator) navigator.vibrate(15);
      } else if (eased < TRIGGER_PX) {
        triggeredHaptic.current = false;
      }
    }
    function onTouchEnd() {
      if (!startedAtTop.current) {
        startedAtTop.current = false;
        return;
      }
      startedAtTop.current = false;
      if (state === "pulling" && pullPx >= TRIGGER_PX) {
        setState("refreshing");
        if ("vibrate" in navigator) navigator.vibrate([12, 40, 12]);
        setTimeout(() => window.location.reload(), 380);
      } else {
        setState("idle");
        setPullPx(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [state, pullPx]);

  if (state === "idle") return null;

  const progress = Math.min(1, pullPx / TRIGGER_PX);
  const rotation = progress * 360;
  const opacity = Math.min(1, progress + 0.2);
  const scale = 0.7 + progress * 0.3;

  return (
    <div
      className="ptr-indicator"
      data-state={state}
      style={{
        transform:
          state === "refreshing"
            ? "translate(-50%, 20%) scale(1)"
            : `translate(-50%, ${pullPx - 56}px) scale(${scale})`,
        opacity,
      }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--brand-purple)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        {state === "refreshing" ? (
          <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        ) : (
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.4}
            stroke="currentColor"
            style={{ transform: `rotate(${rotation}deg)`, transition: "transform 80ms linear" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12a7 7 0 11-2.05-4.95L19 9M19 4v5h-5" />
          </svg>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear PWARegister.tsx**

```tsx
"use client";
import { useEffect, useState } from "react";

const VISITS_KEY = "mechablog-visits";
const DISMISSED_KEY = "mechablog-install-dismissed";
const VISITS_BEFORE_PROMPT = 3;

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BIPEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const t = setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[SW] register failed", err));
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    setIsIOS(iOS);

    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (installed) return;

    const visits = parseInt(localStorage.getItem(VISITS_KEY) || "0", 10) + 1;
    localStorage.setItem(VISITS_KEY, String(visits));
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    if (visits < VISITS_BEFORE_PROMPT) return;

    function onBIP(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BIPEvent);
      setShowPrompt(true);
    }
    window.addEventListener("beforeinstallprompt", onBIP);

    if (iOS) {
      const t = setTimeout(() => setShowPrompt(true), 1500);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBIP);
        clearTimeout(t);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  function onInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    });
  }

  function onDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div
      className="fixed inset-x-0 z-[120] mx-auto max-w-md px-4 animate-[fadeIn_0.4s_ease-out]"
      style={{ bottom: "calc(20px + env(safe-area-inset-bottom, 0))" }}
      role="dialog"
      aria-live="polite"
    >
      <div
        className="flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
        style={{
          borderColor: "var(--border-strong)",
          backgroundColor: "var(--bg-overlay)",
          boxShadow: "0 10px 40px rgba(96,23,177,0.3)",
        }}
      >
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1">
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            Instalar MechaBlog
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {isIOS
              ? "Tocá compartir y luego \"Agregar a Pantalla de inicio\"."
              : "Acceso rápido a tutoriales sin abrir el navegador."}
          </p>
          <div className="mt-3 flex gap-2">
            {!isIOS && deferredPrompt && (
              <button
                onClick={onInstall}
                className="rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: "var(--brand-purple)",
                  color: "var(--text-on-purple)",
                }}
              >
                Instalar
              </button>
            )}
            <button
              onClick={onDismiss}
              className="rounded-md px-3 py-1.5 text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Cerrar"
          className="text-lg"
          style={{ color: "var(--text-dim)" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear PushPrompt.tsx (gated por VAPID env)**

```tsx
"use client";
import { useEffect, useState } from "react";

const VISIT_KEY = "mechablog-push-visit";
const DISMISSED_KEY = "mechablog-push-dismissed-until";
const SUBSCRIBED_FLAG = "mechablog-push-subscribed";
const SHOW_AFTER_MS = 20000;
const SHOW_ON_VISIT_N = 3;

type Status = "idle" | "granted" | "denied" | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!vapidKey) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      localStorage.setItem(SUBSCRIBED_FLAG, "1");
      return;
    }
    if (Notification.permission === "denied") return;

    const dismissed = parseInt(localStorage.getItem(DISMISSED_KEY) || "0", 10);
    if (dismissed && Date.now() < dismissed) return;

    const visits = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < 2) return;
    if (visits >= SHOW_ON_VISIT_N) {
      setShow(true);
      return;
    }
    const t = setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [vapidKey]);

  async function ensureSubscription(): Promise<boolean> {
    if (!vapidKey) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
    });
    return res.ok;
  }

  async function onAccept() {
    if (Notification.permission === "default") {
      const r = await Notification.requestPermission();
      if (r !== "granted") {
        setStatus("denied");
        setTimeout(() => setShow(false), 1200);
        return;
      }
    }
    try {
      const ok = await ensureSubscription();
      if (ok) {
        localStorage.setItem(SUBSCRIBED_FLAG, "1");
        setStatus("granted");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setTimeout(() => setShow(false), 1500);
  }

  function onDismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 14 * 24 * 60 * 60 * 1000));
    setShow(false);
  }

  if (!show || !vapidKey) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0))] left-1/2 z-[95] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 lg:bottom-6 lg:left-6 lg:translate-x-0"
    >
      <div
        className="rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-overlay)",
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(96,23,177,0.15)" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ color: "var(--brand-purple-light)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <h3 style={{ fontFamily: "Georgia, serif", color: "var(--text)" }} className="text-base font-bold leading-tight">
            Avisame cuando salga un tutorial nuevo
          </h3>
        </div>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {status === "granted" ? "Listo, vas a recibir el aviso." :
           status === "denied" ? "Activá los permisos en Configuración si cambiás de idea." :
           status === "error" ? "Algo falló. Intentá más tarde." :
           "Te avisamos el tutorial más importante del día, una notificación max."}
        </p>
        {status === "idle" && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAccept}
              className="rounded-md px-3 py-1.5 text-xs font-bold"
              style={{
                backgroundColor: "var(--brand-purple)",
                color: "var(--text-on-purple)",
              }}
            >
              Activar alertas
            </button>
            <button
              onClick={onDismiss}
              className="rounded-md px-3 py-1.5 text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              En otro momento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck los 3 archivos**

Run: `npx tsc --noEmit -p .` desde el blog.

- [ ] **Step 5: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/app/components/PullToRefresh.tsx src/app/components/PWARegister.tsx src/app/components/PushPrompt.tsx
git commit -m "feat(blog): PullToRefresh + PWARegister + PushPrompt (gated VAPID)"
```

---

## Task 10: Service Worker `public/sw.js`

**Files:**
- Create: `public/sw.js`

- [ ] **Step 1: Crear el SW**

```js
/* eslint-disable */
// MechaBlog Service Worker v1.0.0
// Estrategias:
// - HTML pages: NETWORK-ONLY con fallback /blog/offline (no cachea HTML)
// - Images same/cross-origin: stale-while-revalidate cap 60
// - CSS/JS/fonts: cache-first
// - /api/blog-header-data: stale-while-revalidate cap 30

const VERSION = "v1.0.0";
const CACHE_SHELL = `mb-shell-${VERSION}`;
const CACHE_IMAGES = "mb-images";
const CACHE_PAGES = "mb-pages";

const SHELL = [
  "/blog/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

const MAX_IMAGES = 60;
const MAX_PAGES = 30;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) =>
        Promise.all(SHELL.map((u) => cache.add(u).catch(() => {})))
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("mb-shell-") && k !== CACHE_SHELL)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, maxItems) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  await cache.delete(keys[0]);
  return trimCache(name, maxItems);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  const isImage =
    req.destination === "image" ||
    /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|$)/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      caches.open(CACHE_IMAGES).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(req, res.clone());
                trimCache(CACHE_IMAGES, MAX_IMAGES);
              }
              return res;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        }),
      ),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");
  if (isHTML) {
    event.respondWith(
      fetch(req).catch(() => caches.match("/blog/offline")),
    );
    return;
  }

  if (/\.(css|js|woff2?|ttf|otf)(\?|$)/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res && res.status === 200) {
              caches.open(CACHE_SHELL).then((c) => c.put(req, res.clone()));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/api/blog-header-data")) {
    event.respondWith(
      caches.open(CACHE_PAGES).then((cache) =>
        cache.match(req).then((cached) => {
          const fp = fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(req, res.clone());
                trimCache(CACHE_PAGES, MAX_PAGES);
              }
              return res;
            })
            .catch(() => cached);
          return cached || fp;
        }),
      ),
    );
    return;
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "MechaBlog", body: event.data.text() };
  }
  const title = payload.title || "MechaBlog";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    image: payload.image,
    tag: payload.tag || "mechablog-default",
    renotify: true,
    data: { url: payload.url || "/blog" },
    actions: [
      { action: "read", title: "Leer" },
      { action: "close", title: "Cerrar" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/blog";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const c of clients) {
          if ("focus" in c) {
            c.focus();
            c.navigate(url);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((sub) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        }),
      ),
  );
});
```

- [ ] **Step 2: Crear página /blog/offline (fallback)**

Crear `src/app/blog/offline/page.tsx`:

```tsx
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-3xl font-bold" style={{ color: "var(--text)", fontFamily: "Georgia, serif" }}>
        Sin conexión
      </h1>
      <p className="mt-4" style={{ color: "var(--text-muted)" }}>
        No tenés conexión a internet. Volvé a intentar cuando recuperes señal.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add public/sw.js src/app/blog/offline/page.tsx
git commit -m "feat(blog): service worker v1.0.0 + página offline fallback"
```

---

## Task 11: Iconos PWA

**Files:**
- Create: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-16.png`, `favicon-32.png`

- [ ] **Step 1: Verificar si ya hay favicon/logo del blog**

Run: `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && ls public/ public/icons/ 2>/dev/null`
Expected: ver qué hay actualmente.

- [ ] **Step 2: Si NO hay set completo, generar desde el logo SVG existente**

Si existe `public/logo-mechablog.svg` o similar, generar PNGs:

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
mkdir -p public/icons
# Usar sips (macOS nativo) o ImageMagick/sharp para convertir
# Si tenés el SVG:
for size in 16 32 192 512; do
  npx --yes sharp-cli -i public/logo-mechablog.svg -o "public/icons/icon-${size}.png" resize ${size} ${size}
done
# Apple touch (180×180)
npx --yes sharp-cli -i public/logo-mechablog.svg -o public/icons/apple-touch-icon.png resize 180 180
# Maskable: agregar safe area (padding 10% para que el círculo de Android no recorte logo)
# Recomendación: editar manual el SVG agregando viewBox con padding y generar maskable
```

**Alternativa pragmática si no se tiene el SVG limpio:** copiar temporalmente los iconos del store o de mechanoticias como placeholder + abrir TODO para diseñar set propio del blog.

```bash
# Placeholder pragmático:
cp /Users/pablosilvabravo/Projects/newsletter/public/icons/icon-192.png public/icons/icon-192.png
cp /Users/pablosilvabravo/Projects/newsletter/public/icons/icon-512.png public/icons/icon-512.png
cp /Users/pablosilvabravo/Projects/newsletter/public/icons/icon-maskable-192.png public/icons/icon-maskable-192.png
cp /Users/pablosilvabravo/Projects/newsletter/public/icons/icon-maskable-512.png public/icons/icon-maskable-512.png
cp /Users/pablosilvabravo/Projects/newsletter/public/icons/apple-touch-icon.png public/icons/apple-touch-icon.png
cp /Users/pablosilvabravo/Projects/newsletter/public/icons/favicon-16.png public/icons/favicon-16.png
cp /Users/pablosilvabravo/Projects/newsletter/public/icons/favicon-32.png public/icons/favicon-32.png
```

- [ ] **Step 3: Verificar dimensiones**

Run: `sips -g pixelWidth -g pixelHeight public/icons/*.png`
Expected: ver dimensiones correctas (192×192, 512×512, 180×180, etc.)

- [ ] **Step 4: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add public/icons/
git commit -m "feat(blog): iconos PWA (placeholders mecha-noticias, TODO branding propio)"
```

---

## Task 12: Wiring final en `layout.tsx`

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Leer layout.tsx completo**

Run con Read tool: `src/app/layout.tsx` completo.

- [ ] **Step 2: Reescribir layout.tsx montando todo**

```tsx
import type { Metadata, Viewport } from "next";
import { Montserrat, Baloo_2 } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import BlogHeader from "./components/v2/BlogHeader";

const PullToRefresh = dynamic(() => import("./components/PullToRefresh"));
const PWARegister = dynamic(() => import("./components/PWARegister"));
const PushPrompt = dynamic(() => import("./components/PushPrompt"));

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const BASE_URL = "https://www.mechatronicstore.cl";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Blog MechatronicStore · Tutoriales técnicos en español",
    template: "%s · Blog MechatronicStore",
  },
  description:
    "Tutoriales técnicos de electrónica, robótica, IoT y DIY. Aprende y compra los componentes en MechatronicStore.cl",
  icons: {
    icon: [
      { url: "/favicon.ico?v=1", sizes: "any" },
      { url: "/icons/favicon-32.png?v=1", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png?v=1", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png?v=1", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MechaBlog",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: `${BASE_URL}/blog`,
    siteName: "MechatronicStore Blog",
    title: "Blog MechatronicStore · Tutoriales técnicos en español",
    description: "Tutoriales técnicos de electrónica, robótica, IoT y DIY.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog MechatronicStore",
    description: "Tutoriales técnicos en español",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0E0F14" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

const THEME_INIT_SCRIPT = `
(function(){try{
  var t = localStorage.getItem('mechastore-blog-theme');
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
}catch(e){
  document.documentElement.setAttribute('data-theme', 'dark');
}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CL"
      data-theme="dark"
      className={`${montserrat.variable} ${baloo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://images.mechatronicstore.cl" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.mechatronicstore.cl" crossOrigin="" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-[color:var(--brand-purple)] focus:px-4 focus:py-2 focus:text-white focus:font-semibold focus:shadow-lg"
        >
          Saltar al contenido
        </a>
        <ThemeProvider>
          <PullToRefresh />
          <BlogHeader />
          <div id="main" className="flex-1">{children}</div>
          <PWARegister />
          <PushPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Si existe header viejo montado en page.tsx u otras pages, removerlo**

Run: `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && grep -rn "BlogHeader\|HeaderBlog" src/app/ --include="*.tsx"`
Expected: solo aparece importado desde `layout.tsx`. Si aparece importado en otras pages, remover esos imports (el header ahora se monta una vez a nivel layout).

- [ ] **Step 4: Typecheck completo**

Run: `npx tsc --noEmit -p .` desde el blog.
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add src/app/layout.tsx
git commit -m "feat(blog): wiring layout — montar BlogHeader v2 + PWA + PullToRefresh"
```

---

## Task 13: Next.js images config update

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Reescribir next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "index, follow" },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 430, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 31_536_000,
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "images.mechatronicstore.cl" },
      { protocol: "https", hostname: "**.mechatronicstore.cl" },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Build check**

Run: `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && npm run build 2>&1 | tail -40`
Expected: build completa exitosa.

- [ ] **Step 3: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add next.config.ts
git commit -m "feat(blog): next.config.ts — deviceSizes mobile + minimumCacheTTL"
```

---

## Task 14: Push to main + purge CF cache + verificación visual

**Files:** (none — verificación final)

- [ ] **Step 1: Push directo a main**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git push origin HEAD:main
```

Esperado: push exitoso. NO crear PR (regla absoluta AGENTS.md).

- [ ] **Step 2: Purgar cache Cloudflare**

Run: `cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && ./scripts/purge_cf_cache.sh`
Expected: purga exitosa (HTML core + chunks Next.js detectados).

- [ ] **Step 3: Esperar deploy Vercel (~90s)**

Run para monitorear: `gh run list --workflow=blog-monitor.yml --limit 1` o esperar curl 200.

```bash
until curl -s -o /dev/null -w "%{http_code}" https://www.mechatronicstore.cl/blog | grep -q 200; do sleep 5; done && echo "READY"
```

- [ ] **Step 4: Smoke test endpoint header data**

```bash
curl -s https://www.mechatronicstore.cl/api/blog-header-data | python3 -m json.tool | head -30
```

Expected: JSON con `topTags` (array no vacío idealmente) y `categories` (6 keys).

- [ ] **Step 5: Verificación visual con Playwright (mobile + desktop)**

Mediante el MCP tool `mcp__playwright__browser_navigate` + `browser_take_screenshot`:

```
1. Mobile viewport 375×812:
   - Navigate https://www.mechatronicstore.cl/blog
   - Screenshot scroll=0 (header expanded, marquee visible)
   - Click hamburger → screenshot drawer abierto
   - Click X → screenshot drawer cerrado
   - Scroll down 600px → screenshot (main collapsed, marquee still visible)
   - Click search icon → screenshot search overlay full screen
2. Desktop viewport 1440×900:
   - Navigate https://www.mechatronicstore.cl/blog
   - Screenshot full header con mega-menus
   - Hover sobre primera categoría → screenshot dropdown abierto
   - Click trending hashtag → verificar navegación a /blog/tag/...
```

- [ ] **Step 6: Verificar Lighthouse PWA score**

Run via Chrome DevTools o `npx lighthouse https://www.mechatronicstore.cl/blog --view --preset=desktop`:
- PWA: ≥ 90 (manifest + icons + SW + viewport todo presente)
- Performance mobile: ≥ 80
- Accessibility: ≥ 90

- [ ] **Step 7: Final commit (si algo se ajustó en step 5-6)**

Solo si hubo fixes. Si no, terminar.

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add -u
git commit -m "fix(blog): ajustes post-verificación visual"
git push origin HEAD:main
./scripts/purge_cf_cache.sh
```

---

## Notas operativas finales

**Regla absoluta:** push directo a `main` con destino explícito (`git push origin HEAD:main`). NO crear PRs ni branches.

**Auto-purge CF:** después de cada push visible al blog, correr `./scripts/purge_cf_cache.sh` SIN que Pablo lo pida.

**Skills + slash commands:** TODA skill nueva va en `~/.claude/skills/` global, nunca en proyecto.

**Service Worker:** la primera vez que se monta, los usuarios actuales del blog van a ver el banner de install después de 3 visitas. La cache HTML es network-only para evitar servir ediciones viejas.

**Datasource del marquee:** depende de `tags_json` poblado en la tabla `tutorials`. Verificar que esa columna esté siendo escrita por la Routine C / persist_blog_translation. Si está NULL en muchos tutoriales, el marquee se ve vacío.

**PushPrompt gated:** sin `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en env, no renderiza nada. Si querés activar push, generar VAPID keys + endpoint `/api/push/subscribe`.

**Iconos PWA:** placeholders de mecha-noticias por ahora. TODO: diseñar set propio del blog (logo MechaBlog con paleta MS).
