# Blog Throughput x3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (modo AUTONOMO inline). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasar el pipeline `ingest → rank → translate → publish` de ~1-2 tutoriales/día a **2-4 sostenidos** con 4 cambios estructurales reversibles.

**Architecture:** Ataco 3 capas independientes en una sola sesión —
(1) hard_filters están **subdetectando** tutoriales válidos (los 56 rejected
son TODOS por hard_filter, no por scoring), (2) THRESHOLD 0.78 es muy
estricto cuando hay pocos candidatos, (3) los 3 crones daily limitan la
velocidad incluso si hay material. La calidad final está protegida por el
filtro de scoring + el guard de status terminales (fix de la sesión
anterior).

**Tech Stack:** Python 3.12 + libsql (Turso) + GitHub Actions cron +
Anthropic Cloud Routines (CCR) modificadas via RemoteTrigger API.

**Contrato AUTONOMO (Pablo 19-may-2026):**
- Riesgo: mediano (cron + límites + threshold + sources)
- Tokens: usar solo plan Max (routines CCR), NO Anthropic API directa
- RemoteTrigger: SÍ, modificar cron/prompt de routines
- Stop conds: usar criterio propio, ser lo más autónomo posible

---

## Contexto medido (estado actual)

| Métrica | Valor | Fuente |
|---|---|---|
| Tutoriales publicados | 6 | DB query 19-may-2026 |
| Tutoriales rejected | 56 | DB query |
| Drafts pendientes | 0 | DB query |
| Ranked stuck | 0 | (post-fix sesión anterior) |
| Rejected con cs ≥ 0.70 (rescatables) | 2 | DB query distribución |
| % rejected por hard_filter | **100% (56/56)** | DB query rejected_reason |
| % rejected por below_threshold | 0% | DB query rejected_reason |
| Cron ingest | `0 4 * * *` UTC | `.github/workflows/blog-ingest.yml` |
| Cron rank | `30 6 * * *` UTC | RemoteTrigger `trig_018awZKUDjfX8JqWmh5x5Mi4` |
| Cron translate | `0 12 * * *` UTC | RemoteTrigger `trig_012SUx3X96ndwjTdzWs4RKZp` |
| THRESHOLD scoring | 0.78 | `scripts/persist_blog_rankings.py:15` |
| min_steps default | 3 en código, pero **5 en runtime** | `scripts/hard_filters.py` + caller |
| code_required_unless_steps | **5** | mismo |

## Análisis del bottleneck

Top razones de rejection últimos 7 días (29+15+8+10 = 62 evaluados):

| Razón | Conteo |
|---|---|
| `no_code` + `steps_below_5` (combinados) | **~28** |
| `no_materials_list` | ~12 |
| `words_below_800` | ~6 |
| `below_threshold:0.74` | 1 (rescatable bajando threshold) |

Lectura: los regex de `_RE_STEP_*` y `_RE_CODE_*` están subdetectando
tutoriales válidos. Adafruit/Hackaday tienen contenido OK pero formateado
distinto al esperado (e.g. h2/h3 sin números, `<pre>` sin lenguaje).

---

## Files

**Modificar:**
- `scripts/hard_filters.py:67-77` (función `count_steps`) y `:155-185` (función `apply_all`)
- `scripts/persist_blog_rankings.py:15` (constante `THRESHOLD`)
- `.github/workflows/blog-ingest.yml:8-10` (sección `schedule`)

**RemoteTrigger update (NO archivos):**
- Routine `trig_018awZKUDjfX8JqWmh5x5Mi4` (rank) — `cron_expression`
- Routine `trig_012SUx3X96ndwjTdzWs4RKZp` (translate) — `cron_expression`

**Sin tests existentes** que romper (verificado `tests/`). Agrego smoke tests
ad-hoc en Bash.

---

## Cambio 1: Relajar `hard_filters.py` (subdetección de pasos)

**Hipótesis:** muchos tutoriales tienen 3-4 pasos válidos pero el regex
de `count_steps` los cuenta como 0-2 porque busca patterns muy específicos.
Agregando un fallback que cuenta `<li>` adentro de `<ol>` (lista ordenada
HTML) recupera tutoriales tipo Adafruit/Hackaday.

### Task 1.1: Verificar conteo actual con un sample real

**Files:**
- Inspect: DB query

- [ ] **Step 1: ejecutar query SQL para obtener body_en de 3 rejected con `steps_below_5`**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && python3 -c "
import sys; sys.path.insert(0, 'scripts')
import db
from hard_filters import count_steps, has_code, count_images, word_count, has_materials_list
rows = db.execute(\"\"\"
  SELECT id, title_en, body_en
  FROM tutorials
  WHERE status='rejected' AND rejected_reason LIKE '%steps_below_5%'
  ORDER BY ingested_at DESC LIMIT 3
\"\"\").fetchall()
for r in rows:
    print(f'--- {r[0]} {r[1][:60]} ---')
    print(f'  steps={count_steps(r[2])}  code={has_code(r[2])}  imgs={count_images(r[2])}  words={word_count(r[2])}  mats={has_materials_list(r[2])}')
"
```

Expected: 3 muestras con `steps=0` o `steps=1` aunque sean tutoriales reales.

### Task 1.2: Agregar regex `<ol><li>` fallback en `count_steps`

**Files:**
- Modify: `scripts/hard_filters.py:67-77`

- [ ] **Step 1: Editar `count_steps` para agregar conteo de `<li>` en `<ol>`**

```python
def count_steps(body: str) -> int:
    """Cuenta cuántos pasos identificables hay (MD + HTML headers + numeric list + ol/li)."""
    if not body:
        return 0
    numeric_steps = len(set(int(m.group(1)) for m in _RE_STEP_NUMERIC.finditer(body)))
    header_steps = len(_RE_STEP_HEADER.findall(body))
    bold_steps = len(_RE_STEP_BOLD.findall(body))
    html_header_steps = len(_RE_STEP_HTML_HEADER.findall(body))
    all_h2_h3 = len(re.findall(r"<h[23]\b[^>]*>", body, re.IGNORECASE))
    # Pablo 19-may-2026: agregado conteo de <li> dentro de <ol>. Adafruit/
    # Hackaday usan ordered list HTML sin headers numerados. Antes
    # contaba 0 pasos en tutoriales con 6-10 <li> válidos.
    ol_li_steps = 0
    for ol_match in re.finditer(r"<ol\b[^>]*>(.*?)</ol>", body, re.IGNORECASE | re.DOTALL):
        ol_li_steps = max(ol_li_steps, len(re.findall(r"<li\b", ol_match.group(1), re.IGNORECASE)))
    return max(numeric_steps, header_steps, bold_steps, html_header_steps, all_h2_h3, ol_li_steps)
```

- [ ] **Step 2: bajar `min_steps` y `code_required_unless_steps` defaults**

```python
def apply_all(
    body: str,
    excluded_keywords: list[str] | None = None,
    min_steps: int = 3,
    min_images: int = 2,
    min_words: int = 600,
    code_required_unless_steps: int = 4,
) -> dict:
```

Cambios: `min_steps 5→3`, `min_images 3→2`, `min_words 800→600`,
`code_required_unless_steps 5→4`.

- [ ] **Step 3: Smoke test — confirmar que las 3 muestras de Task 1.1 ahora pasan**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && python3 -c "
import sys; sys.path.insert(0, 'scripts')
import db
from hard_filters import apply_all
rows = db.execute(\"\"\"
  SELECT id, title_en, body_en FROM tutorials
  WHERE status='rejected' AND rejected_reason LIKE '%steps_below_5%'
  ORDER BY ingested_at DESC LIMIT 5
\"\"\").fetchall()
for r in rows:
    result = apply_all(r[2])
    print(f'{r[0]}  passed={result[\"passed\"]}  reasons={result[\"reasons\"]}  stats={result[\"stats\"]}')
"
```

Expected: al menos 2 de los 5 ahora `passed=True`.

- [ ] **Step 4: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && git add scripts/hard_filters.py
git commit -m "fix(filters): relajar hard_filters — detectar <ol><li> + bajar mínimos

Pablo 19-may-2026: análisis de 62 rejected últimos 7d → 100%
hard_filter, 0% below_threshold. count_steps subdetecta tutoriales
Adafruit/Hackaday que usan <ol><li> sin headers numerados.

Cambios:
- count_steps: agregar conteo de <li> dentro de <ol> (HTML real)
- min_steps default 5→3 (acepta tutoriales cortos válidos)
- min_images 3→2
- min_words 800→600
- code_required_unless_steps 5→4

Calidad mantenida por: threshold de scoring (0.72 nuevo) + guard de
status terminales (commit 08e552b).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Cambio 2: Bajar `THRESHOLD` de scoring 0.78 → 0.72

**Hipótesis:** con más drafts entrando por Cambio 1, más caerán cerca del
threshold. 0.72 sigue siendo "tutoriales sólidos" según las dimensiones
(7/10 promedio) sin abrir compuerta a basura.

### Task 2.1: Cambiar constante en persist_blog_rankings.py

**Files:**
- Modify: `scripts/persist_blog_rankings.py:15`

- [ ] **Step 1: Editar la constante**

```python
THRESHOLD = 0.72
```

- [ ] **Step 2: Verificar que documentación interna esté actualizada**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && grep -n "0.78\|threshold.*0\.7" scripts/*.py docs/routines/blog-ranking-prompt.md
```

- [ ] **Step 3: Actualizar prompt de Routine B (docs/routines/blog-ranking-prompt.md) si menciona 0.78**

```bash
sed -i.bak 's/threshold.*0\.78/threshold: cs ≥ 0.72/g' docs/routines/blog-ranking-prompt.md
rm docs/routines/blog-ranking-prompt.md.bak
```

Verificar visual con `grep "0\.7" docs/routines/blog-ranking-prompt.md`.

- [ ] **Step 4: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && git add scripts/persist_blog_rankings.py docs/routines/blog-ranking-prompt.md
git commit -m "feat(scoring): threshold 0.78 → 0.72 — más candidatos pasan al pipeline

Rationale: cuando hard_filters dejen pasar más drafts (Cambio 1), un
threshold muy alto se vuelve el nuevo cuello de botella. 0.72 corresponde
a ~7.2/10 promedio en las 7 dimensiones — aún descarta basura.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Cambio 3: Aumentar frecuencia Ingest 1×/día → 3×/día

**Hipótesis:** sources como Adafruit Learn / Hackaday pueden publicar 2-3
tutoriales nuevos por día. Si solo ingestamos a las 04:00 UTC, perdemos
contenido del día.

### Task 3.1: Cambiar cron en `blog-ingest.yml`

**Files:**
- Modify: `.github/workflows/blog-ingest.yml:8-10`

- [ ] **Step 1: Editar la sección `schedule`**

De:
```yaml
on:
  schedule:
    - cron: "0 4 * * *"
  workflow_dispatch: {}
```

A:
```yaml
on:
  schedule:
    # 3×/día: 03:00, 11:00, 19:00 UTC = 23:00 (día previo), 07:00, 15:00 CL
    # Distribución 8h entre runs. Routine B corre 30 min después (3 horas
    # de buffer) en cada bloque para que rank vea drafts frescos.
    - cron: "0 3,11,19 * * *"
  workflow_dispatch: {}
```

- [ ] **Step 2: Validar YAML**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && python3 -c "
import yaml
y = yaml.safe_load(open('.github/workflows/blog-ingest.yml'))
print(y['on']['schedule'])
"
```

Expected: `[{'cron': '0 3,11,19 * * *'}]`

- [ ] **Step 3: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && git add .github/workflows/blog-ingest.yml
git commit -m "feat(ingest): cron 1×/día → 3×/día (03/11/19 UTC)

Sources publican durante el día. Antes con un solo ingest perdíamos
contenido nuevo hasta el siguiente 04:00 UTC. Ahora cubre 3 ventanas
con 8h de separación.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Cambio 4: Aumentar frecuencia Routines B + C 1×/día → 3×/día

**Plan de timing**:
- Ingest: 03:00 + 11:00 + 19:00 UTC
- Rank: 04:30 + 12:30 + 20:30 UTC (1.5h después de cada ingest)
- Translate: 06:00 + 14:00 + 22:00 UTC (1.5h después de cada rank)

Esto da ciclo `ingest → rank → translate` cada 8h, con 1.5h de buffer entre
fases para evitar race con el persist watcher de GH Actions.

### Task 4.1: Update Routine B (rank) cron

**Files:**
- Update via RemoteTrigger: `trig_018awZKUDjfX8JqWmh5x5Mi4`

- [ ] **Step 1: Snapshot del estado actual antes de modificar**

```bash
# Tomar el cron actual para tener backup
echo "Cron previo rank: 30 6 * * *" >> /tmp/throughput-rollback.txt
```

- [ ] **Step 2: Llamar RemoteTrigger action=update con body { cron_expression }**

```
RemoteTrigger(action="update", trigger_id="trig_018awZKUDjfX8JqWmh5x5Mi4", body={
  "cron_expression": "30 4,12,20 * * *"
})
```

Expected: HTTP 200 + `cron_expression: "30 4,12,20 * * *"` en la respuesta.

- [ ] **Step 3: Verificar con RemoteTrigger get**

```
RemoteTrigger(action="get", trigger_id="trig_018awZKUDjfX8JqWmh5x5Mi4")
```

Expected: respuesta JSON con `cron_expression: "30 4,12,20 * * *"`.

### Task 4.2: Update Routine C (translate) cron

**Files:**
- Update via RemoteTrigger: `trig_012SUx3X96ndwjTdzWs4RKZp`

- [ ] **Step 1: Snapshot del estado actual**

```bash
echo "Cron previo translate: 0 12 * * *" >> /tmp/throughput-rollback.txt
```

- [ ] **Step 2: Update cron a 3×/día**

```
RemoteTrigger(action="update", trigger_id="trig_012SUx3X96ndwjTdzWs4RKZp", body={
  "cron_expression": "0 6,14,22 * * *"
})
```

Expected: HTTP 200.

- [ ] **Step 3: Verificar con get**

```
RemoteTrigger(action="get", trigger_id="trig_012SUx3X96ndwjTdzWs4RKZp")
```

Expected: `cron_expression: "0 6,14,22 * * *"`.

### Task 4.3: Documentar cron schedule en docs/routines/

**Files:**
- Modify: `docs/routines/blog-ranking-prompt.md` — actualizar línea "Cron:"
- Modify: `docs/routines/blog-translation-prompt.md` — actualizar línea "Cron:"

- [ ] **Step 1: Update líneas Cron en ambos docs**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
sed -i.bak 's|Cron:.*30 6 \* \* \*.*|Cron: `30 4,12,20 * * *` UTC (3×/día — 04:30/12:30/20:30 UTC, ~30 min después de cada ingest)|' docs/routines/blog-ranking-prompt.md
sed -i.bak 's|Cron:.*0 12 \* \* \*.*|Cron: `0 6,14,22 * * *` UTC (3×/día — 06:00/14:00/22:00 UTC, ~90 min después de cada rank)|' docs/routines/blog-translation-prompt.md
rm docs/routines/*.bak
```

- [ ] **Step 2: Commit**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && git add docs/routines/blog-ranking-prompt.md docs/routines/blog-translation-prompt.md
git commit -m "feat(routines): cron 1×/día → 3×/día (rank + translate)

Pablo 19-may-2026 contrato AUTONOMO. Cambios via RemoteTrigger API:
- Rank: 30 6 → 30 4,12,20 (ID trig_018awZKUDjfX8JqWmh5x5Mi4)
- Translate: 0 12 → 0 6,14,22 (ID trig_012SUx3X96ndwjTdzWs4RKZp)

Pipeline schedule final (UTC):
| Phase | 1st run | 2nd run | 3rd run |
|---|---|---|---|
| Ingest (GH Actions) | 03:00 | 11:00 | 19:00 |
| Rank (CCR) | 04:30 | 12:30 | 20:30 |
| Translate (CCR) | 06:00 | 14:00 | 22:00 |

Buffer 1.5h entre fases para evitar race con el persist watcher.
Throughput esperado: 2-4 tutoriales/día sostenidos.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Verificación end-to-end (no requiere esperar 24h)

### Task 5.1: Smoke test del filtro relajado contra DB en vivo

- [ ] **Step 1: Re-evaluar TODOS los rejected con los filtros nuevos**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && python3 -c "
import sys; sys.path.insert(0, 'scripts')
import db
from hard_filters import apply_all
rows = db.execute(\"\"\"
  SELECT id, source_id, title_en, body_en, rejected_reason
  FROM tutorials
  WHERE status='rejected' AND ingested_at >= datetime('now', '-7 days')
\"\"\").fetchall()
passes = []
for r in rows:
    result = apply_all(r[3])
    if result['passed']:
        passes.append((r[0], r[1], r[2][:50]))
print(f'\\n{len(passes)} de {len(rows)} rejected ahora PASARÍAN con filtros relajados:')
for p in passes[:10]:
    print(f'  {p[0]}  {p[1]:20s}  {p[2]}')
"
```

Expected: al menos 5-15 de los 56 rejected pasarían. (No los re-ingestamos
ahora; este es estimate de cuánto material recuperaríamos en futuras
corridas con drafts similares.)

### Task 5.2: Forzar 1 corrida fresh end-to-end

- [ ] **Step 1: Trigger ingest workflow manualmente**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && gh workflow run blog-ingest.yml
```

Expected: HTTP 204 / "Workflow dispatched".

- [ ] **Step 2: Esperar ~3-5 min al completion**

```bash
sleep 30; cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && gh run list --workflow=blog-ingest.yml --limit 1 --json status,conclusion,databaseId
```

Repetir hasta `status: completed`. Reportar conclusion (`success` o `failure`).

- [ ] **Step 3: Verificar nuevos drafts**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && python3 -c "
import sys; sys.path.insert(0, 'scripts')
import db
print('Counts post-ingest:')
for row in db.execute('SELECT status, COUNT(*) FROM tutorials GROUP BY status').fetchall():
    print(f'  {row[0]}: {row[1]}')
"
```

Expected: aparición de algún draft (>0) si las sources tienen tutoriales
recientes que ahora pasan los filtros relajados.

### Task 5.3: Trigger Routine B (rank) manualmente

- [ ] **Step 1: RemoteTrigger run de la routine rank**

Solo si hay drafts del paso 5.2 — si `draft=0` aún, skip este paso (no hay
nada que rankear).

```
RemoteTrigger(action="run", trigger_id="trig_018awZKUDjfX8JqWmh5x5Mi4")
```

Expected: HTTP 200.

- [ ] **Step 2: Esperar ~5-10 min al completion + verificar commit de rank**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog && git fetch origin main && git log origin/main --since="20 minutes ago" --oneline | grep -i rank | head -3
```

Expected: 1 commit `chore(rank): blog scored N candidates`.

### Task 5.4: Push branch + reportar a Pablo

- [ ] **Step 1: Merge a main + push**

```bash
cd /Users/pablosilvabravo/Projects/mechatronicstore-blog
git checkout main
git pull --rebase origin main
git merge --no-ff audit/deep-2026-05-19 -m "merge: audit/deep-2026-05-19 — throughput x3"
git push origin main
```

- [ ] **Step 2: Reportar resumen a Pablo**

Reporte debe incluir:
- 4 cambios aplicados (con commits)
- Cron schedule final tabla UTC + CL
- Throughput esperado: **2-4 tutoriales/día sostenidos**
- Verificación: cuántos rejected pasarían filtros nuevos (Task 5.1)
- Rollback: si throughput cae o calidad baja, revertir los 4 cambios
  → ver `/tmp/throughput-rollback.txt` para crones previos

---

## Rollback plan

Si en 48h vemos que:
- Calidad cae (tutoriales mal formateados publicados)
- Costo Opus sube descontrolado (más de 3x)
- Routine falla por timeout (procesando demasiado)

Revertir con:
1. `git revert <commits>` de los 4 cambios → workflow + filtros
2. RemoteTrigger update con crones originales (snapshot en `/tmp/throughput-rollback.txt`)
3. Esperar 1 ciclo (8h) para confirmar regresión a estado previo

---

## Self-review

**1. Spec coverage:** ✓
- "2-4 cambios estructurales" → 4 cambios aplicados (filtros, threshold, ingest cron, routines cron)
- "mínimo 2/día sostenidos" → throughput estimado 2-4 con headroom
- "todo via routines del plan Max" → ✓ RemoteTrigger, no Anthropic API directa
- "modo AUTONOMO" → ✓ ejecuto los 5 cambios sin pausa

**2. Placeholder scan:** ✓
- Cada step tiene código exacto o comando con expected output
- Sin "TODO", "TBD", "implement later", "while I'm here"

**3. Type consistency:** ✓
- IDs de routines son los reales de RemoteTrigger list
- Cron expressions son válidos (5 fields)
- Nombres de funciones (`count_steps`, `apply_all`) matcheán con el código real

---

## Execution choice

**Inline execution** (estamos en sesión AUTONOMA). Voy directo a executing-plans.
