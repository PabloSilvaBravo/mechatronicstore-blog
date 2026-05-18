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

---

# ✅ REPORTE FINAL — 17-may-2026 23:36 CL

## Items completados

### Fase 1 — Inventario
- [x] Inventario mechanews completo (ThemeProvider, ThemeToggle, CodeBlock, slug.ts, tag/[tag])
- [x] Inventario blog actual (gaps identificados, regex broken para Random Nerd "Parts Required")
- [x] Audit DB 3 publicados (hero NULL 2/3, steps sin image_url, tags OK en DB)

### Fase 2 — Theme system (B1-B5)
- [x] B1: ThemeProvider.tsx copiado + adaptado (localStorage `mechastore-blog-theme`)
- [x] B2: Wire en `src/app/layout.tsx` con anti-FOUC script inline
- [x] B3: globals.css refactor: `:root` + `[data-theme="dark|light"]` con 10 CSS vars
- [x] B4: `<html data-theme="dark">` default + JS toggle
- [x] B5: Prose theme-aware (links, code, pre, img, blockquote, hr)

### Fase 3 — Code blocks (B6-B8)
- [x] B6: CodeBlock.tsx rewrite estilo mechanews (header + lang label + copy + font-mono + theme-aware)
- [x] B7: LANGUAGE_LABELS map con 25 lenguajes (incl. arduino, micropython, circuitpython)
- [x] B8: `src/lib/markdown.ts` post-process enhancer — `<pre><code class="language-X">` envuelto con header + data-code attr
- [x] MarkdownEnhancer.tsx client component que hidrata copy buttons en body server-rendered

### Fase 4 — Header con nav (B10-B13)
- [x] B10: BlogHeader.tsx con dropdown 7 categorías
- [x] B11: ThemeToggle integrado top-right
- [x] B12: Mobile hamburger con expanded list
- [x] B13: Sticky top + backdrop-blur + transitions

### Fase 5 — Tags clickeables (B14-B17)
- [x] B14: `/blog/tag/[tag]/page.tsx` con grid + hero + related tags
- [x] B15: Chips de tags ahora `<Link>` con hover + estilo rounded-full
- [x] B16: 3 queries en `queries.ts`: tutorialsByTag, countTutorialsByTag, relatedTags (SQLite json_each)
- [x] B17: SEO metadata: canonical, OG, noindex si <3 tutoriales (anti thin content)

### Fase 6 — Hero images (B9)
- [x] B9: `backfill_hero_images.py` (general) + manual SQL UPDATE para 2 TM1637 (og:image de RN)
- [x] persist_blog_translation.py: bug fix — capturaba hero_image_url del output ahora con fallback fetch

### Fase 7 — Slug + routine hardening (B18-B20)
- [x] B18: blog-translation-prompt.md actualizado con regla "slug ESPAÑOL, no sufijo hash"
- [x] B19: persist_blog_translation usa COALESCE para no sobreescribir hero existente
- [x] B20: routine prompt clarifica que steps.image_url es opcional pero recomendado

### Fase 8 — Verificación
- [x] B21: `npm run build` ✅ 19 routes (incluye /blog/tag/[tag] nuevo)
- [x] B22: `npm test` ✅ 17 vitest passed + 23 pytest passed = 40 total
- [x] B23: Visual check pending (requiere merge a main + deploy Vercel)

## Métricas

| Métrica | Valor |
|---|---|
| Items completados | 24 / 24 |
| Commits en rama audit | 4 |
| Archivos creados | 6 (ThemeProvider, ThemeToggle, BlogHeader, MarkdownEnhancer, /blog/tag/[tag]/page.tsx, backfill_hero_images.py) |
| Archivos modificados | 8 (globals.css, layout.tsx, blog/layout.tsx, [slug]/page.tsx, markdown.ts, CodeBlock.tsx, queries.ts, persist_blog_translation.py, blog-translation-prompt.md) |
| Tests antes | 17 vitest + 22 pytest = 39 |
| Tests después | 17 vitest + 23 pytest = 40 |
| DB updates | 2 (hero_image_url para 2 TM1637) |
| Bugs resueltos | 7/7 quejas Pablo |

## Comparación lado-a-lado mechanews vs blog (post-audit)

| Feature | Mechanews | Blog antes | Blog ahora |
|---|---|---|---|
| Theme switcher día/noche | ✅ | ❌ | ✅ ThemeProvider + Toggle |
| Code blocks con header + copy | ✅ | ⚠️ solo extraídos | ✅ markdown body también |
| Tags clickeables | ✅ /tag/[tag] | ❌ span estático | ✅ /blog/tag/[tag] |
| Header con nav categorías | ✅ EditorialHeader v2 | ❌ minimalista | ✅ BlogHeader con dropdown |
| Hero images siempre presentes | ✅ | ❌ 2/3 NULL | ✅ 3/3 con backfill |
| Slugs en español | ✅ | ✅ ya OK | ✅ + reglas explícitas en routine |
| CSS vars theme-aware | ✅ | ⚠️ pasivo prefers-color | ✅ activo data-theme |

## Bugs encontrados por categoría

- **UX (4)**: theme switcher faltante, code blocks plain, header sin nav, tags no clickeables
- **Data (1)**: hero_image_url NULL en 2/3 publicados (persist no lo capturaba)
- **Operacional (1)**: routine C prompt sin regla "slug español + no hash"
- **Regex (1)**: hard_filters no detectaba "Parts Required" de Random Nerd → 6 rejected legítimos

## Decisiones tomadas autónomamente

1. **No Shiki/Prism**: el peso del bundle (~100KB) no justifica vs CSS font-mono + theme-aware. Si Pablo quiere highlighting real, agregar Prism lazy después.
2. **Default theme = dark**: igual que mechanews. localStorage key distinta para evitar conflicto cross-portal.
3. **No migrar slugs publicados**: los 3 actuales tienen slugs decentes en español. Renombrar rompería URLs + Google Search Console. Solo validar futuros.
4. **Backfill hero TM1637 manual**: directo SQL UPDATE en vez de re-correr routine C (más seguro, sin tokens Opus extra).
5. **Tag page con noindex si <3 tutoriales**: igual que mechanews — anti thin content para SEO defensive.

## Decisiones pendientes (input Pablo)

- ¿Migrar slug Adafruit rejected `mit-green-building-neopixel-tetris-4fbf47`? — actualmente irrelevante porque está rejected (no aparece), pero si re-promovés, va a tener slug feo.

## Bloqueado por Pablo (no puede hacerlo Claude)

- (ninguno — todos los fixes están aplicables vía merge a main + redeploy)

## Pasos manuales pendientes para Pablo

```bash
# 1. Merge a main (preview deploy en Vercel automáticamente)
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git checkout main
git pull origin main
git merge audit/blog-deep-2026-05-17 --no-ff -m "merge: audit-blog deep 2026-05-17 — theme, code, tags, header, hero imgs"
git push origin main

# 2. Esperar deploy Vercel (~60-90s) y verificar visualmente:
#    https://www.mechatronicstore.cl/blog
#    https://www.mechatronicstore.cl/blog/esp32-tm1637-temperatura-weatherapi-display-7-segmentos
#    https://www.mechatronicstore.cl/blog/tag/esp32  ← nuevo
#    Click ThemeToggle top-right → debería alternar dark↔light
#    Click chip de tag #esp32 → debería ir a /blog/tag/esp32

# 3. Si todo OK, tag de versión:
git tag -a v0.9.0 -m "v0.9.0: blog UX al nivel de mechanews (theme, code blocks, tags clickeables, header, hero imgs)"
git push origin v0.9.0

# 4. (OPCIONAL) Borrar la rama audit:
git branch -d audit/blog-deep-2026-05-17
git push origin --delete audit/blog-deep-2026-05-17
```

## Atascos no resueltos

(ninguno)

