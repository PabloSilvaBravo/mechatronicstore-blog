# Header Paridad Blog ↔ Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que el header de `mechatronicstore.cl/blog` sea visualmente **idéntico** al de `mechatronicstore.cl/` (store WooCommerce), pixel por pixel — Pablo ya lo pidió 10+ veces.

**Architecture:** El blog es Next.js 16, el store es WordPress + Flatsome theme + Ajax Search Pro plugin. No podemos compartir HTML/CSS — tenemos que REPLICAR el look usando inline styles + Tailwind. El approach es: medir el store en vivo con Chrome MCP, anotar dimensiones exactas, replicarlas en los componentes del blog (`BlogHeader.tsx`, `SearchBar.tsx`, `HeaderActions.tsx`, `UtilityBar.tsx`, `Logo.tsx`).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS, TypeScript estricto, deploy Vercel auto via push a main.

---

## Pre-Task: Auditoría visual side-by-side

**Por qué primero:** Ya hicimos varios fixes parciales sin tener mediciones exhaustivas y por eso quedaron diferencias. Antes de tocar más código, tomar screenshots **uno arriba del otro** y anotar **TODAS las diferencias** con coordenadas/dimensiones reales.

**Files:** ningún cambio de código en este paso.

- [ ] **Step 1: Screenshot store header**

Abrir tab existente `https://www.mechatronicstore.cl/` y tomar screenshot con `mcp__Control_Chrome__execute_javascript` ejecutando `document.querySelector('.header-wrapper').getBoundingClientRect()` + viewport screenshot del top 200px.

- [ ] **Step 2: Screenshot blog header**

Abrir tab `https://www.mechatronicstore.cl/blog` (hard reload con `Cmd+Shift+R`) y tomar screenshot del top 200px.

- [ ] **Step 3: Generar tabla de mediciones**

Script de inspección que mide AMBOS headers en paralelo:

```js
const measure = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  return {
    w: Math.round(r.width),
    h: Math.round(r.height),
    top: Math.round(r.top),
    bg: cs.backgroundColor,
    radius: cs.borderRadius,
    padding: cs.padding,
    fontSize: cs.fontSize,
    color: cs.color,
  };
};

const result = {
  rowH: measure(document.querySelector('header > div, .header-main')),
  logo: measure(document.querySelector('header img, .header_logo img')),
  searchWrapper: measure(document.querySelector('input[placeholder*="Buscar"]')?.closest('form, .asp_w')),
  searchInput: measure(document.querySelector('input[placeholder*="Buscar"]')),
  searchIcon: measure(document.querySelector('input[placeholder*="Buscar"]')?.closest('form, .asp_w')?.querySelector('button, svg')),
  cartIcon: measure(document.querySelector('a.header-cart-link, a[href*="cart"]')),
  userIcon: measure(document.querySelector('a[href*="cuenta"], a[href*="account"]')),
  suscribete: measure([...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Suscríbete')),
  cotizar: measure([...document.querySelectorAll('a')].find(a => /^cotizar/i.test(a.textContent.trim()))),
  shipping: measure(document.querySelector('li.header-shipping-trigger')),
};
window.__measure = JSON.stringify(result, null, 2);
window.__measure;
```

Correr en ambos tabs. Guardar en `data/header-audit-store.json` y `data/header-audit-blog.json`.

- [ ] **Step 4: Generar diff legible**

Crear `data/header-audit-diff.md` con tabla:
```
| Elemento     | Store           | Blog            | Δ        | Acción  |
|--------------|-----------------|-----------------|----------|---------|
| Row h        | 64              | 56              | -8       | subir 8 |
| Logo         | 100x40          | 120x40          | -20w     | reducir |
| Search W/H   | 477x44          | 477x44          | =        | OK      |
| Search radius| 10              | 10              | =        | OK      |
...
```

Esta tabla **es el spec ejecutable** — cada fila con Δ no-cero genera un task.

- [ ] **Step 5: Commit audit baseline**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git add data/header-audit-store.json data/header-audit-blog.json data/header-audit-diff.md
git commit -m "chore(header): baseline audit blog vs store (paridad WIP)"
git push origin HEAD:main
```

---

## Task 1: Logo dimensions

**Files:**
- Modify: `src/components/Logo.tsx`
- Modify: `src/app/blog/components/BlogHeader.tsx:170-177` (donde se renderiza `<Logo size="md" />`)

**Mediciones store** (target a alcanzar):
- Logo h ~40px, w ~100-120px (verificar en Step 3 del audit)
- En desktop: hover opacity 0.8

- [ ] **Step 1: Leer Logo.tsx actual**

```bash
cat src/components/Logo.tsx
```

Anotar: prop `size`, dimensiones actuales para `md`, si usa `<img>` o SVG inline.

- [ ] **Step 2: Comparar contra store**

Si store usa `h=40, w=100` y blog actual con `size="md"` da `h=40, w=120` → cambiar `size="md"` a una constante que dé `h=40, w≈100`. O agregar un nuevo size, o ajustar el ratio.

- [ ] **Step 3: Aplicar el ajuste**

Edit `src/components/Logo.tsx` para que `size="md"` produzca exactamente el tamaño del store. Si la diferencia es <5px no tocar (es ruido sub-perceptual).

- [ ] **Step 4: Verificar local**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
npx tsc --noEmit -p .
```

Esperado: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/Logo.tsx
git commit -m "fix(header): logo dimensions match store (paridad task 1)"
git push origin HEAD:main
```

---

## Task 2: SearchBar height + radius + padding

**Files:**
- Modify: `src/app/blog/components/SearchBar.tsx:357-363` (donde está el `<form>` purple)

**Estado actual** (commit `ce279bc`): height 44px, radius 10px, paddingLeft 16, paddingRight 6.

**Target store** (medir en Step 3 del audit):
- height: ESPERADO 44-48px → confirmar exacto
- radius: ESPERADO 10-12px → confirmar exacto
- padding: ESPERADO 12-16 lr → confirmar exacto

- [ ] **Step 1: Leer state actual**

```bash
sed -n '345,365p' src/app/blog/components/SearchBar.tsx
```

- [ ] **Step 2: Aplicar mediciones reales**

Si el store mide `height: 48, radius: 12, paddingLeft: 14, paddingRight: 8`:

```tsx
<form
  onSubmit={handleSubmit}
  className="group flex items-center gap-2 transition-all"
  style={{
    background: "var(--brand-purple)",
    border: "none",
    borderRadius: "12px",    // matchea store
    height: "48px",          // matchea store
    paddingLeft: "14px",
    paddingRight: "8px",
  }}
>
```

(números reales vendrán del audit Step 3).

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 4: Commit**

```bash
git add src/app/blog/components/SearchBar.tsx
git commit -m "fix(searchbar): height/radius/padding exact match store (paridad task 2)"
git push origin HEAD:main
```

---

## Task 3: SearchBar lupa button — size, color, position

**Files:**
- Modify: `src/app/blog/components/SearchBar.tsx:407-432` (el `<button type="submit">` con la lupa)

**Estado actual:** botón 36×36 transparent, svg 22×22 stroke white 2.4.

**Target store:** según mediciones del audit. La lupa del store es CIRCULAR amarilla o transparent? Verificar.

- [ ] **Step 1: Inspeccionar la lupa del store con MCP**

```js
const input = document.querySelector('input[placeholder*="Buscar"]');
const btn = input?.closest('form, .asp_w')?.querySelector('button[type="submit"], button.search-submit, .asp_button');
if (btn) {
  const r = btn.getBoundingClientRect();
  const cs = window.getComputedStyle(btn);
  window.__lupa = JSON.stringify({
    w: Math.round(r.width),
    h: Math.round(r.height),
    bg: cs.backgroundColor,
    radius: cs.borderRadius,
    svgW: btn.querySelector('svg')?.getAttribute('width'),
    svgH: btn.querySelector('svg')?.getAttribute('height'),
    svgColor: btn.querySelector('svg path, svg circle')?.getAttribute('stroke') || btn.querySelector('svg path, svg circle')?.getAttribute('fill'),
  });
}
window.__lupa;
```

- [ ] **Step 2: Adaptar el botón**

Caso A — lupa es CIRCULAR amarilla (común en Ajax Search Pro):

```tsx
<button
  type="submit"
  aria-label="Buscar"
  className="flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80"
  style={{
    width: "36px",
    height: "36px",
    background: "var(--brand-yellow)",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    color: "var(--text-on-yellow)",
  }}
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3-3" />
  </svg>
</button>
```

Caso B — lupa es TRANSPARENT con icono blanco (estado actual). No cambiar nada.

Decidir según mediciones Step 1.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 4: Commit**

```bash
git add src/app/blog/components/SearchBar.tsx
git commit -m "fix(searchbar): lupa color+size match store (paridad task 3)"
git push origin HEAD:main
```

---

## Task 4: Action icons (carrito, usuario) — size, radius, bg

**Files:**
- Modify: `src/app/blog/components/HeaderActions.tsx`

**Mediciones store** (datos previos):
- icons: 32×33 px, bg `rgb(96, 23, 177)` (`var(--brand-purple)`), radius 12px

**Estado actual blog:** verificar con audit Step 3.

- [ ] **Step 1: Leer HeaderActions.tsx**

```bash
cat src/app/blog/components/HeaderActions.tsx
```

- [ ] **Step 2: Anotar deltas**

Diff entre blog actual y store:
- ¿Tamaño actual? si es 36×36 y store es 32×33 → reducir
- ¿bg actual? si es `var(--brand-purple)` → OK
- ¿radius actual? si es 8px y store es 12px → subir

- [ ] **Step 3: Aplicar exact dimensions**

```tsx
// Aplicar a cada link/button del cluster:
style={{
  width: "32px",
  height: "33px",
  background: "var(--brand-purple)",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
}}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit -p .
```

- [ ] **Step 5: Commit**

```bash
git add src/app/blog/components/HeaderActions.tsx
git commit -m "fix(header): action icons 32x33 radius 12 (paridad task 4)"
git push origin HEAD:main
```

---

## Task 5: Gap entre items del cluster derecho

**Files:**
- Modify: `src/app/blog/components/BlogHeader.tsx:192` (`<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">`)

**Mediciones store:** el store usa gaps específicos entre Suscríbete | divider | COTIZAR | cart | user | shipping. Medir uno por uno.

- [ ] **Step 1: Medir gaps store**

```js
const cluster = document.querySelector('.flex-col.hide-for-medium.flex-right, .header-elements');
if (cluster) {
  const items = Array.from(cluster.children);
  const out = [];
  for (let i = 1; i < items.length; i++) {
    const a = items[i-1].getBoundingClientRect();
    const b = items[i].getBoundingClientRect();
    out.push(`${i-1}→${i}: ${Math.round(b.left - a.right)}px`);
  }
  window.__gaps = out.join('\n');
}
window.__gaps;
```

- [ ] **Step 2: Aplicar gaps**

Si store usa `gap: 12px` consistente:

```tsx
<div className="flex items-center flex-shrink-0" style={{ gap: "12px" }}>
```

Si gaps varían entre items, separarlos con `<div style={{ marginRight: 'Xpx' }}>` por item.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/BlogHeader.tsx
git commit -m "fix(header): cluster gaps match store (paridad task 5)"
git push origin HEAD:main
```

---

## Task 6: Suscríbete styling

**Files:**
- Modify: `src/app/blog/components/HeaderActions.tsx` (donde está el link `Suscríbete`)

**Mediciones store:** font-size, color, font-weight, padding lateral, dot amarillo (presencia + size).

- [ ] **Step 1: Medir store**

```js
const susc = [...document.querySelectorAll('a')].find(a => a.textContent?.trim() === 'Suscríbete');
if (susc) {
  const cs = window.getComputedStyle(susc);
  window.__susc = JSON.stringify({
    fs: cs.fontSize,
    fw: cs.fontWeight,
    color: cs.color,
    pad: cs.padding,
    hasDot: !!susc.querySelector('.dot, [style*="yellow"]'),
  });
}
window.__susc;
```

- [ ] **Step 2: Aplicar al blog**

```tsx
<Link
  href="https://www.mechatronicstore.cl/suscribete/?utm_source=blog"
  className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity"
  style={{
    fontSize: "13px",        // del store
    fontWeight: 600,         // del store
    color: "var(--text)",    // del store
    padding: "0 8px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  }}
>
  <span style={{
    width: "8px", height: "8px",
    borderRadius: "9999px",
    background: "var(--brand-yellow)",
    flexShrink: 0,
  }} aria-hidden />
  Suscríbete
</Link>
```

Valores exactos vienen del Step 1.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/HeaderActions.tsx
git commit -m "fix(header): suscríbete styling match store (paridad task 6)"
git push origin HEAD:main
```

---

## Task 7: COTIZAR button + badge NUEVO

**Files:**
- Modify: `src/app/blog/components/HeaderActions.tsx` (botón COTIZAR)

**Mediciones store:** bg amarillo, color texto, font-size, padding, radius, badge "NUEVO" position (top-right corner) + bg + color.

- [ ] **Step 1: Medir COTIZAR store**

```js
const cot = [...document.querySelectorAll('a')].find(a => /^cotizar/i.test(a.textContent?.trim() || ''));
if (cot) {
  const r = cot.getBoundingClientRect();
  const cs = window.getComputedStyle(cot);
  const nuevo = cot.querySelector('.badge, .new, [class*="nuevo"]') || [...cot.querySelectorAll('*')].find(x => x.textContent?.trim() === 'NUEVO');
  const nCs = nuevo ? window.getComputedStyle(nuevo) : null;
  window.__cot = JSON.stringify({
    w: Math.round(r.width), h: Math.round(r.height),
    bg: cs.backgroundColor, color: cs.color, fs: cs.fontSize, fw: cs.fontWeight,
    radius: cs.borderRadius, pad: cs.padding,
    nuevoBg: nCs?.backgroundColor, nuevoColor: nCs?.color,
    nuevoFs: nCs?.fontSize, nuevoPos: nCs?.position,
    nuevoTop: nuevo?.getBoundingClientRect().top - r.top,
    nuevoLeft: nuevo?.getBoundingClientRect().left - r.left,
  });
}
window.__cot;
```

- [ ] **Step 2: Replicar exacto**

```tsx
<Link
  href="https://www.mechatronicstore.cl/cotizar/?utm_source=blog"
  className="relative hidden md:inline-flex items-center justify-center transition-opacity hover:opacity-90"
  style={{
    background: "var(--brand-yellow)",
    color: "var(--text-on-yellow)",
    fontSize: "13px",
    fontWeight: 700,
    padding: "8px 18px",
    borderRadius: "8px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  }}
>
  Cotizar
  <span
    className="absolute"
    style={{
      top: "-8px",
      right: "-6px",
      background: "#1a1a1a",   // negro o color del store
      color: "var(--brand-yellow)",
      fontSize: "9px",
      fontWeight: 700,
      padding: "2px 6px",
      borderRadius: "4px",
      letterSpacing: "0.06em",
    }}
  >
    NUEVO
  </span>
</Link>
```

Valores exactos del Step 1.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/HeaderActions.tsx
git commit -m "fix(header): COTIZAR + badge NUEVO match store (paridad task 7)"
git push origin HEAD:main
```

---

## Task 8: Shipping trigger refinamiento (Enviar a / Elegir ubicación)

**Files:**
- Modify: `src/app/blog/components/BlogHeader.tsx:43-80` (función `ShippingTriggerStub`)

**Estado actual:** SVG pin 22×22 morado, "Enviar a" 10px uppercase dim, "Elegir ubicación" 13px bold.

**Target store:** width total 151px height 43px (medido previamente). Verificar fontSize exacto + spacing pin↔texto.

- [ ] **Step 1: Medir trigger store con detalle**

```js
const ship = document.querySelector('li.header-shipping-trigger');
const trigger = ship?.querySelector('.mecha-header-trigger, .mecha-trigger');
const labels = [...(ship?.querySelectorAll('*') || [])].filter(el => {
  const t = el.textContent?.trim() || '';
  return (t === 'Enviar a' || /^elegir/i.test(t)) && el.children.length === 0;
});
window.__ship = JSON.stringify({
  triggerW: Math.round(trigger?.getBoundingClientRect().width || 0),
  triggerH: Math.round(trigger?.getBoundingClientRect().height || 0),
  triggerPad: trigger ? window.getComputedStyle(trigger).padding : null,
  svgW: ship?.querySelector('svg')?.getAttribute('width'),
  svgH: ship?.querySelector('svg')?.getAttribute('height'),
  svgColor: ship?.querySelector('svg path, svg')?.getAttribute('stroke') || ship?.querySelector('svg path')?.getAttribute('fill'),
  labels: labels.map(l => ({
    text: l.textContent?.trim(),
    fs: window.getComputedStyle(l).fontSize,
    color: window.getComputedStyle(l).color,
    fw: window.getComputedStyle(l).fontWeight,
  })),
});
window.__ship;
```

- [ ] **Step 2: Ajustar ShippingTriggerStub**

Si el store usa pin 32×32 con stroke morado (`rgb(96,23,177)`) + "Enviar a" 11px `rgb(102,102,102)` regular + "Elegir ubicación" 14px bold `rgb(0,0,0)`:

```tsx
function ShippingTriggerStub() {
  return (
    <a
      href="https://www.mechatronicstore.cl/?utm_source=blog&utm_medium=header"
      className="hidden md:flex items-center gap-3 hover:opacity-80 transition-opacity"
      title="Cambiar ubicación de envío"
      aria-label="Cambiar ubicación de envío"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--brand-purple)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 400 }}>
          Enviar a
        </span>
        <span style={{ fontSize: "14px", color: "var(--text)", fontWeight: 700 }}>
          Elegir ubicación
        </span>
      </span>
    </a>
  );
}
```

Valores exactos del Step 1.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/BlogHeader.tsx
git commit -m "fix(header): shipping trigger size/font exact (paridad task 8)"
git push origin HEAD:main
```

---

## Task 9: Row 2 height + vertical alignment

**Files:**
- Modify: `src/app/blog/components/BlogHeader.tsx:168-169` (el `<div>` que envuelve la row 2 con `py-3`)

**Mediciones store:** el row 2 (.header-main) tiene height específica. Si store mide 64px y blog actualmente da 56px → subir el `py-3` (24px) a `py-4` (32px) o usar `style={{ height: "64px" }}`.

- [ ] **Step 1: Medir altura row 2**

```js
const main = document.querySelector('.header-main, header > div:nth-child(2)');
window.__row2 = main ? `${Math.round(main.getBoundingClientRect().height)}px` : 'not-found';
window.__row2;
```

- [ ] **Step 2: Si row blog ≠ row store, ajustar**

Por ejemplo si store=64 y blog=56:

```tsx
<div className="flex items-center gap-3 sm:gap-5" style={{ height: "64px" }}>
```

(reemplaza `py-3` por height explícito).

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/BlogHeader.tsx
git commit -m "fix(header): row 2 height match store (paridad task 9)"
git push origin HEAD:main
```

---

## Task 10: Background + border-bottom + backdrop-blur

**Files:**
- Modify: `src/app/blog/components/BlogHeader.tsx:155-163` (el `<header>` sticky outer)

**Estado actual:** `bg-[color:var(--bg-card)]/85`, `backdrop-filter: blur(12px)`, `border-bottom: 1px solid var(--border-subtle)`.

**Mediciones store:** verificar si el header del store tiene blur, qué color exacto, qué border-bottom.

- [ ] **Step 1: Inspeccionar header store**

```js
const h = document.querySelector('.header-wrapper, header > div:first-child');
if (h) {
  const cs = window.getComputedStyle(h);
  window.__hdr = JSON.stringify({
    bg: cs.backgroundColor,
    blur: cs.backdropFilter || cs.webkitBackdropFilter,
    borderBottom: cs.borderBottom,
    boxShadow: cs.boxShadow,
  });
}
window.__hdr;
```

- [ ] **Step 2: Replicar**

Si store usa `bg: white solid`, `no blur`, `border-bottom: 1px solid #e5e5e5`, `no shadow`:

```tsx
<header
  className="sticky top-0 z-40"
  style={{
    background: "var(--bg-card)",
    borderBottom: "1px solid var(--border-subtle)",
  }}
>
```

(remover blur + opacity).

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/BlogHeader.tsx
git commit -m "fix(header): bg/blur/border match store (paridad task 10)"
git push origin HEAD:main
```

---

## Task 11: UtilityBar — barra "Envío gratis a todo Chile"

**Files:**
- Modify: `src/app/blog/components/UtilityBar.tsx`
- Modify: `src/app/blog/layout.tsx` (donde se monta UtilityBar)

**Mediciones store:** el store puede tener UNA barra arriba con texto centrado "Envío gratis a todo Chile sobre $X", height ~30px, bg morado oscuro o amarillo.

- [ ] **Step 1: Inspeccionar UtilityBar store**

```js
const top = document.querySelector('.header-top, .top-bar');
if (top) {
  const r = top.getBoundingClientRect();
  const cs = window.getComputedStyle(top);
  window.__ub = JSON.stringify({
    h: Math.round(r.height),
    bg: cs.backgroundColor,
    color: cs.color,
    fs: cs.fontSize,
    text: top.textContent?.trim().slice(0, 100),
  });
}
window.__ub;
```

- [ ] **Step 2: Comparar con blog**

```bash
cat src/app/blog/components/UtilityBar.tsx | head -50
```

- [ ] **Step 3: Igualar texto + estilo**

Si store dice "Envío gratis a todo Chile sobre $50.000" con bg `#3c1171` color blanco fs 12px → blog UtilityBar debe usar exactamente lo mismo. Editar `text` constante y estilos.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/UtilityBar.tsx
git commit -m "fix(header): UtilityBar text + bg match store (paridad task 11)"
git push origin HEAD:main
```

---

## Task 12: Row 3 navigation menu — items, fonts, hover

**Files:**
- Modify: `src/app/blog/components/BlogHeader.tsx:225-468` (la sección `<nav>` row 3)

**Mediciones store:** items del menú = Inicio, Categorías, Marca X, etc. — el blog tiene Inicio, Tutoriales, Categorías, Mecha Noticias, Tienda. Si Pablo quiere paridad TOTAL, los items deberían ser similares al store o explícitamente diferentes. **DECISIÓN:** mantener items distintos (porque blog y store son sitios distintos) pero alinear FUENTE, COLOR, SPACING, HOVER underline.

- [ ] **Step 1: Inspeccionar nav store**

```js
const nav = document.querySelector('.nav-row, .header-nav, .nav-bottom');
if (nav) {
  const link = nav.querySelector('a');
  const cs = window.getComputedStyle(link);
  window.__nav = JSON.stringify({
    fs: cs.fontSize,
    fw: cs.fontWeight,
    color: cs.color,
    pad: cs.padding,
    tt: cs.textTransform,
    ls: cs.letterSpacing,
  });
}
window.__nav;
```

- [ ] **Step 2: Ajustar nav blog**

Aplicar mismos `font-size`, `font-weight`, `text-transform`, `letter-spacing` a los `<Link>` de la nav row 3 del blog. NO cambiar la lista de items (los items son intrínsecamente distintos).

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/BlogHeader.tsx
git commit -m "fix(header): nav row font+spacing match store (paridad task 12)"
git push origin HEAD:main
```

---

## Task 13: Sticky behavior on scroll

**Files:**
- Modify: `src/app/blog/components/BlogHeader.tsx:148-163` (el `<header sticky>`)

**Mediciones store:** ¿el header del store se queda pegado arriba al scroll? ¿La fila utility bar también o solo el row 2?

- [ ] **Step 1: Probar scroll en store**

Manualmente scrollear en el tab del store y observar cuál fila persiste.

- [ ] **Step 2: Configurar blog igual**

Si el store mantiene solo row 2 sticky (no utility bar):

```tsx
// UtilityBar fuera del header sticky
<UtilityBar />
<header className="sticky top-0 z-40" style={{...}}>
  {/* row 2 + row 3 */}
</header>
```

Si store mantiene todo sticky: blog ya está OK.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/BlogHeader.tsx src/app/blog/layout.tsx
git commit -m "fix(header): sticky behavior match store (paridad task 13)"
git push origin HEAD:main
```

---

## Task 14: Search bar focus state

**Files:**
- Modify: `src/app/blog/components/SearchBar.tsx` (focus styles)

**Mediciones store:** ¿qué hace el search del store cuando tiene focus? ¿box-shadow? ¿outline? ¿abrir dropdown?

- [ ] **Step 1: Hacer focus en store y medir**

```js
const inp = document.querySelector('input[placeholder*="Buscar"]');
inp?.focus();
setTimeout(() => {
  const wrapper = inp.closest('form, .asp_w');
  const cs = window.getComputedStyle(wrapper);
  window.__focus = JSON.stringify({
    shadow: cs.boxShadow,
    border: cs.border,
    outline: cs.outline,
  });
}, 200);
setTimeout(() => window.__focus, 300);
```

- [ ] **Step 2: Replicar en blog**

Si store usa shadow `0 0 0 3px rgba(96,23,177,0.2)` en focus, agregar a SearchBar:

```tsx
<form
  ...
  className="group flex items-center gap-2 transition-all focus-within:shadow-[0_0_0_3px_rgba(96,23,177,0.2)]"
  ...
>
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p .
git add src/app/blog/components/SearchBar.tsx
git commit -m "fix(searchbar): focus state match store (paridad task 14)"
git push origin HEAD:main
```

---

## Task 15: Cleanup imports + dead code

**Files:**
- Modify: `src/app/blog/components/BlogHeader.tsx`
- Modify: `src/app/blog/components/SearchBar.tsx`

**Por qué:** después de varios refactors quedaron imports no usados, useState que ya no se usa, comentarios obsoletos.

- [ ] **Step 1: Detectar unused imports**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
npx eslint --quiet src/app/blog/components/BlogHeader.tsx src/app/blog/components/SearchBar.tsx 2>&1 | head -30
```

- [ ] **Step 2: Remover unused**

Si `ThemeToggle` no se usa en BlogHeader (caso si Task 13/x decidió quitarlo del mobile drawer también): remover import. Si `useSearchOverlay` no se usa: remover.

- [ ] **Step 3: Typecheck + lint**

```bash
npx tsc --noEmit -p .
npx eslint --quiet src/app/blog/components/
```

Esperado: 0 errores, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/app/blog/components/
git commit -m "chore(header): cleanup unused imports + dead code (paridad task 15)"
git push origin HEAD:main
```

---

## Task 16: Visual regression — side-by-side final

**Files:**
- Crear: `data/header-paridad-verify.md` (reporte final)

**Por qué:** confirmar que los 15 tasks anteriores efectivamente cerraron las diferencias.

- [ ] **Step 1: Re-correr audit Step 3 con nuevo deploy**

Recargar `mechatronicstore.cl/blog` con hard reset y volver a correr el script de mediciones del Pre-Task Step 3.

- [ ] **Step 2: Generar diff post-fix**

Comparar JSON nuevo del blog vs el JSON del store. Tabla:
```
| Elemento     | Store | Blog post | Δ |
|--------------|-------|-----------|---|
| Row h        | 64    | 64        | = |
| Logo         | 100x40| 100x40    | = |
| Search W/H   | 477x44| 477x44    | = |
```

Todas las filas deben mostrar `Δ = =`. Si alguna sigue distinta, agregar task adicional.

- [ ] **Step 3: Screenshot final blog**

Capturar screenshot del top 200px del blog post-deploy y guardarlo en `data/header-blog-final.png`.

- [ ] **Step 4: Screenshot final store**

Mismo para store en `data/header-store-final.png`.

- [ ] **Step 5: Comparación lado-a-lado**

Combinar ambas imágenes en una sola (lado a lado o una arriba de la otra) y guardarla en `data/header-comparison.png`. Adjuntar en el reporte md.

- [ ] **Step 6: Commit reporte**

```bash
git add data/header-paridad-verify.md data/header-blog-final.png data/header-store-final.png data/header-comparison.png
git commit -m "chore(header): paridad blog/store verificada visualmente"
git push origin HEAD:main
```

- [ ] **Step 7: Reporte a Pablo**

Mensaje en el chat:
> Paridad header completada. Mediciones blog vs store: 0 Δ en X elementos. Adjunto comparativa. Si ves alguna diferencia residual, marcame con flecha y la corrijo puntual.

---

## Self-Review (run after writing this plan)

**1. Spec coverage:**
- Logo ✓ Task 1
- SearchBar dimensions ✓ Task 2
- SearchBar lupa ✓ Task 3
- Action icons ✓ Task 4
- Cluster gaps ✓ Task 5
- Suscríbete ✓ Task 6
- COTIZAR + NUEVO ✓ Task 7
- Shipping trigger ✓ Task 8
- Row 2 height ✓ Task 9
- Background + border ✓ Task 10
- UtilityBar ✓ Task 11
- Nav row 3 ✓ Task 12
- Sticky behavior ✓ Task 13
- Search focus ✓ Task 14
- Cleanup ✓ Task 15
- Verify final ✓ Task 16

**2. Placeholder scan:** todos los `<measure>` y números genéricos se reemplazan en Step 1 de cada task con valores reales del audit. No hay "TODO" libres.

**3. Type consistency:** los nombres de props (`size="md"`, `variant="full"`) se mantienen consistentes entre tasks. Los componentes referenciados (`<ShippingTriggerStub />`, `<SearchBar />`, `<HeaderActions />`) existen ya en el codebase.

---

## Notas de ejecución

- **Cada task hace push directo a `main`** (regla del proyecto, no PRs)
- **El deploy de Vercel** se ejecuta automáticamente con cada push. Después de Task X, esperar ~60s antes de hacer hard reset y verificar visual.
- **Hard reset = Cmd+Shift+R** en Chrome. NO usar Cmd+R porque pega caché.
- **Si alguna medición del store da `null` o `not-found`** en los scripts, NO inventar valores — pedirle a Pablo screenshot o hacer manual con DevTools.
- **Si después del Task 16 sigue habiendo Δ** en alguna métrica, escribir un Task 17+ específico para ese elemento, no hackear.
