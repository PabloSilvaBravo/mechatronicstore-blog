# AUDIT: Blog MechatronicStore — depuración profunda 2026-05-17

**Rama:** `audit/blog-deep-2026-05-17`
**Modo:** AUTONOMO
**Owner:** Pablo Silva Bravo
**Referencia:** `/Users/pablosilvabravo/Projects/newsletter` (mechanews)

## Contrato de la sesión

| Pregunta | Respuesta |
|---|---|
| Scope | TODO el blog, comparación lado-a-lado vs mechanews |
| Criterio de bug | Cualquier gap vs mechanews + bugs reproducibles + UX rota |
| Recursos externos | Turso, Vercel, CF API, GH — todos OK en rama audit |
| API pública | Sí puedo cambiar (recién lanzado, sin terceros) |
| Tests | vitest (`npm test`) |
| Fix scope | hasta 10 archivos por commit en autónomo |
| Cuándo PARAR | secretos, data prod, loops 3×, regresión cobertura, DB destructivo |

## Hallazgos de auditoría (inventario)

### Tutoriales publicados (3)

| ID | Slug | Hero img | Steps con img | Code blocks |
|---|---|---|---|---|
| e28a037d... | esp32-cyd-pantalla-touchscreen-microsd-simultaneo | ✅ | ❌ | ✅ |
| 9d2b09690521 | esp32-tm1637-temperatura-weatherapi-display-7-segmentos | ❌ NULL | ❌ | ✅ |
| 0abbbb441679 | micropython-esp32-esp8266-tm1637-display-4-digitos-7-segmentos | ❌ NULL | ❌ | ✅ |

### Gaps confirmados vs mechanews

| Feature | Mechanews | Blog | Severidad |
|---|---|---|---|
| Slugs en español | ✅ (`slugify` en `lib/slug.ts`) | ✅ ya OK | OK |
| Sufijo hash en slugs | ✅ no usa | ❌ usa cuando hay collision | media |
| Code blocks con highlighting | ⚠️ no usa (font-mono + theme) | ❌ plain pre/code | alta |
| Copy button en code blocks | ✅ todos los code | ⚠️ solo en `code_blocks_json` extraídos, no en markdown inline | media |
| Theme switcher día/noche | ✅ `ThemeProvider` + `ThemeToggle` | ❌ no existe | alta |
| Header con nav categorías | ✅ EditorialHeader v2 con categorías | ❌ solo "← Tienda" | alta |
| Tags clickeables | ✅ `/tag/[tag]` page | ❌ chips estáticos sin link | alta |
| Hero images en tutoriales | ✅ siempre presente | ⚠️ 2/3 NULL (TM1637) | media |
| Step images | N/A (es news, no tutorial) | ❌ steps_json sin image_url | media |
| CSS variables theme-aware | ✅ `--bg`, `--text`, etc en globals.css | ⚠️ tiene básicas pero no para theme switching | media |

## Fase 1 — Inventario y mapeo
- [x] Inventario mechanews (ThemeProvider, ThemeToggle, CodeBlock, slug.ts, tag/[tag])
- [x] Inventario blog actual (markdown.ts marked, CodeBlock con copy pero sin highlight)
- [x] Audit DB de tutoriales publicados (hero NULL, steps sin img, tags OK en DB)
- [x] Diff lado-a-lado funcional

## Fase 2 — Theme system (foundation)
- [ ] B1: Copiar `ThemeProvider.tsx` + `ThemeToggle.tsx` de mechanews al blog
- [ ] B2: Wire ThemeProvider en root layout (`src/app/layout.tsx`)
- [ ] B3: Definir CSS variables theme-aware en `globals.css` (--bg, --text, --bg-elevated, --border, --border-subtle, --text-muted, --text-dim, --brand)
- [ ] B4: Verificar que `<html data-theme="dark|light">` aplica las vars correctas
- [ ] B5: Test visual: toggle alterna colores

## Fase 3 — Code blocks con styling decente
- [ ] B6: Rewrite `CodeBlock.tsx` con estilo mechanews (header + lang label + copy + font-mono + bg theme-aware)
- [ ] B7: Mapping de language hints (`py→Python`, `cpp→C++`, etc)
- [ ] B8: Custom marked renderer para que `<pre><code class="language-X">` se renderee con el componente CodeBlock (vía html post-processing)
- [ ] B9: Hero image fix en DB — backfill TM1637 con og:image del source_url

## Fase 4 — Header + navegación
- [ ] B10: Header del blog con nav: Inicio · Categorías (dropdown 7 cats) · Acerca de
- [ ] B11: ThemeToggle integrado en header (top-right)
- [ ] B12: Mobile-friendly hamburger menu
- [ ] B13: Footer ya OK (Week 7)

## Fase 5 — Tags clickeables + `/blog/tag/[tag]` page
- [ ] B14: Crear `src/app/blog/tag/[tag]/page.tsx` (listing de tutoriales por tag)
- [ ] B15: Modificar chips de tags en `[slug]/page.tsx` para que sean `<Link>` a `/blog/tag/{tag}`
- [ ] B16: Query `getTutorialsByTag(tag, limit)` con SQLite `json_each`
- [ ] B17: Metadata SEO de la tag page (canonical, OG, noindex si <3 tutoriales)

## Fase 6 — Slug generation hardening
- [ ] B18: Mejorar `slugify()` en routine C prompt — NO usar sufijo hash, usar título limpio
- [ ] B19: Validation en persist_blog_translation.py que rechace slugs con hash sufijo
- [ ] B20: Si hay slug collision, agregar número en vez de hash (-2, -3)

## Fase 7 — Verificación final
- [ ] B21: `npm run build` sin errores
- [ ] B22: `npm test` — 23+ tests passing
- [ ] B23: Visual check en 3 URLs producción (después de merge a main + deploy)
- [ ] B24: Reporte final + Pasos manuales para Pablo

## Decisiones tomadas autónomamente

- **Slugs OK actuales — no migrar**: los 3 tutoriales publicados tienen slugs decentes (`esp32-tm1637-temperatura-...`). El bug del sufijo hash era de Adafruit rejected. Validar futuros pero NO renombrar publicados (rompería URLs + Google Search Console).
- **Sin Shiki (peso bundle)**: usar CSS font-mono + theme-aware como mechanews. Shiki agrega ~100KB. Si Pablo después quiere highlighting real, agregar Prism lazy bajo Suspense.
- **Theme default = "dark"**: igual que mechanews. Localstorage clave `mechastore-blog-theme` (no `mechanoticias-theme`, evitar conflicto si usuarios visitan ambos).
- **Hero img TM1637**: backfill manual con fetch del source_url + og:image. Si NO se encuentra, usar fallback estándar (logo MS o placeholder).

## Decisiones pendientes (requieren input Pablo)

- ¿Routine C debería re-correr para los 2 TM1637 y backfillear hero/step images? O ¿solo backfill manual ahora y futuros tutoriales arreglarán solos?

## Atascos
(ninguno todavía)
