# Blog Content Quality Swarm + Pendientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. La Fase 1 ES un enjambre de subagentes Opus en tandas paralelas. Steps usan checkbox `- [ ]`.

**Goal:** Revisar y corregir UNA POR UNA las 39 entradas publicadas del blog para que hero, titulo, lista de materiales, descripcion e interlinking a la tienda sean coherentes entre si (todos con todos), cada entrada tenga UN hero coherente y VARIAS fotos relevantes en el cuerpo, y se elimine el interlinking forzado. Luego cerrar pendientes minimos: Giscus, Week 6, pulido header.

**Architecture:** El contenido vive en la DB Turso (no en git), generado por la Routine C remota. Por eso las correcciones son mutaciones DB + R2, NO commits. Un subagente Opus 4.8 por tutorial: carga el registro, fetchea el source original, MIRA (vision) el hero y las extra_images, audita la matriz de coherencia, corrige directo en DB + rehostea imagenes a R2, y hace una SEGUNDA pasada de verificacion dentro de la misma entrada. Se corre en tandas paralelas de 4 a 5 subagentes.

**Tech Stack:** Turso (libsql), Cloudflare R2 (scripts/r2_uploader.py), Next.js 16 ISR, Agent tool (model opus), vision via Read sobre imagenes descargadas a /tmp.

**Modelo:** TODOS los subagentes de contenido corren con model "opus".

---

## Realidad medida (grounding 30-may-2026)

- 39 publicados. Distribucion de imagenes en el cuerpo: `{0:22, 1:7, 2:3, 3:1, 4:1, 6:1, 7:1, 8:2, 15:1}`. **29/39 tienen <=1 foto en el cuerpo.**
- TODOS tienen `extra_images_json` con 16 a 20 imagenes scrapeadas del source SIN usar. Las fotos existen, nunca se insertaron.
- `linked_products_json` poblado en 39/39. Hay padding: materiales marcados "opcional, para extensiones" (LED, resistencias, protoboard) que el tutorial real no usa, cada uno linkeado a la tienda. Eso es el interlinking forzado.
- Algunas pocas fotos del cuerpo que SI existen son externas (ej. `i0.wp.com/randomnerdtutorials`) y pueden hotlink-romperse.
- Generacion de contenido = Routine C remota (texto). NO hay rewrite local. Las correcciones las hace el subagente editando DB directo.

## Mecanismos disponibles (para los subagentes)

- DB: `node --env-file=.env.local` con `@libsql/client` (lectura y UPDATE). Patron Python: `scripts/db.py`.
- Rehost imagen a R2: `scripts/r2_uploader.py` → `rehost_hero_strict(source_url, tutorial_id)` devuelve URL `https://images.mechatronicstore.cl/articles/blog/<id>/<sha>.webp`. Manda UA navegador + Referer del origen (vence hotlink).
- Vision: descargar imagen a `/tmp/<id>-N.<ext>` con curl (UA navegador + Referer del host origen) y leerla con Read.
- Estandar editorial: `docs/routines/blog-translation-prompt.md` (leerlo antes de reescribir).
- Hero picker heuristico: `scripts/hero_picker.py::select_best_hero`.
- Source original: columna `source_url`.

## Reglas duras (TODOS los subagentes las cumplen)

1. JAMAS un guion/raya en copy de marca (titulo, subtitulo, materiales, copy). "WiFi" no "Wi-Fi", "2 en 1" no "2-en-1". (regla CLAUDE.md).
2. Sin emoji en el contenido salvo que ya existiera intencional.
3. Mantener atribucion al autor/source original (lo exige blog-translation-prompt.md). No plagiar: reescribir, no copiar parrafos del source.
4. NO cambiar `slug` ni `published_at` (SEO). status sigue 'published'.
5. TODA imagen que entre al cuerpo o al hero debe quedar en R2 (`images.mechatronicstore.cl`), nunca un host externo.
6. Hero = exactamente UNA foto principal coherente con el titulo.
7. Cuerpo = VARIAS fotos relevantes (idealmente 3+), cada una colocada junto al texto que ilustra. Nada de fotos de relleno sin relacion.
8. Interlinking: solo productos REALMENTE usados en el tutorial, en stock, relevantes. Quitar el padding "opcional para extensiones". Preservar `wc_id`, `product_url` con utm, `image_url` de los que se quedan.
9. NO git commit de contenido (vive en DB). Solo se commitean cambios de CODIGO (helpers, snapshot script).

---

## FASE 0 — Backup + harness + piloto (1 tutorial) antes del enjambre

**Files:**
- Create: `scripts/snapshot_tutorials.py`
- Create: `scripts/content_swarm_lib.py` (helpers compartidos: load record, persist, rehost+insert image)

- [ ] **Step 0.1: Snapshot reversible de TODO el contenido publicado**

Crear `scripts/snapshot_tutorials.py` que vuelque por cada published: id, slug, title_es, subtitle_es, body_es, materials_list_json, linked_products_json, hero_image_url, extra_images_json, tags_json → `data/content-snapshots/2026-05-30-pre-swarm.json`. Esto permite revertir cualquier entrada.

Run: `python3 scripts/snapshot_tutorials.py` → confirmar 39 entradas en el JSON.
Commit del snapshot + script: `git add scripts/snapshot_tutorials.py data/content-snapshots/2026-05-30-pre-swarm.json && git commit`.

- [ ] **Step 0.2: Helper de imagenes para subagentes**

`scripts/content_swarm_lib.py` con funciones CLI invocables:
- `rehost(url, tid)` → imprime la URL R2 (wrapper de rehost_hero_strict).
- `getrec(tid)` → imprime JSON del registro completo.
- `setfields(tid, --json '{...}')` → UPDATE de los campos provistos (whitelist: title_es, subtitle_es, body_es, materials_list_json, linked_products_json, hero_image_url) + updated_at. Reusa db.py.
Esto le da a cada subagente un mecanismo de persistencia uniforme y auditado (en vez de SQL crudo divergente).

`python -m py_compile` ambos scripts.

- [ ] **Step 0.3: PILOTO end to end en 1 tutorial**

Elegir 1 tutorial con 0 fotos de cuerpo y con padding de productos (ej. `5ac98e994275` esp32-datalogger-bme280, o `97265dc38684` pico-w que tiene relleno LED/resistencias). Dispatch UN subagente Opus con el brief completo de Fase 1. Revisar a mano el resultado: hero coherente, 3+ fotos R2 en el cuerpo, materiales sin padding, productos relevantes, titulo coherente, segunda pasada hecha. Iterar el brief hasta que quede impecable. ESTE piloto valida el brief antes de gastar en 39.

- [ ] **Step 0.4: Checkpoint con Pablo**

Mostrar el antes/despues del piloto (idealmente screenshot del tutorial en vivo tras purgar CF) y confirmar que el nivel de calidad es el esperado antes de soltar el enjambre completo.

---

## FASE 1 — Enjambre de contenido (39 tutoriales, tandas paralelas)

**Mecanica:** 8 tandas de 4 a 5 subagentes Opus en paralelo (un Agent tool call con multiples bloques). Despues de cada tanda: spot check de 1 a 2 entradas + correr `scripts/audit_markdown_bugs.py` para detectar markdown roto. Al final: snapshot post + purga CF + verificacion visual.

### Brief de cada subagente (uno por tutorial)

```
Sos un editor tecnico senior de MechatronicStore (tienda chilena de electronica).
Trabajas SOLO el tutorial <ID> en el repo /Users/pablosilvabravo/Projects/mechatronicstore-blog.
Tu trabajo: dejar esa entrada IMPECABLE y 100% coherente. Dos pasadas.

CONTEXTO Y REGLAS: leer docs/routines/blog-translation-prompt.md (estandar editorial) y
respetar las "Reglas duras" (sin guion en copy, atribucion, no cambiar slug/published_at,
toda imagen a R2, etc.) que te paso abajo.

PASO 1 — CARGAR: `python3 scripts/content_swarm_lib.py getrec <ID>` para title_es, subtitle_es,
body_es, materials_list_json, linked_products_json, hero_image_url, extra_images_json, source_url, category.

PASO 2 — VER LA REALIDAD:
  a. Fetchea el source original (source_url) para saber de que va REALMENTE el tutorial,
     que componentes usa de verdad, y que imagenes tiene.
  b. Descarga el hero actual y las primeras 6 a 10 extra_images a /tmp (curl con
     UA de navegador + Referer del host de origen) y MIRALAS con Read. Anota que muestra cada una.

PASO 3 — AUDITAR la matriz de coherencia (todos con todos) y anotar hallazgos:
  - hero vs titulo: la foto principal representa el tema del titulo?
  - titulo vs materiales: los materiales son los que el tutorial implica?
  - titulo vs descripcion: el cuerpo entrega lo que promete el titulo?
  - materiales vs descripcion: todos los materiales se usan de verdad en los pasos? hay padding?
  - materiales/descripcion vs imagenes: las fotos muestran esos componentes/pasos?
  - interlinking: cada producto linkeado es REALMENTE necesario para ESTE tutorial y esta en stock?
    Marca los forzados (relleno "opcional para extensiones", o sin relacion).

PASO 4 — CORREGIR (editando en DB via content_swarm_lib.py setfields, + rehosteando imagenes):
  - title_es / subtitle_es: si enganan o no calzan, reescribir para que sean fieles al contenido. Sin guion.
  - body_es: mejorar coherencia, sacar empujes a la tienda que no calzan, y SOBRE TODO insertar
    VARIAS imagenes relevantes (idealmente 3+) tomadas de extra_images, cada una junto al texto que
    ilustra, en markdown `![alt descriptivo](URL_R2)`. ANTES de insertar cada imagen, rehosteala:
    `python3 scripts/content_swarm_lib.py rehost <url_origen> <ID>` y usa la URL R2 devuelta. Nunca
    insertes una URL externa. Elegi imagenes que de verdad muestren el montaje/resultado/diagramas
    del tutorial (las viste en el paso 2b), no logos ni banners.
  - materials_list_json: sacar el padding; dejar solo lo que se usa de verdad. Mantener forma
    {name, qty, role}.
  - linked_products_json: dejar SOLO los productos relevantes + en stock; quitar los forzados.
    Preservar wc_id, product_url (con utm), price_clp, stock_available, image_url, match_score de los que quedan.
  - hero_image_url: si el hero no calza con el titulo, eligi de extra_images la mejor que SI calce,
    rehosteala a R2 y setea esa. Tiene que quedar UNA sola, coherente.
  Persistir TODO con `content_swarm_lib.py setfields <ID> --json '{...campos cambiados...}'`.

PASO 5 — SEGUNDA PASADA (misma entrada): volve a hacer getrec, descarga y MIRA el NUEVO hero +
  las NUEVAS imagenes del cuerpo, y reverifica la matriz completa. Corrige residuos. No termines
  hasta confirmar: 1 hero coherente en R2, 3+ fotos relevantes en R2 en el cuerpo, materiales sin
  padding, productos todos relevantes, titulo fiel. Corre `python3 scripts/audit_markdown_bugs.py`
  acotado a este id si se puede, o al menos valida que tu body_es no tenga markdown roto.

NO HACER: git commit/push (el contenido vive en DB), cambiar slug/published_at, dejar imagenes externas,
usar guion en copy, inventar specs que el source no respalda.

REPORTE (conciso): por cada dimension de la matriz, que estaba mal y que corregiste; lista de imagenes
insertadas (R2) con su alt; productos quitados vs conservados; hero antes/despues; veredicto final.
```

- [ ] **Step 1.1: Tanda 1 (5 tutoriales)** — dispatch 5 subagentes Opus en paralelo. Revisar reportes + spot check 1.
- [ ] **Step 1.2: Tanda 2 (5)** — idem.
- [ ] **Step 1.3: Tanda 3 (5)** — idem.
- [ ] **Step 1.4: Tanda 4 (5)** — idem.
- [ ] **Step 1.5: Tanda 5 (5)** — idem.
- [ ] **Step 1.6: Tanda 6 (5)** — idem.
- [ ] **Step 1.7: Tanda 7 (5)** — idem.
- [ ] **Step 1.8: Tanda 8 (4)** — ultimas 4.
- [ ] **Step 1.9: Cierre** — snapshot post (`data/content-snapshots/2026-05-30-post-swarm.json`), re-medir distribucion de imagenes (meta: 0 tutoriales con <=1 foto de cuerpo, 0 imagenes externas en body), correr `audit_markdown_bugs.py` sobre todo el corpus, purgar CF, y verificacion visual (Playwright/Chrome) de 4 a 5 entradas. Reporte final a Pablo.

**Orden de tandas:** priorizar primero los 22 con 0 fotos de cuerpo (mayor impacto visible), luego el resto.

---

## FASE 2 — Giscus comentarios (pendiente #41)

El componente `src/app/blog/components/Comments.tsx` ya existe con `GISCUS_ENABLED=false` y placeholder (ver week5 plan Task 9). Para activarlo se necesita accion de Pablo en GitHub.

- [ ] **Step 2.1:** Pablo habilita Discussions en `github.com/PabloSilvaBravo/mechatronicstore-blog/settings` (Features → Discussions) y corre el setup en https://giscus.app/ para obtener `repo_id` y `category_id`. (BLOQUEANTE — accion manual de Pablo; yo lo guio paso a paso.)
- [ ] **Step 2.2:** Con esos IDs, setear `GISCUS_ENABLED=true` + pegar repoId/categoryId/category en Comments.tsx. Typecheck. Commit + push + purga CF.
- [ ] **Step 2.3:** Verificar en vivo que la seccion de comentarios carga en un `/blog/[slug]`.

---

## FASE 3 — Week 6: Tracking conversion + Email digest

Ya existe plan detallado: `/Users/pablosilvabravo/Projects/newsletter/docs/superpowers/plans/2026-05-17-blog-week6-tracking-digest.md` y la pagina `/admin/blog/conversion` esta scaffolded. Ejecutar ese plan con subagent-driven-development, verificando primero que partes ya estan hechas (la conversion page existe) para no duplicar.

- [ ] **Step 3.1:** Leer el plan week6 + auditar que ya existe vs falta (conversion tracking, eventos, digest semanal).
- [ ] **Step 3.2:** Ejecutar las tareas faltantes tarea por tarea (TDD donde aplique). Commit por tarea.
- [ ] **Step 3.3:** Build + push + verify.

---

## FASE 4 — Pulido header parity (pendientes #80-83)

Del plan `2026-05-23-header-paridad-blog-store.md`, Tasks 13 a 16 quedaron pendientes.

- [ ] **Step 4.1: Task 13** — Sticky behavior match (comparar con store, ajustar).
- [ ] **Step 4.2: Task 14** — SearchBar focus state.
- [ ] **Step 4.3: Task 15** — Cleanup imports + dead code.
- [ ] **Step 4.4: Task 16** — Verificacion visual final (Playwright store vs blog) + commit + push + purga CF.

---

## FASE 5 (follow up) — Endurecer el pipeline para que NO regrese

El enjambre arregla las 39 existentes, pero la Routine C seguira generando nuevas. Para que las nuevas ya salgan bien:

- [ ] **Step 5.1:** Actualizar `docs/routines/blog-translation-prompt.md` para exigir: insertar 3+ imagenes inline de extra_images, BOM sin padding, interlinking solo de productos usados. Sincronizar el trigger CCR via RemoteTrigger.
- [ ] **Step 5.2:** Verificar que `persist_blog_translation.py` rehostea TODAS las imagenes inline (no solo hero) — ya parchado hoy para hero; confirmar inline.
- [ ] **Step 5.3:** Healthcheck opcional: alertar si un published sale con <=1 foto de cuerpo o con producto sin relacion (heuristica match_score < umbral).

---

## Riesgos

| Riesgo | Mitigacion |
|--------|-----------|
| Mutar 39 articulos en vivo y degradar alguno | Snapshot pre-swarm reversible (Fase 0.1). Piloto + checkpoint antes del enjambre. Segunda pasada por entrada. |
| Subagente inventa specs no respaldadas por el source | Brief exige fetchear source + atribucion; no inventar. Spot check por tanda. |
| Imagenes insertadas hotlink-rotas | Regla 5: toda imagen a R2 via rehost_hero_strict antes de insertar. |
| Costo Opus alto (39 x 2 pasadas) | Pablo autorizo "todos los tokens que hagan falta". Tandas para controlar contexto. |
| Markdown roto tras reescritura | audit_markdown_bugs.py por tanda + en cierre. |
| Giscus bloqueado en accion de Pablo | Fase 2 marcada bloqueante; el resto avanza sin depender de ella. |

## Definition of Done

1. 0 tutoriales con <=1 foto en el cuerpo (meta 3+ c/u), 0 imagenes externas en body, todas en R2.
2. Cada entrada: hero unico coherente, materiales sin padding, productos solo relevantes, titulo fiel.
3. Segunda pasada hecha y reporte por entrada.
4. Snapshot pre y post guardados (reversible).
5. Giscus activo (tras accion de Pablo) o documentado como bloqueado en su paso.
6. Week 6 ejecutado. Header Tasks 13-16 cerrados. Pipeline endurecido (Fase 5).
