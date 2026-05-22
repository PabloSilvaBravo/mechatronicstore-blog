# DEEP-INSPECT mechatronicstore.cl — 2026-05-21

Inspección profunda de la web de referencia (store) para alimentar la skill `web-visual-audit` con patrones reales. 6 pases de JS sobre la home renderizada.

## Stack tech

- **CMS**: WordPress 6.x + WooCommerce
- **Theme**: Flatsome 3.20.5 + child theme `flatsome-child`
- **Performance plugin**: WP Rocket 3.19.4 (genera `meta[name="generator"]`)
- **Iconfont**: Flatsome `fl-icons.woff2/ttf` (~140KB, propietario)
- **Body font**: Montserrat 400 self-hosted (`/wp-content/fonts/montserrat/montserrat-v29-latin-regular.woff2`)
- **Analytics**: GA4 `G-S5PGR1C3CN`, GTM `GTM-58BCXNL`, Klaviyo (signup form + tracking)
- **Search plugin**: WP Dreams AjaxSearchPro (`ajaxsearchpro1_1`)
- **Sliders**: Flickity (genera `cursor: grab` en `.flickity-viewport`)
- **Cart Flow Pro**: define `--cfw-*` CSS vars (cart flow UI)

## Diferencias clave vs lo que asumí antes

| Asunción incorrecta | Realidad |
|---|---|
| Header sticky/fixed | `position: relative`, NO sticky. Solo `.banner-container-fixed` (utility bar) está fixed |
| Usa design tokens propios | NO — colores hardcoded en cada lugar. NO existe `--brand-purple` global |
| Logo es texto SVG (mechatronic + STORE.CL) | Es `<img src=".../logo-pagina-1.webp">` 609×220px raster |
| Variable fonts modernas | Montserrat estático 400, NO `font-variation-settings` |
| Hover effects llamativos | `transition: all 0.3s` declarada pero hover styles cambian casi nada visualmente |
| Búsqueda nativa | Es plugin Ajax Search Pro con HTML wrapper específico (`.asp_w .probox .proinput`) |
| `<dialog>` nativos | NO — usa `<div role="dialog" aria-modal="true">` (`.mecha-modal`) |

## Patrones que la skill DEBE capturar (NO los capturaba)

### 1. Pre-header banner fijo (`.banner-container-fixed`)

```css
position: fixed; top: 0; z-index: 1200; height: 44px;
background: linear-gradient(
  rgb(18, 18, 18) -50%,
  rgb(96, 23, 177) 200%,
  rgb(0, 0, 0) 250%
);
```

Está SOBRE el header (z-1200 vs header z-1001). El header empuja `margin-top: 44px` por debajo.

### 2. Suscríbete animado completo

```css
:root {
  --ms-dot-on: #ffef37;
  --ms-dot-off: #0b0b0b;
}
@keyframes msPulse {
  0%, 100% { background-color: var(--ms-dot-off); box-shadow: none; }
  50%      { background-color: var(--ms-dot-on); box-shadow: 0 0 12px 3px rgba(255,239,55,.4); }
}
.ms-kl-btn { display: inline-flex; align-items: center; gap: 8px; background: none; border: none; padding: 0; cursor: pointer; }
.ms-kl-btn .ms-dot { width: 10px; height: 10px; border-radius: 50%; animation: msPulse 2.4s ease-in-out infinite; flex: 0 0 10px; }
.ms-kl-btn .ms-kl-text { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
```

### 3. Cotizar pill (inline style + ::after pulse)

```html
<a class="slide" style="display:inline-flex;align-items:center;height:30px;padding:0 8px;font-size:12px;line-height:1;border:1px solid #fff;border-radius:12px;background:#6017b1;color:#fff;">COTIZAR</a>
```

```css
.html_top_right_text .topbar .slide::after {
  content: "NUEVO";
  position: absolute; top: -8px; right: -12px;
  background: gold; color: rgb(26, 26, 26);
  font-size: 9px; font-weight: 700;
  padding: 2px 6px; border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,.3);
  animation: pulse-badge 2s ease-in-out infinite;
}
@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.08); }
}
```

### 4. Iconos cart/user (Flatsome `round is-small`)

```css
.header-cart-link {
  background: rgb(96, 23, 177);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;        /* NO 4px */
  width: 32px; height: 33px;
  transition: transform .3s, border .3s, background .3s, box-shadow .3s, opacity .3s, color .3s;
}
.icon-shopping-bag {
  font-family: 'fl-icons';
  font-size: 15.36px;
  color: #fff;
}
.icon-shopping-bag::after {
  content: "15";                /* cart count, data-icon-label */
  position: absolute; top: -12px; right: -12px;
  background: rgb(96, 23, 177); color: #fff;
  width: 17px; height: 17px;
  border-radius: 99px; font-size: 11px;
}
```

### 5. Search bar (Ajax Search Pro wrapper)

```html
<div class="asp_w_container">
  <div class="asp_w wpdreams_asp_sc ajaxsearchpro" data-id="1">
    <div class="probox">
      <div class="proinput">
        <form><input type="search" class="orig" placeholder="Buscar..." name="phrase"></form>
      </div>
      <button class="promagnifier"><span class="innericon"><svg>...</svg></span></button>
      <div class="proloading"><div class="asp_loader"></div></div>
    </div>
  </div>
</div>
```

Background del wrapper: `linear-gradient(60deg, rgb(96,23,177), rgb(96,23,177))` (sólido).
Magnifier: `linear-gradient(rgb(96,23,177), rgb(96,23,177))`.

### 6. JSON-LD `@graph` profundo

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {"@type": "Place", "geo": {"@type": "GeoCoordinates", "latitude": "-34.9833", "longitude": "-71.2333"}},
    {"@type": ["Store", "Organization"], ...},
    {"@type": "WebSite", ...},
    {"@type": "ImageObject", ...},
    {"@type": "WebPage", ...},
    {"@type": "Service", ...}
  ]
}
```

Critical: `Store` + `Organization` mismo nodo, `GeoCoordinates` literal en `Place`.

### 7. OG con metadata extra Yoast-style

```html
<meta name="twitter:label1" content="Escrito por">
<meta name="twitter:data1" content="Mechatronicstore">
<meta name="twitter:label2" content="Tiempo de lectura">
<meta name="twitter:data2" content="5 minutos">
```

### 8. Resource hints estrategia

- **2 preloads**: logo (siempre) + banner-escritorio.webp (`media: "(min-width: 1601px)"` — solo desktop ultra-wide)
- **6 preconnects**: GA, GTM, Klaviyo (tracking-first)
- **5 prefetches**: chunks JS de Flatsome (slider, popups, tooltips, woocommerce) — deferred non-critical
- **NO modulepreload** (no usa ES modules)
- **NO `<link rel="preload" as="font">`** (Montserrat self-hosted no se preloadea, podría mejorarse)

### 9. Imágenes — gaps de performance

- 180 imgs totales
- Solo 19 con `srcset` (10.5%)
- **0 con `loading="lazy"`** (problema performance — debería ser 90%+ lazy)
- 7 `<picture>` elements (responsive art direction)
- LCP image: logo con `decoding="async" fetchpriority="high"` ✓

### 10. Breakpoints (Flatsome aggressive responsive)

30 breakpoints distintos. Los principales:
- `max-width: 549px` (mobile portrait)
- `max-width: 768px` (tablet portrait)
- `max-width: 1024px` (tablet landscape)
- `min-width: 850px` (desktop small)
- `min-width: 1168px` (desktop)
- `min-width: 1601px` (desktop ultra-wide)
- `min-width: 1901px` (ultra-wide premium)

Decisión arquitectural: el blog usa 5 breakpoints Tailwind (`sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`). Para alinearse exactamente habría que adoptar los breakpoints de Flatsome — pero ROI bajo. La continuidad visual no requiere mismos breakpoints, solo mismo look en cada device.

### 11. Sin PWA / manifest

- `manifest.json`: NO
- Service Worker: NO
- `meta[name="theme-color"]`: NO
- Apple touch icon: SÍ (1 archivo)

→ El store NO es PWA. Si el blog quiere PWA, será diferenciador propio (no copiar gap del store).

### 12. Heading hierarchy mezclada

Detectado: H3 antes de H1 en la home (Medios de pago → H3, Tienda especializada → H2). Gap SEO del store, NO replicar.

### 13. SVGs sin a11y

26 SVGs inline en la home, **0 con `<title>`, 0 con `aria-label`, 0 con `role`**. Gap a11y del store, NO replicar.

### 14. Skip link presente

```html
<a class="skip-link screen-reader-text" href="#main">Saltar al contenido</a>
```

✓ Buena práctica, el blog también debería tenerla (no la tiene).

### 15. Performance metrics

- TTFB: 45ms (excelente, WP Rocket bien configurado)
- DOMContentLoaded: 270ms
- Load: 328ms
- DOM nodes: 3624 (alto pero normal para WooCommerce home con muchos productos)
- Stylesheets: 60 (alto, oportunidad de combinar)
- Inline scripts: 132 (muy alto — GA + GTM + Klaviyo + WC + ASP + Flatsome)

## TODO post-skill-update

Aplicar al blog basándome en esto:
1. **Skip link** en `<BlogHeader>` (gap a11y que el store SÍ tiene)
2. **SVGs con title/aria-label** (mejorar a11y vs store)
3. **JSON-LD Store/Organization con GeoCoordinates** (Curicó) en blog home
4. **Twitter `label1/data1` "Escrito por"** en tutoriales
5. **Imágenes con loading="lazy"** (gap performance que store tiene)
